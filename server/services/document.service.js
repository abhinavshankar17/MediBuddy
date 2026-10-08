const fs = require('fs');
const dataStore = require('./dataStore');
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse module not loaded, using raw text fallback');
}

/**
 * Service for discharge documents and clinical records
 */
const documentService = {
  /**
   * Process and save an uploaded PDF prescription or discharge summary
   */
  async uploadDocument({ file, body = {} }) {
    if (!file) {
      throw { statusCode: 400, message: 'PDF file is required for upload' };
    }

    const patientId = body.patientId || 'P001';

    // Verify patient exists if patientId is provided
    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    let extractedText = '';
    let numPages = 1;
    let pdfInfo = {};

    // Extract text from PDF using pdf-parse if available
    try {
      if (pdfParse && fs.existsSync(file.path)) {
        const dataBuffer = fs.readFileSync(file.path);
        const parsed = await pdfParse(dataBuffer);
        extractedText = parsed.text ? parsed.text.trim() : '';
        numPages = parsed.numpages || 1;
        pdfInfo = parsed.info || {};
      }
    } catch (err) {
      console.error('PDF text extraction error:', err.message);
      extractedText = body.rawText || body.notes || 'PDF content uploaded (text extraction fallback).';
    }

    const docId = `DOC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const documentType = body.documentType || 'prescription';
    const doctorName = body.doctorName || patient.assignedDoctor || 'Dr. Attending';
    const hospitalName = body.hospitalName || 'CareBridge Demo Hospital';
    const todayStr = new Date().toISOString().split('T')[0];

    const newDocument = {
      _id: docId,
      patientId: patientId,
      patientName: patient.name || '',
      documentType: documentType,
      hospitalName: hospitalName,
      doctorName: doctorName,
      admissionDate: body.admissionDate || patient.admissionDate || todayStr,
      dischargeDate: body.dischargeDate || patient.dischargeDate || todayStr,
      rawText: extractedText || body.notes || `Prescription PDF document uploaded for ${patient.name}.`,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/pdf',
      numPages: numPages,
      uploadedBy: body.uploadedBy || 'Nurse on Duty',
      notes: body.notes || '',
      uploadedAt: new Date().toISOString()
    };

    // Save to dataStore (MongoDB / In-Memory)
    const saved = await dataStore.saveDocument(newDocument);

    // Create an event for the patient event history
    try {
      const eventData = {
        _id: `EVT_${Date.now()}`,
        patientId: patientId,
        eventType: 'prescription_uploaded',
        title: 'Prescription PDF Uploaded',
        description: `Prescription PDF "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB) uploaded by ${newDocument.uploadedBy}.`,
        timestamp: new Date().toISOString(),
        metadata: {
          documentId: docId,
          fileName: file.originalname,
          fileUrl: newDocument.fileUrl,
          documentType: documentType
        }
      };
      if (typeof dataStore.createEvent === 'function') {
        await dataStore.createEvent(eventData);
      }
    } catch (evtErr) {
      console.error('Error logging event for document upload:', evtErr.message);
    }

    return saved;
  },

  /**
   * List all documents or filter by patientId
   */
  async getAllDocuments(patientId = null) {
    return await dataStore.listDocuments(patientId);
  },

  /**
   * Retrieve discharge document strictly for a patient
   */
  async getDocumentByPatientId(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    // Verify patient exists
    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const document = await dataStore.getDocumentByPatient(patientId);
    if (!document) {
      throw { statusCode: 404, message: `Discharge document not found for patient '${patientId}'` };
    }

    // Strict patient isolation check
    if (document.patientId !== patientId) {
      throw { statusCode: 403, message: 'Access denied: document does not belong to patient' };
    }

    return document;
  },

  /**
   * Retrieve document by ID with patient isolation verification
   */
  async getDocumentById(documentId, patientId = null) {
    if (!documentId) {
      throw { statusCode: 400, message: 'documentId is required' };
    }

    const document = await dataStore.getDocumentById(documentId, patientId);
    if (!document) {
      throw {
        statusCode: 404,
        message: patientId
          ? `Document '${documentId}' not found for patient '${patientId}'`
          : `Document '${documentId}' not found`
      };
    }

    return document;
  }
};

module.exports = documentService;
