const express = require('express');
const SwapRequest = require('../models/SwapRequest');
const Shift = require('../models/Shift');
const { requireAuth, requireRole } = require('../middleware/auth');
const { canTransition } = require('../services/swapService');
const User = require('../models/User');

const router = express.Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { shiftId, toUserId, requestedShiftId } = req.body || {};
    if (!shiftId || !toUserId) {
      return res.status(400).json({ error: 'shiftId and toUserId are required' });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    if (!shift.assignedTo || shift.assignedTo.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You can only request swaps for your own shifts' });
    }

    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    let requestedShift = null;
    if (requestedShiftId) {
      if (String(requestedShiftId) === String(shift._id)) {
        return res.status(400).json({ error: 'Choose a different shift to trade' });
      }

      requestedShift = await Shift.findById(requestedShiftId);
      if (!requestedShift) {
        return res.status(404).json({ error: 'Requested shift not found' });
      }
      if (String(requestedShift.assignedTo) !== String(toUserId)) {
        return res.status(400).json({ error: 'The requested shift is not assigned to the selected colleague' });
      }
    }

    const swap = await SwapRequest.create({
      shift: shiftId,
      requestedShift: requestedShift?._id || null,
      fromUser: req.user.userId,
      toUser: toUserId,
      status: 'pending'
    });

    const io = req.app.get('io');
    if (io) io.emit('swap:requested', swap);

    res.status(201).json({ swap });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'staff') {
      filter.$or = [{ fromUser: req.user.userId }, { toUser: req.user.userId }];
    }
    if (req.query.status) filter.status = req.query.status;

    const swaps = await SwapRequest.find(filter).sort({ createdAt: -1 });
    res.json({ swaps });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status is required' });

    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Swap request not found' });
    if (!['accepted', 'rejected'].includes(status) || !canTransition(swap.status, status)) {
      return res.status(409).json({ error: `Cannot transition from ${swap.status} to ${status}` });
    }

    const updatedShifts = [];
    if (status === 'accepted') {
      const [offeredShift, requestedShift] = await Promise.all([
        Shift.findById(swap.shift),
        swap.requestedShift ? Shift.findById(swap.requestedShift) : null,
      ]);
      if (!offeredShift) return res.status(409).json({ error: 'The offered shift for this swap no longer exists' });
      if (swap.requestedShift && !requestedShift) {
        return res.status(409).json({ error: 'The requested shift for this trade no longer exists' });
      }

      if (requestedShift) {
        // Re-check ownership at approval time in case the schedule changed while pending.
        if (String(offeredShift.assignedTo) !== String(swap.fromUser) || String(requestedShift.assignedTo) !== String(swap.toUser)) {
          return res.status(409).json({ error: 'One of these shifts is no longer assigned to the requested trade participants' });
        }

        offeredShift.assignedTo = swap.toUser;
        requestedShift.assignedTo = swap.fromUser;
        await Promise.all([offeredShift.save(), requestedShift.save()]);
        updatedShifts.push(offeredShift, requestedShift);
      } else {
        // Support legacy requests created before counter-shifts were introduced.
        offeredShift.assignedTo = swap.toUser;
        await offeredShift.save();
        updatedShifts.push(offeredShift);
      }
    }

    swap.status = status;
    swap.resolvedBy = req.user.userId;
    swap.resolvedAt = new Date();
    await swap.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('swap:updated', swap);
      updatedShifts.forEach((shift) => io.emit('shift:updated', shift));
    }

    res.json({ swap });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
