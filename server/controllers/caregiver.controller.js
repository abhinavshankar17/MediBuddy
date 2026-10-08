const caregiverService = require('../services/caregiver.service');
const { successResponse } = require('../utils/response');

const caregiverController = {
  /**
   * GET /api/caregiver/patients
   * List all patients cared for by the current caregiver
   */
  async getCaregiverPatients(req, res, next) {
    try {
      const caregiverId = req.query.caregiverId || req.user?._id || 'U101';
      const result = await caregiverService.getCaregiverPatients(caregiverId);
      return successResponse(res, result, 'Caregiver patients retrieved successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/caregiver/patients/:patientId/daily-report
   * GET /api/caregiver/daily-report/:patientId
   * Retrieve executive Daily Report for a loved one
   */
  async getDailyReport(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId || 'P001';
      const caregiverId = req.query.caregiverId || req.user?._id || 'U101';
      const report = await caregiverService.getDailyReport(patientId, caregiverId);
      return successResponse(res, report, `Daily report for ${report.patient.name} generated successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/caregiver/patients/:patientId/calendar
   * GET /api/caregiver/calendar/:patientId
   * Retrieve patient recovery calendar timeline
   */
  async getCalendarData(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId || 'P001';
      const year = parseInt(req.query.year, 10) || 2026;
      const month = parseInt(req.query.month, 10) || 10;
      const calendar = await caregiverService.getCalendarData(patientId, year, month);
      return successResponse(res, calendar, `Calendar data for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/caregiver/patients/:patientId/feedback
   * GET /api/caregiver/feedback/:patientId
   * Retrieve feedbacks submitted by the patient for review
   */
  async getPatientFeedbacks(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId || 'P001';
      const feedbacks = await caregiverService.getPatientFeedbacks(patientId);
      return successResponse(res, feedbacks, `Feedbacks for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/caregiver/patients/:patientId/feedback/:feedbackId/review
   * Caregiver reviews, acknowledges, and comments on patient feedback
   */
  async reviewFeedback(req, res, next) {
    try {
      const { patientId, feedbackId } = req.params;
      const updated = await caregiverService.reviewFeedback(patientId, feedbackId, req.body);
      return successResponse(res, updated, 'Patient feedback reviewed and acknowledged successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/caregiver/patients/:patientId/encouragement
   * Caregiver sends encouragement message to patient
   */
  async sendEncouragement(req, res, next) {
    try {
      const patientId = req.params.patientId || req.body.patientId;
      const encouragement = await caregiverService.sendEncouragement(patientId, req.body);
      return successResponse(res, encouragement, 'Caregiver encouragement sent successfully', 201);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/caregiver/patients/:patientId/encouragement
   * GET /api/patients/:id/encouragements
   * Retrieve encouragement messages sent by caregivers to the patient
   */
  async getPatientEncouragements(req, res, next) {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId || 'P001';
      const encouragements = await caregiverService.getPatientEncouragements(patientId);
      return successResponse(res, encouragements, `Encouragements for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = caregiverController;
