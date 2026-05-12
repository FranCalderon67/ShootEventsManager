const express = require('express');
const Event = require('../models/Event');
const { auth, adminOnly, adminOrOC } = require('../middleware/auth');
const User = require('../models/User');
const { sendEventRegistrationMail, sendScoreMail } = require('../services/mailer');
const { uploadPdf, deleteFile } = require('../services/cloudinary');
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

    // Filter private events for non-admins
    const userId = req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    const filtered = events.filter(ev => {
      if (!ev.isPrivate) return true;
      if (isAdmin) return true;
      // Private: only visible if user is registered
      return ev.registrations.some(r => {
        const regUserId = r.user?._id?.toString() || r.user?.toString();
        return regUserId === userId;
      });
    });

    const normalized = filtered.map(ev => {
      const obj = ev.toObject();
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

    // Block access to private events for non-registered non-admins
    if (event.isPrivate && req.user.role !== 'admin') {
      const userId = req.user._id.toString();
      const isRegistered = event.registrations.some(r => {
        const regUserId = r.user?._id?.toString() || r.user?.toString();
        return regUserId === userId;
      });
      if (!isRegistered) return res.status(403).json({ message: 'Este evento es privado' });
    }

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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });
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
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede eliminarse' });
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

    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

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

    const { division, divisionAlternativa } = req.body;
    if (!division) return res.status(400).json({ message: 'La división es requerida' });

    // Auto-calculate categoria based on shooter's profile and event date
    const shooterUser = await User.findById(userId);
    const categoria = calcCategoria(shooterUser?.genero, shooterUser?.fechaNacimiento, event.date);

    const { isOC = false } = req.body;

    const alreadyRegistered = event.registrations.some(r => r.user.toString() === userId.toString());
    const isNewRegistration = !alreadyRegistered;

    if (alreadyRegistered) {
      const reg = event.registrations.find(r => r.user.toString() === userId.toString());
      reg.categoria = categoria;
      reg.division = division;
      reg.divisionAlternativa = divisionAlternativa || null;
      reg.isOC = isOC;
    } else {
      event.registrations.push({ user: userId, categoria, division, divisionAlternativa: divisionAlternativa || null, isOC });
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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

    event.squads = event.squads.filter(s => s._id.toString() !== req.params.squadId);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- STAGES ----

// Add stage (with optional PDF upload)
router.post('/:id/stages', auth, adminOnly, uploadPdf.single('archivoPdf'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const { name, cartones = 0, metales = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de la etapa es requerido' });

    const cart = parseInt(cartones) || 0;
    const met = parseInt(metales) || 0;
    const impactosPuntuables = (cart * 2) + (met * 1);
    const archivoPdf = req.file ? req.file.path : null;

    const order = event.stages.length + 1;
    event.stages.push({ name, order, cartones: cart, metales: met, impactosPuntuables, archivoPdf });
    await event.save();
    res.json(event);
  } catch (error) {
    console.error('❌ Error creando etapa:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Update stage PDF
router.put('/:id/stages/:stageId/pdf', auth, adminOnly, uploadPdf.single('archivoPdf'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });
    const stage = event.stages.id(req.params.stageId);
    if (!stage) return res.status(404).json({ message: 'Etapa no encontrada' });

    if (req.file) {
      if (stage.archivoPdf) await deleteFile(stage.archivoPdf);
      stage.archivoPdf = req.file.path;
      await event.save();
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit stage
router.put('/:id/stages/:stageId', auth, adminOnly, uploadPdf.single('archivoPdf'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está bloqueado' });

    const stage = event.stages.id(req.params.stageId);
    if (!stage) return res.status(404).json({ message: 'Etapa no encontrada' });

    const { name, cartones, metales } = req.body;
    if (name) stage.name = name;
    if (cartones !== undefined) {
      const cart = parseInt(cartones) || 0;
      const met = parseInt(metales) || 0;
      stage.cartones = cart;
      stage.metales = met;
      stage.impactosPuntuables = (cart * 2) + met;
    }
    if (req.file) {
      if (stage.archivoPdf) await deleteFile(stage.archivoPdf);
      stage.archivoPdf = req.file.path;
    }
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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

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

    const { shooter, a, b, c, noShoot = 0, miss = 0, procedural = 0, warnings = 0, dq = false, time, division: scoreDivision } = req.body;
    const penalties = (noShoot + miss + procedural) * 5;
    const total = time + (b * 1) + (c * 3) + penalties;

    const existingScore = stage.scores.find(s =>
      s.shooter.toString() === shooter &&
      (scoreDivision ? s.division === scoreDivision : !s.division || s.division === null)
    );
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
      if (scoreDivision) existingScore.division = scoreDivision;
    } else {
      stage.scores.push({ shooter, a, b, c, noShoot, miss, procedural, warnings, dq, time, total, saved: true, division: scoreDivision || null });
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
    if (isEventLocked(event)) return res.status(403).json({ message: 'El evento está finalizado y no puede modificarse' });

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
    if (stageCount === 0) return res.json([]);

    const manualDqIds = new Set(
      event.registrations
        .filter(r => r.dq && r.user)
        .map(r => r.user._id?.toString() || r.user.toString())
    );

    // Build a map keyed by "shooterId_division" to separate scores per division
    const buildMap = (filterDivision) => {
      const map = {};

      event.registrations.forEach(reg => {
        if (!reg.user) return;
        const id = reg.user._id?.toString() || reg.user.toString();
        const regDiv = filterDivision === 'active' ? reg.division : reg.divisionAlternativa;
        if (!regDiv) return;
        const key = `${id}_${regDiv}`;
        if (!map[key]) {
          map[key] = {
            shooter: reg.user,
            division: regDiv,
            divisionAlternativa: filterDivision === 'active' ? reg.divisionAlternativa : null,
            isAlternative: filterDivision === 'alternative',
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
          const reg = event.registrations.find(r => (r.user._id?.toString() || r.user.toString()) === id);
          if (!reg) return;

          const targetDiv = filterDivision === 'active' ? reg.division : reg.divisionAlternativa;
          if (!targetDiv) return;

          // Match score to division
          const scoreDiv = score.division;
          const matches = scoreDiv ? scoreDiv === targetDiv : filterDivision === 'active';
          if (!matches) return;

          const key = `${id}_${targetDiv}`;
          if (!map[key]) return;

          const stageDq = score.dq || manualDqIds.has(id);
          map[key].stageScores[stage._id.toString()] = stageDq ? 'DQ' : score.total;
          if (!stageDq) {
            map[key].totalSum += score.total;
            map[key].stagesCompleted += 1;
          }
          if (score.dq) map[key].dq = true;
        });
      });

      return map;
    };

    const activeMap = buildMap('active');
    const altMap = buildMap('alternative');
    const combined = { ...activeMap, ...altMap };

    const rankings = Object.values(combined).map(entry => ({
      shooter: entry.shooter,
      division: entry.division,
      divisionAlternativa: entry.divisionAlternativa,
      isAlternative: entry.isAlternative,
      stageScores: entry.stageScores,
      stagesCompleted: entry.stagesCompleted,
      dq: entry.dq,
      average: entry.dq ? null : (entry.stagesCompleted > 0 ? entry.totalSum / stageCount : null),
      totalSum: entry.totalSum
    }));

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