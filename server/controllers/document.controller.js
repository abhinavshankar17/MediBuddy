const { documentService } = require('../services');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Controller for document and prescription endpoints
 */
const documentController = {
  /**
   * POST /api/documents/upload or /api/nurse/prescriptions/upload
   * Upload real PDF prescription or discharge summary
   */
  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No PDF file uploaded. Please attach a .pdf file under the "file" field.', 400);
      }

      const document = await documentService.uploadDocument({
        file: req.file,
        body: req.body
      });

      return successResponse(
        res,
        document,
        `Prescription PDF "${req.file.originalname}" uploaded and processed successfully`,
        201
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/documents or /api/nurse/prescriptions
   * List all documents or filter by ?patientId=...
   */
  async getAllDocuments(req, res, next) {
    try {
      const { patientId } = req.query;
      const documents = await documentService.getAllDocuments(patientId);
      return successResponse(res, documents, 'Documents retrieved successfully');
    } catch (err) {
      return next(err);
    }
  },

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
