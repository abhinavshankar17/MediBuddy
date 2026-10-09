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
  },

  /**
   * PUT / PATCH /api/patients/:id/language
   * Update the patient's preferred language ('en', 'hi', 'ta')
   */
  async updatePatientLanguage(req, res, next) {
    try {
      const patientId = req.params.id;
      const { language } = req.body;
      const validLangs = ['en', 'hi', 'ta'];
      if (!language || !validLangs.includes(language)) {
        return res.status(400).json({
          success: false,
          error: `Invalid language '${language}'. Supported languages: ${validLangs.join(', ')}`
        });
      }
      const updated = await patientService.updatePatientLanguage(patientId, language);
      return successResponse(res, updated, `Language preference updated to '${language}'`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/language
   * Get the patient's preferred language
   */
  async getPatientLanguage(req, res, next) {
    try {
      const patientId = req.params.id;
      const patient = await patientService.getPatientById(patientId);
      return successResponse(
        res,
        {
          language: patient.language || 'en',
          availableLanguages: ['en', 'hi', 'ta']
        },
        `Language preference for patient ${patientId} retrieved`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = patientController;
