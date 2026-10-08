const { patientService } = require('../services');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Controller for task endpoints
 */
const taskController = {
  /**
   * GET /api/tasks
   * Query tasks - strictly enforces patientId to maintain patient isolation
   */
  async getTasks(req, res, next) {
    try {
      const { patientId, status, priority } = req.query;

      if (!patientId) {
        return errorResponse(
          res,
          'patientId query parameter is required to retrieve tasks (patient isolation enforced)',
          400
        );
      }

      const tasks = await patientService.getPatientTasks(patientId, { status, priority });
      return successResponse(res, tasks, `Tasks for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = taskController;
