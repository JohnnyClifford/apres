const express = require('express');
const TipPoolRule = require('../models/TipPoolRule');
const TipDistribution = require('../models/TipDistribution');
const { requireAuth, requireRole } = require('../middleware/auth');
const { calculateHours, calculateRoleWeighted, calculateHybrid } = require('../services/tipService');

const router = express.Router();

router.use(requireAuth);

router.get('/my-payouts', async (req, res, next) => {
  try {
    const distributions = await TipDistribution.find({
      'breakdown.userId': req.user.userId,
    }).sort({ date: -1 });

    res.json({ distributions });
  } catch (err) {
    next(err);
  }
});

router.post('/calculate', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { venue, totalTipsCents, shifts } = req.body || {};
    if (!venue || totalTipsCents === undefined || !Array.isArray(shifts)) {
      return res.status(400).json({ error: 'venue, totalTipsCents, and shifts[] are required' });
    }

    const rule = await TipPoolRule.findOne({ venue });
    const strategy = rule ? rule.strategy : 'hours';

    let distribution;
    if (strategy === 'role_weighted') {
      const weights = rule.roleWeights ? Object.fromEntries(rule.roleWeights) : {};
      distribution = calculateRoleWeighted(totalTipsCents, shifts, weights);
    } else if (strategy === 'hybrid') {
      distribution = calculateHybrid(totalTipsCents, shifts, rule.basePerShiftCents);
    } else {
      distribution = calculateHours(totalTipsCents, shifts);
    }

    const enhancedDistribution = distribution.map(dist => {
      const matchingShift = shifts.find(s => s.userId === dist.userId);
      return { ...dist, hours: matchingShift ? matchingShift.hours : 0 };
    });

    res.json({ strategy, distribution: enhancedDistribution });
  } catch (err) {
    next(err);
  }
});

router.post('/distribute', requireRole('manager', 'owner'), async (req, res, next) => {
  try {
    const { venue, date, totalTipsCents, shifts } = req.body || {};
    if (!venue || !date || totalTipsCents === undefined || !Array.isArray(shifts)) {
      return res.status(400).json({ error: 'venue, date, totalTipsCents, and shifts[] are required' });
    }

    const rule = await TipPoolRule.findOne({ venue });
    const strategy = rule ? rule.strategy : 'hours';

    let distribution;
    if (strategy === 'role_weighted') {
      const weights = rule.roleWeights ? Object.fromEntries(rule.roleWeights) : {};
      distribution = calculateRoleWeighted(totalTipsCents, shifts, weights);
    } else if (strategy === 'hybrid') {
      distribution = calculateHybrid(totalTipsCents, shifts, rule.basePerShiftCents);
    } else {
      distribution = calculateHours(totalTipsCents, shifts);
    }

    const snapshot = await TipDistribution.create({
      venue,
      date,
      totalTipsCents,
      strategy,
      breakdown: distribution,
      createdBy: req.user.userId,
    });

    res.status(201).json({ distribution: snapshot });
  } catch (err) {
    next(err);
  }
});

module.exports = router;