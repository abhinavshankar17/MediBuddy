const { adherenceService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for medication adherence calculations
 */
const adherenceController = {
  /**
   * GET /api/adherence
   * GET /api/patients/:patientId/adherence
   * Calculate adherence metrics for a patient (total, confirmed, notConfirmed, missed)
   */
  async getAdherence(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId;
      const metrics = await adherenceService.calculateAdherence(patientId);
      return successResponse(
        res,
        metrics,
        `Medication adherence for patient ${patientId} calculated successfully`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = adherenceController;
