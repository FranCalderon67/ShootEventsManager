const express = require('express');
const Event = require('../models/Event');
const { auth, adminOnly, adminOrOC } = require('../middleware/auth');

const router = express.Router();

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
    const event = new Event({ ...req.body, createdBy: req.user._id });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper: check if event is locked (date has passed)
const isEventLocked = (event) => {
  const eventDate = new Date(event.date);
  eventDate.setHours(23, 59, 59, 999);
  return new Date() > eventDate;
};

// Update event (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    if (isEventLocked(event)) {
      return res.status(403).json({ message: 'El evento está bloqueado porque ya pasó su fecha' });
    }
    Object.assign(event, req.body);
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
      const deadline = new Date(event.registrationDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline) {
        return res.status(400).json({ message: 'El plazo de inscripción ya cerró' });
      }
    }

    const userId = req.user.role === 'admin' && req.body.userId
      ? req.body.userId
      : req.user._id.toString();

    const { categoria, division } = req.body;
    if (!categoria || !division) return res.status(400).json({ message: 'Categoría y división son requeridas' });

    const { isOC = false } = req.body;

    const alreadyRegistered = event.registrations.some(r => r.user.toString() === userId.toString());
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

// Save score for a shooter in a stage (admin or OC)
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

    const shooterMap = {};

    event.stages.forEach(stage => {
      stage.scores.filter(s => s.saved).forEach(score => {
        const id = score.shooter._id.toString();
        if (!shooterMap[id]) {
          shooterMap[id] = {
            shooter: score.shooter,
            stageScores: {},
            totalSum: 0,
            stagesCompleted: 0
          };
        }
        shooterMap[id].stageScores[stage._id.toString()] = score.total;
        shooterMap[id].totalSum += score.total;
        shooterMap[id].stagesCompleted += 1;
      });
    });

    const rankings = Object.values(shooterMap).map(entry => ({
      shooter: entry.shooter,
      stageScores: entry.stageScores,
      stagesCompleted: entry.stagesCompleted,
      average: entry.stagesCompleted > 0 ? entry.totalSum / stageCount : null,
      totalSum: entry.totalSum
    }));

    rankings.sort((a, b) => {
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return a.average - b.average;
    });

    // If requesting user is not admin, only return their own data
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
