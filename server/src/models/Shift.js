const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    venue: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'manager', 'staff'],
      default: 'staff',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

shiftSchema.index({ venue: 1, date: 1 });

module.exports = mongoose.model('Shift', shiftSchema);