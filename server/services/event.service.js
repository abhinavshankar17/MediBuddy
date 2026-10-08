const dataStore = require('./dataStore');

const SUPPORTED_MEDICATION_EVENT_TYPES = [
  'reminder_sent',
  'reminder_opened',
  'medication_taken',
  'medication_not_taken',
  'medication_missed',
  'medication_acknowledged'
];

/**
 * Service for event tracking and querying with strict patient isolation
 */
const eventService = {
  /**
   * Retrieve events for a patient with patient isolation
   */
  async getEvents(patientId, options = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId query parameter is required for patient isolation' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const events = await dataStore.getEventsByPatient(patientId, options);
    // Double check patient isolation: every event MUST belong to patientId
    return events.filter(e => e.patientId === patientId);
  },

  /**
   * Retrieve medication-related events for a patient
   */
  async getMedicationEvents(patientId, options = {}) {
    return await this.getEvents(patientId, { ...options, medicationOnly: true });
  },

  /**
   * Retrieve single event by ID with patient isolation verification
   */
  async getEventById(eventId, patientId = null) {
    if (!eventId) {
      throw { statusCode: 400, message: 'eventId is required' };
    }

    const event = await dataStore.getEventById(eventId, patientId);
    if (!event) {
      throw {
        statusCode: 404,
        message: patientId
          ? `Event '${eventId}' not found for patient '${patientId}'`
          : `Event '${eventId}' not found`
      };
    }

    return event;
  },

  /**
   * Track a medication event with full traceability
   * @param {Object} data { patientId, type, reminderId, taskId, payload, timestamp, actor, source }
   */
  async trackEvent(data = {}) {
    const { patientId, type, reminderId, taskId, payload = {}, timestamp, actor, source } = data;

    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required to record an event' };
    }

    if (!type) {
      throw { statusCode: 400, message: 'Event type is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    // Verify reminder if reminderId is provided
    let reminder = null;
    if (reminderId) {
      reminder = await dataStore.getReminderById(reminderId, patientId);
      if (!reminder) {
        throw {
          statusCode: 403,
          message: `Forbidden: Reminder '${reminderId}' does not belong to patient '${patientId}'`
        };
      }
    }

    // Ensure traceability payload
    const eventPayload = {
      ...payload,
      source: source || payload.source || 'patient_app',
      medicationName: reminder ? reminder.medicationName : payload.medicationName,
      dose: reminder ? reminder.dose : payload.dose,
      scheduledAt: reminder ? reminder.scheduledAt : payload.scheduledAt
    };

    const eventRecord = {
      _id: `E${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
      patientId,
      type,
      reminderId: reminderId || null,
      taskId: taskId || null,
      payload: eventPayload,
      timestamp: timestamp || new Date().toISOString(),
      actor: actor || patientId
    };

    return await dataStore.addEvent(eventRecord);
  }
};

module.exports = eventService;
