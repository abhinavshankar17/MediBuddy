const { nurseService, dataStore } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for Nurse Dashboard Operations (Feature 8)
 */
const nurseController = {
  /**
   * GET /api/nurse/dashboard
   * GET /api/nurse/patients
   * Retrieve aggregate nurse dashboard overview for all patients
   */
  async getDashboard(req, res, next) {
    try {
      const { priority, caregiverId, recoveryPhase, search } = req.query;

      const dashboardData = await nurseService.getNurseDashboard({
        priority,
        caregiverId,
        recoveryPhase,
        search
      });

      return successResponse(
        res,
        dashboardData,
        `Nurse dashboard retrieved successfully (${dashboardData.totalPatients} patients)`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/nurse/dashboard/patient/:id
   * GET /api/nurse/dashboard/:id
   * GET /api/nurse/patients/:id
   * Retrieve detailed dashboard view for a single patient
   */
  async getPatientDetail(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id;

      const detail = await nurseService.getPatientDetail(patientId);

      return successResponse(
        res,
        detail,
        `Nurse dashboard detail for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/nurse/briefs
   * GET /api/nurse/briefs/:patientId
   * Retrieve nurse briefs
   */
  async getBriefs(req, res, next) {
    try {
      const patientId = req.params.patientId;
      if (patientId) {
        const brief = await dataStore.getNurseBriefByPatient(patientId);
        if (!brief) {
          throw { statusCode: 404, message: `Nurse brief for patient '${patientId}' not found` };
        }
        return successResponse(
          res,
          brief,
          `Nurse brief for patient ${patientId} retrieved successfully`
        );
      }

      const briefs = await dataStore.getNurseBriefs();
      return successResponse(
        res,
        briefs,
        `Nurse briefs retrieved successfully (${briefs.length} briefs)`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/nurse/ai-summary
   * GET /api/nurse/ai-summary/:patientId
   * GET /api/nurse/patients/:id/ai-summary
   * GET /api/nurse/patients/:id/summary
   * GET /api/nurse/dashboard/:id/ai-summary
   * GET /api/patients/:id/nurse-ai-summary
   * Retrieve Nurse AI Summary combining medication adherence, medication events,
   * quiz performance, quiz answers, knowledge gaps, verified instructions, escalations
   */
  async getAISummary(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId;
      if (!patientId) {
        throw { statusCode: 400, message: 'patientId parameter or query is required' };
      }

      const summary = await nurseService.getNurseAISummary(patientId);

      return successResponse(
        res,
        summary,
        `Nurse AI Summary for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/nurse/ai-summary/generate
   * POST /api/nurse/patients/:id/ai-summary/generate
   * POST /api/patients/:id/nurse-ai-summary/generate
   * Generate fresh grounded Nurse AI Summary for patient
   */
  async generateAISummary(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.body.patientId;
      if (!patientId) {
        throw { statusCode: 400, message: 'patientId parameter or body is required' };
      }

      const summary = await nurseService.generateNurseAISummary(patientId);

      return successResponse(
        res,
        summary,
        `Nurse AI Summary for patient ${patientId} generated successfully`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = nurseController;
