const express = require('express');
const SwapRequest = require('../models/SwapRequest');
const Shift = require('../models/Shift');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateSwapRequest, canResolve, canTransition } = require('../services/swapService');

const router = express.Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { shiftId, toUserId, message } = req.body || {};
    if (!shiftId || !toUserId) {
      return res.status(400).json({ error: 'shiftId and toUserId are required' });
    }

    const shift = await Shift.findById(shiftId);
    const existingSwaps = shift
      ? await SwapRequest.find({ shift: shift._id })
      : [];

    const reason = validateSwapRequest({
      shift,
      requesterId: req.user.userId,
      toUserId,
      existingSwaps,
    });
    if (reason) {
      return res.status(400).json({ error: reason });
    }

    const swap = await SwapRequest.create({
      shift: shift._id,
      fromUser: req.user.userId,
      toUser: toUserId,
      message: message || '',
    });

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

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Swap not found' });

    const isManagerLike = canResolve(req.user.role);
    const isOwnSwap = String(swap.fromUser) === String(req.user.userId);
    const canAct =
      (isManagerLike && ['accepted', 'rejected'].includes(status)) ||
      (isOwnSwap && status === 'cancelled');

    if (!canAct) {
      return res.status(403).json({ error: 'Not allowed to perform this transition' });
    }

    if (!canTransition(swap.status, status)) {
      return res.status(409).json({ error: `Cannot transition from ${swap.status} to ${status}` });
    }

    swap.status = status;
    swap.resolvedBy = req.user.userId;
    swap.resolvedAt = new Date();
    await swap.save();

    res.json({ swap });
  } catch (err) {
    next(err);
  }
});

module.exports = router;