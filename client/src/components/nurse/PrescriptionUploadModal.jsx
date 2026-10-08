import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Download,
  User,
  Stethoscope,
  Calendar,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  FileCheck
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { uploadPrescriptionPdf } from '../../services/nurseService';

export default function PrescriptionUploadModal({
  isOpen,
  onClose,
  onSuccess,
  patients = [],
  preselectedPatientId = null
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [patientId, setPatientId] = useState(preselectedPatientId || (patients[0]?._id || 'P001'));
  const [documentType, setDocumentType] = useState('prescription');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [showExtractedText, setShowExtractedText] = useState(false);

  // Sync preselected patient
  useEffect(() => {
    if (preselectedPatientId) {
      setPatientId(preselectedPatientId);
    } else if (patients.length > 0 && !patientId) {
      setPatientId(patients[0]._id);
    }
  }, [preselectedPatientId, patients]);

  // Sync doctor name if patient changes
  useEffect(() => {
    const selectedPatient = patients.find((p) => p._id === patientId);
    if (selectedPatient && !doctorName) {
      setDoctorName(selectedPatient.assignedDoctor || 'Dr. Attending');
    }
  }, [patientId, patients]);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF (.pdf) prescription document.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB maximum limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setNotes('');
    setShowExtractedText(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a PDF file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', patientId);
      formData.append('documentType', documentType);
      formData.append('doctorName', doctorName || 'Dr. Attending');
      formData.append('notes', notes);

      const result = await uploadPrescriptionPdf(formData);
      setUploadResult(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('Prescription upload error:', err);
      setError(err.message || 'Failed to upload prescription PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const selectedPatientObj = patients.find((p) => p._id === patientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-[#F4F0E8]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1C1917] font-serif">Upload Prescription PDF</h2>
              <p className="text-xs text-[#78716C]">Upload real clinical prescriptions & discharge summaries</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#E8E2D7]/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold">Upload Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {uploadResult ? (
            /* Upload Success View */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950 font-serif">Prescription PDF Processed Successfully</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    File was verified, stored, and attached to patient <strong>{uploadResult.patientName || uploadResult.patientId}</strong>.
                  </p>
                </div>

                {/* Uploaded File Info Card */}
                <div className="p-3.5 bg-white/90 border border-emerald-200/80 rounded-xl text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-[#78716C] font-medium">Document ID:</span>
                    <span className="font-mono font-bold text-[#1C1917]">{uploadResult._id}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-[#78716C] font-medium">File Name:</span>
                    <span className="font-bold text-[#1C1917] truncate max-w-[200px]">{uploadResult.fileName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-[#78716C] font-medium">File Size / Pages:</span>
                    <span className="font-medium text-[#1C1917]">
                      {formatFileSize(uploadResult.fileSize)} • {uploadResult.numPages || 1} page(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C] font-medium">Prescribing Doctor:</span>
                    <span className="font-bold text-[#1C1917]">{uploadResult.doctorName}</span>
                  </div>
                </div>

                {/* Action Links */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {uploadResult.fileUrl && (
                    <a
                      href={uploadResult.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Uploaded PDF</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F4F0E8] hover:bg-[#E8E2D7] text-[#1C1917] font-bold text-xs rounded-xl border border-[#E8E2D7] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#0D9488]" />
                    <span>{showExtractedText ? 'Hide Extracted Text' : 'View Extracted Text'}</span>
                  </button>
                </div>
              </div>

              {/* Extracted Text Collapsible Preview */}
              {showExtractedText && (
                <div className="p-4 bg-white border border-[#E8E2D7] rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                      Extracted Clinical Text
                    </span>
                    <span className="text-[10px] text-[#78716C]">Optical / Text Parser</span>
                  </div>
                  <pre className="text-xs text-[#1C1917] bg-[#FAF8F5] p-3 rounded-lg border border-[#E8E2D7] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {uploadResult.rawText || 'No text extracted.'}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* Upload Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C1917]">
                  Target Patient <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-all"
                  >
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p._id}) — {p.recoveryContext || p.condition || 'Recovery'}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPatientObj && (
                  <p className="text-[11px] text-[#78716C]">
                    Assigned: {selectedPatientObj.assignedDoctor || 'General Medicine'} • {selectedPatientObj.age}y {selectedPatientObj.gender}
                  </p>
                )}
              </div>

              {/* Document Type & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1917]">Document Category</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                  >
                    <option value="prescription">Prescription / Medication Order</option>
                    <option value="discharge_summary">Discharge Summary</option>
                    <option value="clinical_note">Clinical Note / Lab Report</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1917]">Prescribing Physician</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Connor"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                  />
                </div>
              </div>

              {/* PDF Dropzone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C1917]">
                  Prescription PDF Document <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    dragActive
                      ? 'border-[#0D9488] bg-[#0D9488]/5 scale-[0.99]'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-[#E8E2D7] hover:border-[#0D9488] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-1.5">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-[#1C1917] truncate max-w-sm">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[#78716C] font-medium">
                        {formatFileSize(selectedFile.size)} • PDF Ready for Processing
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline mt-1"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1C1917]">
                          Click to browse or drag & drop Prescription PDF here
                        </p>
                        <p className="text-[11px] text-[#78716C] mt-0.5">
                          Standard PDF files supported (Max 25MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes / Clinical Instructions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C1917]">
                  Clinical Instructions / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg PO BID with meals. Omeprazole 20mg daily before breakfast."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E2D7] bg-[#FAF8F5]">
          {uploadResult ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F4F0E8] hover:bg-[#E8E2D7] text-[#1C1917] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 text-xs font-bold text-[#78716C] hover:text-[#1C1917] hover:bg-[#E8E2D7]/50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={uploading || !selectedFile}
                className="flex items-center gap-2 px-5 py-2 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Process PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
