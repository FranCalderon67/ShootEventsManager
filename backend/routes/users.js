const express = require('express');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Calculate categoria based on genero, fechaNacimiento and event date
const calcCategoria = (genero, fechaNacimiento, eventDate = new Date()) => {
  if (!genero || !fechaNacimiento) return 'General';
  if (genero === 'Femenino') return 'Lady';
  const birth = new Date(fechaNacimiento);
  const ref = new Date(eventDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  if (age < 21) return 'Junior';
  if (age >= 70) return 'Grand Senior';
  if (age >= 65) return 'Super Senior';
  if (age >= 55) return 'Senior';
  return 'General';
};

// Get all users (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, genero, fechaNacimiento } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'El email ya está registrado' });

    let fechaNac = null;
    if (fechaNacimiento) {
      const [y, m, d] = fechaNacimiento.toString().slice(0, 10).split('-');
      fechaNac = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0, 0));
    }

    const user = new User({ name, email, password, role: role || 'user', genero: genero || null, fechaNacimiento: fechaNac });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update own profile (name, genero, fechaNacimiento) — must be before /:id
router.put('/me', auth, async (req, res) => {
  try {
    const { name, genero, fechaNacimiento } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (name) user.name = name;
    if (genero !== undefined) user.genero = genero;
    if (fechaNacimiento !== undefined) {
      if (!fechaNacimiento) {
        user.fechaNacimiento = null;
      } else {
        const [y, m, d] = fechaNacimiento.toString().slice(0, 10).split('-');
        user.fechaNacimiento = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0, 0));
      }
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, role, genero, fechaNacimiento } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (genero !== undefined) user.genero = genero || null;
    if (fechaNacimiento !== undefined) {
      if (!fechaNacimiento) {
        user.fechaNacimiento = null;
      } else {
        const [y, m, d] = fechaNacimiento.toString().slice(0, 10).split('-');
        user.fechaNacimiento = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0, 0));
      }
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle OC status (admin only)
router.put('/:id/oc', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    user.isOC = req.body.isOC !== undefined ? req.body.isOC : !user.isOC;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
module.exports.calcCategoria = calcCategoria;
