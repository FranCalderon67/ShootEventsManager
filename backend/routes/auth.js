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
    const { name, email, password, role, sexo, fechaNacimiento } = req.body;
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
    const user = new User({ name, email, password, role: userRole, sexo: sexo || null, fechaNacimiento: fechaNac });
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeMail({ name: user.name, email: user.email });

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Google OAuth login/register (via userinfo from access token)
router.post('/google-token', async (req, res) => {
  try {
    const { googleId, email, name } = req.body;
    if (!email || !googleId) return res.status(400).json({ message: 'Datos de Google requeridos' });

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        password: googleId + (process.env.JWT_SECRET || 'secret'),
        role: 'user',
        googleId,
      });
      await user.save();
      sendWelcomeMail({ name: user.name, email: user.email });
    }

    res.json({ token: generateToken(user._id), user });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(401).json({ message: 'Error al autenticar con Google' });
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

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
