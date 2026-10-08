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
  }
};

module.exports = nurseController;
