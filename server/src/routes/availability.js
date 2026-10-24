const express = require('express');
const Availability = require('../models/Availability');
const { requireAuth, requireRole } = require('../middleware/auth');

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
      { $set: { slots, status: 'pending', resolvedBy: null, resolvedAt: null } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ availability });
  } catch (err) {
    next(err);
  }
});

router.get('/pending', requireAuth, requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { weekStart } = req.query;
    const filter = { status: 'pending' };
    if (weekStart) filter.weekStart = weekStart;
    const pending = await Availability.find(filter).populate('user', 'name email role');
    res.json({ pending });
  } catch (err) {
    next(err);
  }
});

router.get('/week', requireAuth, requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }
    const filter = { weekStart };
    if (req.query.status) filter.status = req.query.status;
    const availabilities = await Availability.find(filter);
    res.json({ availabilities });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const availability = await Availability.findById(req.params.id);
    if (!availability) return res.status(404).json({ error: 'Availability not found' });

    if (String(availability.user) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'You can only delete your own availability' });
    }

    if (availability.status === 'approved') {
      return res.status(409).json({ error: 'Approved time off cannot be cancelled directly. Contact your manager.' });
    }

    await Availability.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAuth, requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }
    const availability = await Availability.findById(req.params.id);
    if (!availability) return res.status(404).json({ error: 'Availability not found' });

    availability.status = status;
    availability.resolvedBy = req.user.userId;
    availability.resolvedAt = new Date();
    await availability.save();

    res.json({ availability });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
