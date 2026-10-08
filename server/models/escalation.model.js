const mongoose = require('mongoose');

const EscalationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  itemId: { type: String },
  category: {
    type: String,
    required: true,
    enum: [
      // Existing categories preserved
      'warning_sign',
      'missed_medication',
      'missing_information',
      'overdue_task',
      'medication_question',
      // Newer supported categories
      'repeated_missed_medication',
      'low_quiz_score',
      'knowledge_gap'
    ]
  },
  reason: { type: String, required: true },
  description: { type: String },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  trigger: { type: String, default: 'event' },
  evidence: [{ type: String }],
  relatedEvent: { type: mongoose.Schema.Types.Mixed },
  relatedEventId: { type: String },
  status: {
    type: String,
    enum: ['OPEN', 'IN_REVIEW', 'RESOLVED'],
    default: 'OPEN'
  },
  assignedTo: { type: String },
  resolvedBy: { type: String },
  resolution: { type: String },
  timestamp: { type: String, default: () => new Date().toISOString() },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Escalation || mongoose.model('Escalation', EscalationSchema);
