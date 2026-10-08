const mongoose = require('mongoose');

const ExtractedItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  documentId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      'medication',
      'activity',
      'exercise',
      'follow_up',
      'restriction',
      'hydration',
      'warning_sign',
      'diet',
      'monitoring',
      'wound_care'
    ]
  },
  name: { type: String, required: true },
  dose: { type: String, default: null },
  frequency: { type: String, default: null },
  foodRelation: { type: String, default: null },
  timing: { type: String, default: null },
  duration: { type: String, default: null },
  sourceSentence: { type: String, default: null },
  confidence: { type: Number, default: 0.9 },
  status: {
    type: String,
    enum: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED'],
    default: 'APPROVED'
  },
  trust: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH'
  },
  verifiedSource: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.ExtractedItem || mongoose.model('ExtractedItem', ExtractedItemSchema);
