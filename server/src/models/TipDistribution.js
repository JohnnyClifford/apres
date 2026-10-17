const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema(
  {
    venue: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    totalTipsCents: { type: Number, required: true },
    strategy: { type: String, required: true },
    breakdown: [
      {
        _id: false,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amountCents: { type: Number, required: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

distributionSchema.index({ venue: 1, date: 1 });

module.exports = mongoose.model('TipDistribution', distributionSchema);