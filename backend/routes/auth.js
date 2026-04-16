const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendWelcomeMail } = require('../services/mailer');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, genero, fechaNacimiento } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'El email ya está registrado' });

    // Only allow admin creation if no admins exist or requester is admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userRole = (role === 'admin' && adminCount === 0) ? 'admin' : 'user';

    let fechaNac = null;
    if (fechaNacimiento) {
      const [y, m, d] = fechaNacimiento.toString().slice(0, 10).split('-');
      fechaNac = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0, 0));
    }
    const user = new User({ name, email, password, role: userRole, genero: genero || null, fechaNacimiento: fechaNac });
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeMail({ name: user.name, email: user.email });

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    res.json({ token: generateToken(user._id), user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email y nueva contraseña son requeridos' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No existe una cuenta con ese email' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
