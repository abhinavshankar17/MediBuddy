const { patientService, documentService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for patient routes
 */
const patientController = {
  /**
   * GET /api/patients
   * List all patients with optional filter
   */
  async getPatients(req, res, next) {
    try {
      const { caregiverId, language, recoveryPhase } = req.query;
      const patients = await patientService.getPatients({ caregiverId, language, recoveryPhase });
      return successResponse(res, patients, 'Patients retrieved successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id
   * Retrieve full patient profile
   */
  async getPatientById(req, res, next) {
    try {
      const patientId = req.params.id;
      const patient = await patientService.getPatientById(patientId);
      return successResponse(res, patient, `Patient profile for ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/recovery
   * Retrieve recovery-specific information
   */
  async getPatientRecovery(req, res, next) {
    try {
      const patientId = req.params.id;
      const recoveryInfo = await patientService.getRecoveryInfo(patientId);
      return successResponse(res, recoveryInfo, `Recovery information for ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/tasks
   * Retrieve relevant tasks for this patient
   */
  async getPatientTasks(req, res, next) {
    try {
      const patientId = req.params.id;
      const { status, priority } = req.query;
      const tasks = await patientService.getPatientTasks(patientId, { status, priority });
      return successResponse(res, tasks, `Tasks for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/document
   * Retrieve the patient's discharge summary document
   */
  async getPatientDocument(req, res, next) {
    try {
      const patientId = req.params.id;
      const document = await documentService.getDocumentByPatientId(patientId);
      return successResponse(res, document, `Discharge document for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/instructions
   * Retrieve verified extracted clinical instructions for this patient
   */
  async getPatientInstructions(req, res, next) {
    try {
      const patientId = req.params.id;
      const { type, status, verifiedOnly } = req.query;
      const instructions = await patientService.getPatientInstructions(patientId, {
        type,
        status,
        verifiedOnly: verifiedOnly !== 'false' // default to verified unless explicitly 'false'
      });
      return successResponse(
        res,
        instructions,
        `Verified extracted instructions for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/discharge-summary
   * Retrieve aggregated discharge information (document + verified instructions + recovery)
   */
  async getPatientDischargeSummary(req, res, next) {
    try {
      const patientId = req.params.id;
      const summary = await patientService.getDischargeSummary(patientId);
      return successResponse(
        res,
        summary,
        `Discharge summary package for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = patientController;
