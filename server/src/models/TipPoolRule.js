const mongoose = require('mongoose');

const tipPoolRuleSchema = new mongoose.Schema(
  {
    venue: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    strategy: {
      type: String,
      enum: ['hours', 'role_weighted', 'hybrid'],
      default: 'hours',
    },
    roleWeights: {
      type: Map,
      of: Number,
      default: {},
    },
    basePerShiftCents: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TipPoolRule', tipPoolRuleSchema);