const dataStore = require('./dataStore');

/**
 * Service for discharge documents and clinical records
 */
const documentService = {
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
