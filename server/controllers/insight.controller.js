const { insightService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for Patient Insights (Feature 7)
 */
const insightController = {
  /**
   * GET /api/patients/:patientId/insight
   * GET /api/patients/:patientId/insights/latest
   * GET /api/insights/latest?patientId=...
   * Retrieve the latest grounded patient insight
   */
  async getLatestInsight(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId;
      const { regenerate, language } = req.query;

      const insight = await insightService.getLatestInsight(patientId, {
        regenerate: regenerate === 'true',
        language
      });

      return successResponse(
        res,
        insight,
        `Patient insight for ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:patientId/insights
   * GET /api/insights?patientId=...
   * Retrieve all insights for a patient
   */
  async getPatientInsights(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId;
      const { language } = req.query;

      const insights = await insightService.getPatientInsights(patientId, { language });

      return successResponse(
        res,
        insights,
        `Patient insights for ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/insights/:id
   * GET /api/patients/:patientId/insights/:id
   * Retrieve single insight by ID with patient isolation
   */
  async getInsightById(req, res, next) {
    try {
      const insightId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;

      const insight = await insightService.getInsightById(insightId, patientId);

      return successResponse(
        res,
        insight,
        `Patient insight ${insightId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/patients/:patientId/insights/generate
   * POST /api/insights/generate
   * Dynamically generate fresh insight strictly grounded on patient's records
   */
  async generateInsight(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.body.patientId || req.query.patientId;

      const insight = await insightService.generateInsight(patientId);

      return successResponse(
        res,
        insight,
        `Fresh patient insight generated successfully for ${patientId}`,
        201
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = insightController;
