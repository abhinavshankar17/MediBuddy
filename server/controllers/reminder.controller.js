const { reminderService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for medication reminders
 */
const reminderController = {
  /**
   * GET /api/reminders
   * GET /api/patients/:patientId/reminders
   * Retrieve reminders for a patient
   */
  async getReminders(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId;
      const { status } = req.query;
      const reminders = await reminderService.getReminders(patientId, { status });
      return successResponse(res, reminders, `Reminders for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/reminders/:id
   * GET /api/patients/:patientId/reminders/:id
   * Retrieve a single reminder by ID
   */
  async getReminderById(req, res, next) {
    try {
      const reminderId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;
      const reminder = await reminderService.getReminderById(reminderId, patientId);
      return successResponse(res, reminder, `Reminder ${reminderId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/reminders/:id/status
   * GET /api/patients/:patientId/reminders/:id/status
   * Retrieve reminder status and confirmation details
   */
  async getReminderStatus(req, res, next) {
    try {
      const reminderId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;
      const statusData = await reminderService.getReminderStatus(reminderId, patientId);
      return successResponse(res, statusData, `Status for reminder ${reminderId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/reminders/:id/confirm
   * PATCH /api/reminders/:id/confirm
   * POST /api/patients/:patientId/reminders/:id/confirm
   * Confirm or record patient response to a medication reminder
   */
  async confirmMedication(req, res, next) {
    try {
      const reminderId = req.params.id;
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      const { response, respondedAt, notes } = req.body;

      const updated = await reminderService.confirmMedication(reminderId, {
        patientId,
        response,
        respondedAt,
        notes
      });

      return successResponse(
        res,
        updated,
        `Medication response '${response}' recorded for reminder ${reminderId}`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = reminderController;
