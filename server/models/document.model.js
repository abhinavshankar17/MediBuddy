const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  documentType: { type: String, default: 'discharge_summary' }, // 'discharge_summary' | 'prescription' | 'clinical_note'
  hospitalName: { type: String, default: 'CareBridge Demo Hospital' },
  doctorName: { type: String, default: 'Dr. Attending' },
  admissionDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  dischargeDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  rawText: { type: String, default: '' },
  fileName: { type: String, default: null },
  fileUrl: { type: String, default: null },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/pdf' },
  uploadedBy: { type: String, default: 'Nurse Staff' },
  notes: { type: String, default: '' },
  uploadedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
