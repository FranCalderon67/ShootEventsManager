const express = require('express');
const Event = require('../models/Event');
const { auth, adminOnly, adminOrOC } = require('../middleware/auth');
const User = require('../models/User');
const { sendEventRegistrationMail, sendScoreMail } = require('../services/mailer');
const { calcCategoria } = require('./users');

const router = express.Router();

// Parse date string as noon UTC (avoids timezone day-shift for UTC-3 Argentina)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.toString().slice(0, 10).split('-');
  return new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0, 0));
};

// Event is locked after end of day in Argentina (UTC-3) = 03:00 UTC next day
const isEventLocked = (event) => {
  const d = new Date(event.date);
  const endOfDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 3, 0, 0, 0);
  console.log(`[isEventLocked] event.date=${event.date} endOfDay=${new Date(endOfDay).toISOString()} now=${new Date().toISOString()} locked=${Date.now() > endOfDay}`);
  return Date.now() > endOfDay;
};

// Get all events
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('registrations.user', 'name email')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    // Normalize: ensure registrations is always populated with a count
    const normalized = events.map(ev => {
      const obj = ev.toObject();
      // Support legacy registeredUsers field for old documents
      if (!obj.registrations) obj.registrations = [];
      return obj;
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single event
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email')
      .populate('squads.members', 'name email')
      .populate('stages.scores.shooter', 'name email')
      .populate('createdBy', 'name');
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create event (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };
    if (body.date) body.date = parseLocalDate(body.date);
    if (body.registrationDeadline) body.registrationDeadline = parseLocalDate(body.registrationDeadline);
    const event = new Event(body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update event (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) {
      return res.status(403).json({ message: 'El evento está bloqueado porque ya pasó su fecha' });
    }
    const updates = { ...req.body };
    if (updates.date) updates.date = parseLocalDate(updates.date);
    if (updates.registrationDeadline) updates.registrationDeadline = parseLocalDate(updates.registrationDeadline);
    Object.assign(event, updates);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete event (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register user to event (with categoria and division)
router.post('/:id/register', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (event.status === 'finished') return res.status(400).json({ message: 'El evento ya finalizó' });

    if (event.registrationDeadline) {
      const dl = new Date(event.registrationDeadline);
      const deadlineEnd = Date.UTC(dl.getUTCFullYear(), dl.getUTCMonth(), dl.getUTCDate() + 1, 3, 0, 0, 0);
      if (Date.now() > deadlineEnd) {
        return res.status(400).json({ message: 'El plazo de inscripción ya cerró' });
      }
    }

    const userId = req.user.role === 'admin' && req.body.userId
      ? req.body.userId
      : req.user._id.toString();

    const { division } = req.body;
    if (!division) return res.status(400).json({ message: 'La división es requerida' });

    // Auto-calculate categoria based on shooter's profile and event date
    const shooterUser = await User.findById(userId);
    const categoria = calcCategoria(shooterUser?.sexo, shooterUser?.fechaNacimiento, event.date);

    const { isOC = false } = req.body;

    const alreadyRegistered = event.registrations.some(r => r.user.toString() === userId.toString());
    const isNewRegistration = !alreadyRegistered;

    if (alreadyRegistered) {
      const reg = event.registrations.find(r => r.user.toString() === userId.toString());
      reg.categoria = categoria;
      reg.division = division;
      reg.isOC = isOC;
    } else {
      event.registrations.push({ user: userId, categoria, division, isOC });
    }
    await event.save();
    const populated = await Event.findById(req.params.id).populate('registrations.user', 'name email').populate('squads.members', 'name email').populate('stages.scores.shooter', 'name email').populate('createdBy', 'name');

    // Send confirmation email only on new registration (non-blocking)
    if (isNewRegistration) {
      try {
        const registeredUser = await User.findById(userId);
        if (registeredUser) {
          sendEventRegistrationMail({
            name: registeredUser.name,
            email: registeredUser.email,
            event: populated,
            registration: { categoria, division, isOC }
          });
        }
      } catch (mailErr) {
        console.error('Mail error:', mailErr.message);
      }
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin override: update categoria/division for a registration (bypasses deadline)
router.put('/:id/registrations/:userId/categoria', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    const reg = event.registrations.find(r => r.user.toString() === req.params.userId);
    if (!reg) return res.status(404).json({ message: 'Tirador no inscripto en este evento' });

    if (req.body.categoria) reg.categoria = req.body.categoria;
    if (req.body.division) reg.division = req.body.division;
    await event.save();

    const populated = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email')
      .populate('squads.members', 'name email')
      .populate('stages.scores.shooter', 'name email')
      .populate('createdBy', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unregister user from event
router.delete('/:id/register/:userId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    if (req.user.role !== 'admin' && req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No podés cancelar la inscripción de otro usuario' });
    }

    event.registrations = event.registrations.filter(r => r.user.toString() !== req.params.userId);
    await event.save();
    const populated = await Event.findById(req.params.id).populate('registrations.user', 'name email').populate('squads.members', 'name email').populate('stages.scores.shooter', 'name email').populate('createdBy', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- SQUADS ----

// Helper: get all member IDs already assigned to any squad (optionally excluding one squad)
const getAssignedMemberIds = (event, excludeSquadId = null) => {
  const ids = new Set();
  event.squads.forEach(s => {
    if (excludeSquadId && s._id.toString() === excludeSquadId) return;
    s.members.forEach(m => ids.add(m.toString()));
  });
  return ids;
};

// Add squad
router.post('/:id/squads', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const newMembers = req.body.members || [];
    const assigned = getAssignedMemberIds(event);
    const conflict = newMembers.find(m => assigned.has(m.toString()));
    if (conflict) {
      return res.status(400).json({ message: 'Uno o más tiradores ya están asignados a otra escuadra en este evento' });
    }

    event.squads.push(req.body);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update squad
router.put('/:id/squads/:squadId', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const squad = event.squads.id(req.params.squadId);
    if (!squad) return res.status(404).json({ message: 'Escuadra no encontrada' });

    // Validate no new member is already in another squad
    const newMembers = req.body.members || [];
    const assigned = getAssignedMemberIds(event, req.params.squadId);
    const conflict = newMembers.find(m => assigned.has(m.toString()));
    if (conflict) {
      return res.status(400).json({ message: 'Uno o más tiradores ya están asignados a otra escuadra en este evento' });
    }

    Object.assign(squad, req.body);
    await event.save();
    const populated = await Event.findById(req.params.id).populate('squads.members', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete squad
router.delete('/:id/squads/:squadId', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    event.squads = event.squads.filter(s => s._id.toString() !== req.params.squadId);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- STAGES ----

// Add stage
router.post('/:id/stages', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const order = event.stages.length + 1;
    event.stages.push({ ...req.body, order });
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete stage
router.delete('/:id/stages/:stageId', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    event.stages = event.stages.filter(s => s._id.toString() !== req.params.stageId);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- SCORES ----

// Save score for a shooter in a stage (admin or OC - Oficial de Campo)
router.post('/:id/stages/:stageId/scores', auth, adminOrOC, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const stage = event.stages.id(req.params.stageId);
    if (!stage) return res.status(404).json({ message: 'Etapa no encontrada' });

    const { shooter, a, b, c, noShoot = 0, miss = 0, procedural = 0, warnings = 0, dq = false, time } = req.body;
    const penalties = (noShoot + miss + procedural) * 5;
    const total = time + (b * 1) + (c * 3) + penalties;

    const existingScore = stage.scores.find(s => s.shooter.toString() === shooter);
    if (existingScore) {
      existingScore.a = a;
      existingScore.b = b;
      existingScore.c = c;
      existingScore.noShoot = noShoot;
      existingScore.miss = miss;
      existingScore.procedural = procedural;
      existingScore.warnings = warnings;
      existingScore.dq = dq;
      existingScore.time = time;
      existingScore.total = total;
      existingScore.saved = true;
    } else {
      stage.scores.push({ shooter, a, b, c, noShoot, miss, procedural, warnings, dq, time, total, saved: true });
    }

    await event.save();
    const populated = await Event.findById(req.params.id)
      .populate('stages.scores.shooter', 'name email');

    // Send score summary email to the shooter (non-blocking)
    try {
      const shooterUser = await User.findById(shooter);
      if (shooterUser) {
        sendScoreMail({
          name: shooterUser.name,
          email: shooterUser.email,
          eventName: event.name,
          stageName: stage.name,
          score: { a, b, c, miss, noShoot, procedural, time, total, dq, warnings }
        });
      }
    } catch (mailErr) {
      console.error('Score mail error:', mailErr.message);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle OC (Oficial de Campo) status for a registration (admin only)
router.put('/:id/registrations/:userId/oc', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    const reg = event.registrations.find(r => r.user.toString() === req.params.userId);
    if (!reg) return res.status(404).json({ message: 'Tirador no inscripto en este evento' });

    reg.isOC = req.body.isOC !== undefined ? req.body.isOC : !reg.isOC;
    await event.save();

    const populated = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email')
      .populate('squads.members', 'name email')
      .populate('stages.scores.shooter', 'name email')
      .populate('createdBy', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual DQ - mark/unmark a competitor as disqualified (admin or OC)
router.put('/:id/registrations/:userId/dq', auth, adminOrOC, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const reg = event.registrations.find(r => r.user.toString() === req.params.userId);
    if (!reg) return res.status(404).json({ message: 'Tirador no inscripto en este evento' });

    reg.dq = req.body.dq !== undefined ? req.body.dq : true;
    if (req.body.dqReason !== undefined) reg.dqReason = req.body.dqReason;
    if (!reg.dq) reg.dqReason = '';
    await event.save();

    const populated = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email')
      .populate('squads.members', 'name email')
      .populate('stages.scores.shooter', 'name email')
      .populate('createdBy', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get rankings for event
router.get('/:id/rankings', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email')
      .populate('stages.scores.shooter', 'name email');
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    const stageCount = event.stages.length;
    const registrations = event.registrations || [];
    if (stageCount === 0) return res.json([]);

    // Build map of manually DQ'd shooters from registrations
    const manualDqIds = new Set(
      event.registrations
        .filter(r => r.dq && r.user)
        .map(r => r.user._id?.toString() || r.user.toString())
    );

    const shooterMap = {};

    // Add all registered shooters to map first (so DQ ones appear even with no scores)
    event.registrations.forEach(reg => {
      if (!reg.user) return;
      const id = reg.user._id?.toString() || reg.user.toString();
      if (!id) return;
      if (!shooterMap[id]) {
        shooterMap[id] = {
          shooter: reg.user,
          stageScores: {},
          totalSum: 0,
          stagesCompleted: 0,
          dq: reg.dq || false
        };
      }
    });

    event.stages.forEach(stage => {
      stage.scores.filter(s => s.saved && s.shooter).forEach(score => {
        const id = score.shooter._id?.toString() || score.shooter.toString();
        if (!id) return;
        if (!shooterMap[id]) {
          shooterMap[id] = {
            shooter: score.shooter,
            stageScores: {},
            totalSum: 0,
            stagesCompleted: 0,
            dq: manualDqIds.has(id)
          };
        }
        // Mark stage score as DQ if score.dq (warnings) OR manual DQ
        const stageDq = score.dq || manualDqIds.has(id);
        shooterMap[id].stageScores[stage._id.toString()] = stageDq ? 'DQ' : score.total;
        if (!stageDq) {
          shooterMap[id].totalSum += score.total;
          shooterMap[id].stagesCompleted += 1;
        }
        if (score.dq) shooterMap[id].dq = true; // warnings DQ also marks overall
      });
    });

    const rankings = Object.values(shooterMap).map(entry => ({
      shooter: entry.shooter,
      stageScores: entry.stageScores,
      stagesCompleted: entry.stagesCompleted,
      dq: entry.dq,
      average: entry.dq ? null : (entry.stagesCompleted > 0 ? entry.totalSum / stageCount : null),
      totalSum: entry.totalSum
    }));

    // Non-DQ sorted by average, DQ at the end
    rankings.sort((a, b) => {
      if (a.dq && b.dq) return 0;
      if (a.dq) return 1;
      if (b.dq) return -1;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return a.average - b.average;
    });

    res.json(rankings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
