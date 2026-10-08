const mongoose = require('mongoose');

const MedicationReminderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  extractedItemId: { type: String, default: null, index: true },
  medicationName: { type: String, required: true },
  dose: { type: String, default: null },
  scheduledAt: { type: String, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'reminded', 'taken', 'missed', 'overdue'],
    default: 'scheduled'
  },
  reminderSentAt: { type: String, default: null },
  respondedAt: { type: String, default: null },
  responseType: {
    type: String,
    enum: ['taken', 'not_taken', 'dismissed', 'no_response', null],
    default: null
  },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.MedicationReminder || mongoose.model('MedicationReminder', MedicationReminderSchema);
