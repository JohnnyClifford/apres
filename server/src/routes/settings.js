const express = require('express');
const Settings = require('../models/Settings');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, requireRole('owner'), async (req, res, next) => {
  try {
    const { venueName } = req.body || {};
    if (typeof venueName !== 'string' || !venueName.trim()) {
      return res.status(400).json({ error: 'venueName must be a non-empty string' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    settings.venueName = venueName.trim();
    await settings.save();

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
