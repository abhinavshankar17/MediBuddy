const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  documentType: { type: String, default: 'discharge_summary' },
  hospitalName: { type: String, default: 'CareBridge Demo Hospital' },
  doctorName: { type: String, required: true },
  admissionDate: { type: String, required: true },
  dischargeDate: { type: String, required: true },
  rawText: { type: String, required: true },
  uploadedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
