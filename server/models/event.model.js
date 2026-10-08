const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  reminderId: { type: String, default: null, index: true },
  taskId: { type: String, default: null, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  timestamp: { type: String, default: () => new Date().toISOString() },
  actor: { type: String, default: 'patient' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Event || mongoose.model('Event', EventSchema);
