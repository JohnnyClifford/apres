const express = require('express');
const WeeklyAvailability = require('../models/WeeklyAvailability');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

router.use(requireAuth);

router.get('/me', async (req, res, next) => {
  try {
    const weeklyAvailability = await WeeklyAvailability.findOne({ user: req.user.userId });
    res.json({ weeklyAvailability: weeklyAvailability || null });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req, res, next) => {
  try {
    const { slots } = req.body || {};
    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: 'slots must be an array' });
    }

    for (const slot of slots) {
      if (!Number.isInteger(slot?.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        return res.status(400).json({ error: 'dayOfWeek must be an integer between 0 and 6' });
      }
      if (!TIME_PATTERN.test(slot.startTime || '')) {
        return res.status(400).json({ error: 'startTime must use HH:MM format' });
      }
      if (!TIME_PATTERN.test(slot.endTime || '')) {
        return res.status(400).json({ error: 'endTime must use HH:MM format' });
      }
      if (slot.endTime <= slot.startTime) {
        return res.status(400).json({ error: 'endTime must be after startTime' });
      }
    }

    const weeklyAvailability = await WeeklyAvailability.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { slots } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ weeklyAvailability });
  } catch (err) {
    next(err);
  }
});

router.get('/all', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const weeklyAvailabilities = await WeeklyAvailability.find().populate('user', 'name email role');
    res.json({ weeklyAvailabilities });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
