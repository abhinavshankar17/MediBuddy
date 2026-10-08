const mongoose = require('mongoose');

const PatientInsightSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  quizSessionId: { type: String, index: true },
  score: { type: Number, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  missedInstructions: [{ type: String }],
  aiSummary: { type: String, required: true },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  evidenceEventIds: [{ type: String }],
  disclaimer: {
    type: String,
    default: 'AI-generated — verify before acting.'
  },
  aiGenerated: {
    type: Boolean,
    default: true
  },
  generatedAt: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.PatientInsight || mongoose.model('PatientInsight', PatientInsightSchema);
