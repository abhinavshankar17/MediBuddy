const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  recipientId: { type: String, required: true, index: true },
  recipientRole: {
    type: String,
    enum: ['patient', 'caregiver', 'nurse'],
    default: 'patient'
  },
  patientId: { type: String, required: true, index: true },
  reminderId: { type: String, default: null, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      'medication_reminder',
      'medication_followup',
      'simulated_call',
      'caregiver_medication_notification',
      'general'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  read: { type: Boolean, default: false },
  status: { type: String, default: 'sent' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
