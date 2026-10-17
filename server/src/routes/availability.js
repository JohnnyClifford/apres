const express = require('express');
const Availability = require('../models/Availability');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/me', async (req, res, next) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }
    const availability = await Availability.findOne({
      user: req.user.userId,
      weekStart,
    });
    res.json({ availability: availability || null });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req, res, next) => {
  try {
    const { weekStart, slots } = req.body || {};
    if (!weekStart || !Array.isArray(slots)) {
      return res.status(400).json({ error: 'weekStart and slots[] are required' });
    }

    const availability = await Availability.findOneAndUpdate(
      { user: req.user.userId, weekStart },
      { $set: { slots } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ availability });
  } catch (err) {
    next(err);
  }
});

module.exports = router;