const feedbackService = require('../services/feedback.service');
const { successResponse } = require('../utils/response');

/**
 * Controller for patient feedback & appointment routes
 */
const feedbackController = {
  /**
   * POST /api/patients/:id/feedback
   * Submit patient condition feedback
   */
  async submitFeedback(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const feedback = await feedbackService.submitFeedback(patientId, req.body);
      return successResponse(res, feedback, `Feedback submitted successfully for patient ${patientId}`, 201);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/feedback
   * Get all feedbacks for a patient
   */
  async getPatientFeedbacks(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const feedbacks = await feedbackService.getPatientFeedbacks(patientId);
      return successResponse(res, feedbacks, `Feedbacks for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/patients/:id/feedback
   * Clear all feedbacks and appointments for a patient
   */
  async clearPatientFeedbacks(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const result = await feedbackService.clearPatientFeedbacks(patientId);
      return successResponse(res, result, `History cleared successfully for patient ${patientId}`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/appointments/slots
   * Get available appointment slots based on urgency
   */
  async getAvailableSlots(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const { urgency } = req.query;
      const slots = await feedbackService.getAvailableSlots(patientId, urgency || 'mild');
      return successResponse(res, slots, `Available slots for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/patients/:id/appointments
   * Book an appointment
   */
  async bookAppointment(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const appointment = await feedbackService.bookAppointment(patientId, req.body);
      return successResponse(res, appointment, `Appointment booked successfully for patient ${patientId}`, 201);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/patients/:id/appointments
   * Get all appointments for a patient
   */
  async getPatientAppointments(req, res, next) {
    try {
      const patientId = req.params.id || req.params.patientId;
      const appointments = await feedbackService.getPatientAppointments(patientId);
      return successResponse(res, appointments, `Appointments for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = feedbackController;
