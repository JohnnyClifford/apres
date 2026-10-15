const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return { id: user._id, email: user.email, name: user.name, role: user.role };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ error: 'email, password, and name must be strings' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });
    const token = signToken(user);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password must be strings' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;