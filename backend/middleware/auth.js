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

const adminOrOC = (req, res, next) => {
  // Admin always passes
  if (req.user.role === 'admin') return next();
  // Global OC role on user passes
  if (req.user.isOC) return next();
  return res.status(403).json({ message: 'Acceso solo para administradores u Oficiales de Campo' });
};

module.exports = { auth, adminOnly, adminOrOC };
