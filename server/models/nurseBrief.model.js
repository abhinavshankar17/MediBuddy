const mongoose = require('mongoose');

const NurseBriefSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  summary: { type: String, required: true },
  medicationAdherence: {
    total: { type: Number, default: 0 },
    confirmed: { type: Number, default: 0 },
    notConfirmed: { type: Number, default: 0 },
    missed: { type: Number, default: 0 }
  },
  quizPerformance: {
    score: { type: Number },
    correct: { type: Number },
    total: { type: Number }
  },
  flags: [{ type: String }],
  knowledgeGaps: [{ type: String }],
  questionsForNurse: [{ type: String }],
  recommendedFollowUp: { type: String },
  evidenceEventIds: [{ type: String }],
  aiGenerated: { type: Boolean, default: true },
  generatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.NurseBrief || mongoose.model('NurseBrief', NurseBriefSchema);
