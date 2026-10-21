const express = require('express');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const messages = await Message.find({
      $or: [
        { recipient: null },
        { sender: userId },
        { recipient: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name role')
      .populate('recipient', 'name role');

    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;