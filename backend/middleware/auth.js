const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }
  next();
};

const adminOrOC = async (req, res, next) => {
  // OC: must be registered as OC in the specific event (checked in route)
  // Admin always passes
  if (req.user.role === 'admin') return next();

  // For OC: verify they are registered as OC in the event
  const eventId = req.params.id;
  if (!eventId) return res.status(403).json({ message: 'Acceso denegado' });

  const Event = require('../models/Event');
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

  const reg = event.registrations.find(r => r.user.toString() === req.user._id.toString());
  if (reg && reg.isOC) return next();

  return res.status(403).json({ message: 'Acceso solo para administradores u OC del evento' });
};

module.exports = { auth, adminOnly, adminOrOC };
