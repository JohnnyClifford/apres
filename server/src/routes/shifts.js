const express = require('express');
const Shift = require('../models/Shift');
const { requireAuth, requireRole } = require('../middleware/auth');
const { findConflict, wouldCauseOvertime } = require('../services/shiftService');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { venue, from, to } = req.query;
    const filter = {};
    if (venue) filter.venue = venue;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const shifts = await Shift.find(filter).sort({ date: 1, startTime: 1 });
    res.json({ shifts });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { venue, date, startTime, endTime, role, assignedTo, notes } = req.body || {};
    if (!venue || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'venue, date, startTime, endTime are required' });
    }

    const candidate = { venue, date, startTime, endTime, role, assignedTo, notes };

    if (assignedTo) {
      const sameVenue = await Shift.find({ venue, assignedTo });
      const conflict = findConflict(candidate, sameVenue);
      if (conflict) {
        return res.status(409).json({
          error: 'Shift conflicts with an existing shift',
          conflictId: conflict._id,
        });
      }
      if (wouldCauseOvertime(candidate, sameVenue)) {
        return res.status(409).json({ error: 'Assignment would exceed weekly hour limit' });
      }
    }

    const shift = await Shift.create(candidate);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('shift:created', shift);
    }

    res.status(201).json({ shift });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    Object.assign(shift, req.body || {});

    if (shift.assignedTo) {
      const sameVenue = await Shift.find({ venue: shift.venue, assignedTo: shift.assignedTo });
      const conflict = findConflict(shift, sameVenue);
      if (conflict) {
        return res.status(409).json({
          error: 'Shift conflicts with an existing shift',
          conflictId: conflict._id,
        });
      }
    }

    await shift.save();
    res.json({ shift });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const deleted = await Shift.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Shift not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;