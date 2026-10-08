const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  itemId: { type: String, default: null },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueAt: { type: String, required: true },
  recurrence: { type: String, default: 'once' },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed', 'snoozed'],
    default: 'pending'
  },
  assignedTo: { type: String, required: true },
  dependsOn: { type: String, default: null },
  sourceSentence: { type: String, default: null },
  completedAt: { type: String, default: null },
  snoozedUntil: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
