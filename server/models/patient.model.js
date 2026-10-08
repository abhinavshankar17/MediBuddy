const mongoose = require('mongoose');

const PatientPreferencesSchema = new mongoose.Schema({
  wakeTime: { type: String, default: '07:00' },
  breakfastTime: { type: String, default: '08:00' },
  lunchTime: { type: String, default: '13:00' },
  dinnerTime: { type: String, default: '20:00' },
  sleepTime: { type: String, default: '22:00' }
}, { _id: false });

const PatientSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  syntheticId: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  language: { type: String, default: 'en' },
  condition: { type: String, required: true },
  procedure: { type: String, required: true },
  recoveryPhase: { type: String, required: true },
  admissionDate: { type: String, required: true },
  dischargeDate: { type: String, required: true },
  mobility: { type: String, default: 'Independent' },
  dietaryPreference: { type: String, default: 'Regular' },
  preferences: { type: PatientPreferencesSchema, default: () => ({}) },
  caregiverId: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
