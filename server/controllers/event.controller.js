const { eventService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for event tracking and querying
 */
const eventController = {
  /**
   * GET /api/events
   * GET /api/patients/:patientId/events
   * Retrieve events for a patient with patient isolation
   */
  async getEvents(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId;
      const { type, reminderId, medicationOnly } = req.query;
      const events = await eventService.getEvents(patientId, {
        type,
        reminderId,
        medicationOnly: medicationOnly === 'true'
      });
      return successResponse(res, events, `Events for patient ${patientId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/events/medication
   * GET /api/patients/:patientId/events/medication
   * Retrieve medication-related events for a patient
   */
  async getMedicationEvents(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId;
      const { type, reminderId } = req.query;
      const events = await eventService.getMedicationEvents(patientId, { type, reminderId });
      return successResponse(
        res,
        events,
        `Medication events for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/events/:id
   * Retrieve a single event by ID
   */
  async getEventById(req, res, next) {
    try {
      const eventId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;
      const event = await eventService.getEventById(eventId, patientId);
      return successResponse(res, event, `Event ${eventId} retrieved successfully`);
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/events
   * POST /api/events/medication
   * Track a new medication event with full traceability
   */
  async trackEvent(req, res, next) {
    try {
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      const eventData = {
        ...req.body,
        patientId
      };
      const createdEvent = await eventService.trackEvent(eventData);
      return successResponse(
        res,
        createdEvent,
        `Event '${createdEvent.type}' recorded successfully`,
        201
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = eventController;
