const mongoose = require('mongoose');

const weeklyAvailabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    slots: [
      {
        _id: false,
        dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('WeeklyAvailability', weeklyAvailabilitySchema);
