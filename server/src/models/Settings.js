const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  venueName: {
    type: String,
    default: 'Main Restaurant',
    required: true,
  },
});

module.exports = mongoose.model('Settings', settingsSchema);
