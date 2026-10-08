const { escalationService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for Escalation Management (Feature 10)
 */
const escalationController = {
  /**
   * GET /api/escalations
   * List all escalations with optional query filters (?patientId=..., ?category=..., ?status=..., ?priority=...)
   */
  async getEscalations(req, res, next) {
    try {
      const { patientId, category, status, priority, severity } = req.query;
      const targetPatientId = req.params.patientId || req.params.id || patientId;

      const escalations = await escalationService.getEscalations({
        patientId: targetPatientId,
        category,
        status,
        priority,
        severity
      });

      return successResponse(
        res,
        escalations,
        `Retrieved ${escalations.length} escalation(s) successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/escalations/:id
   * Retrieve single escalation by ID
   */
  async getEscalationById(req, res, next) {
    try {
      const { id } = req.params;
      const escalation = await escalationService.getEscalationById(id);

      return successResponse(
        res,
        escalation,
        `Escalation ${id} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/escalations/patient/:patientId
   * GET /api/patients/:patientId/escalations
   * Retrieve all escalations for a single patient
   */
  async getPatientEscalations(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId;
      if (!patientId) {
        throw { statusCode: 400, message: 'patientId parameter is required' };
      }

      const escalations = await escalationService.getEscalationsByPatient(patientId);

      return successResponse(
        res,
        escalations,
        `Escalations for patient ${patientId} retrieved successfully (${escalations.length} found)`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/escalations
   * POST /api/patients/:patientId/escalations
   * Create an escalation grounded in actual event/data
   */
  async createEscalation(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.body.patientId;
      const payload = {
        ...req.body,
        patientId
      };

      const escalation = await escalationService.createEscalation(payload);

      return successResponse(
        res,
        escalation,
        `Escalation created successfully for patient ${patientId}`,
        201
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/escalations/:id
   * PUT /api/escalations/:id
   * Update an existing escalation (status, resolution, priority)
   */
  async updateEscalation(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await escalationService.updateEscalation(id, req.body);

      return successResponse(
        res,
        updated,
        `Escalation ${id} updated successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/escalations/evaluate/:patientId
   * POST /api/patients/:patientId/escalations/evaluate
   * Evaluate and detect potential escalations based on patient's actual events/data
   */
  async evaluateEscalations(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.body.patientId;
      if (!patientId) {
        throw { statusCode: 400, message: 'patientId parameter is required' };
      }

      const result = await escalationService.evaluateEscalations(patientId);

      return successResponse(
        res,
        result,
        `Escalation evaluation completed for patient ${patientId}`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = escalationController;
