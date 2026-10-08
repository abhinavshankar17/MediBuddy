const { documentService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for document endpoints
 */
const documentController = {
  /**
   * GET /api/documents/patient/:patientId
   * Retrieve the discharge document for a specific patient
   */
  async getDocumentByPatientId(req, res, next) {
    try {
      const { patientId } = req.params;
      const document = await documentService.getDocumentByPatientId(patientId);
      return successResponse(res, document, `Discharge document for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/documents/:id
   * Retrieve document by its ID with patientId isolation verification
   */
  async getDocumentById(req, res, next) {
    try {
      const documentId = req.params.id;
      const { patientId } = req.query;
      const document = await documentService.getDocumentById(documentId, patientId);
      return successResponse(res, document, `Document ${documentId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = documentController;
