const dataStore = require('./dataStore');

/**
 * Helper to compute standardized semantic confirmation status
 * STRICT SEMANTIC RULE: If no_response, must represent as 'not confirmed', NOT 'not taken'.
 */
const computeConfirmationStatus = (reminder) => {
  if (reminder.status === 'taken' || reminder.responseType === 'taken') {
    return 'confirmed';
  }
  if (reminder.responseType === 'no_response') {
    return 'not confirmed';
  }
  if (reminder.responseType === 'not_taken') {
    return 'not taken';
  }
  if (reminder.responseType === 'dismissed') {
    return 'dismissed';
  }
  return 'pending';
};

/**
 * Service for medication reminders management
 */
const reminderService = {
  /**
   * Retrieve reminders for a patient with patient isolation
   */
  async getReminders(patientId, options = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId query parameter is required for patient isolation' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const reminders = await dataStore.getRemindersByPatient(patientId, options);
    const extractedItems = await dataStore.getExtractedItemsByPatient(patientId, { all: true });

    // Strict patient isolation assertion and enrichment
    return reminders
      .filter(r => r.patientId === patientId)
      .map(reminder => {
        const item = extractedItems.find(i => i._id === reminder.extractedItemId);
        return {
          ...reminder,
          confirmationStatus: computeConfirmationStatus(reminder),
          isConfirmed: reminder.status === 'taken' || reminder.responseType === 'taken',
          instructionDetails: item ? {
            foodRelation: item.foodRelation || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            sourceSentence: item.sourceSentence || null
          } : null
        };
      });
  },

  /**
   * Retrieve a single reminder by ID with patient isolation check
   */
  async getReminderById(reminderId, patientId = null) {
    if (!reminderId) {
      throw { statusCode: 400, message: 'reminderId is required' };
    }

    const reminder = await dataStore.getReminderById(reminderId);
    if (!reminder) {
      throw { statusCode: 404, message: `Medication reminder with ID '${reminderId}' not found` };
    }

    // Patient isolation check
    if (patientId && reminder.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized to access reminder '${reminderId}'`
      };
    }

    const extractedItems = await dataStore.getExtractedItemsByPatient(reminder.patientId, { all: true });
    const item = extractedItems.find(i => i._id === reminder.extractedItemId);

    return {
      ...reminder,
      confirmationStatus: computeConfirmationStatus(reminder),
      isConfirmed: reminder.status === 'taken' || reminder.responseType === 'taken',
      instructionDetails: item ? {
        foodRelation: item.foodRelation || null,
        frequency: item.frequency || null,
        duration: item.duration || null,
        sourceSentence: item.sourceSentence || null
      } : null
    };
  },

  /**
   * Retrieve reminder status summary
   */
  async getReminderStatus(reminderId, patientId = null) {
    const reminder = await this.getReminderById(reminderId, patientId);

    return {
      reminderId: reminder._id,
      patientId: reminder.patientId,
      medicationName: reminder.medicationName,
      dose: reminder.dose,
      scheduledAt: reminder.scheduledAt,
      status: reminder.status,
      responseType: reminder.responseType,
      confirmationStatus: reminder.confirmationStatus,
      isConfirmed: reminder.isConfirmed,
      reminderSentAt: reminder.reminderSentAt,
      respondedAt: reminder.respondedAt
    };
  },

  /**
   * Confirm or record a patient response to a medication reminder
   * @param {string} reminderId 
   * @param {Object} payload { patientId, response, respondedAt, notes }
   */
  async confirmMedication(reminderId, payload = {}) {
    if (!reminderId) {
      throw { statusCode: 400, message: 'reminderId is required' };
    }

    const { patientId, response, respondedAt } = payload;

    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required for confirmation' };
    }

    const reminder = await dataStore.getReminderById(reminderId);
    if (!reminder) {
      throw { statusCode: 404, message: `Medication reminder with ID '${reminderId}' not found` };
    }

    // Patient isolation check
    if (reminder.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized to confirm reminder '${reminderId}' (belongs to ${reminder.patientId})`
      };
    }

    // Supported patient responses
    const validResponses = ['taken', 'not_taken', 'dismissed', 'no_response'];
    if (!response || !validResponses.includes(response)) {
      throw {
        statusCode: 400,
        message: `Invalid response: '${response}'. Supported responses: ${validResponses.join(', ')}`
      };
    }

    // Check for duplicate confirmation / already completed reminder
    if (reminder.status === 'taken' || reminder.responseType === 'taken') {
      throw {
        statusCode: 409,
        message: `Reminder '${reminderId}' has already been completed and confirmed as taken`
      };
    }

    const now = respondedAt || new Date().toISOString();
    let updatedFields = {};
    let eventType = null;
    let eventPayload = {
      medicationName: reminder.medicationName,
      dose: reminder.dose,
      scheduledAt: reminder.scheduledAt,
      responseType: response
    };

    if (response === 'taken') {
      updatedFields = {
        status: 'taken',
        responseType: 'taken',
        respondedAt: now
      };
      eventType = 'medication_taken';
      eventPayload.responseTime = now;
    } else if (response === 'not_taken') {
      updatedFields = {
        status: 'missed',
        responseType: 'not_taken',
        respondedAt: now
      };
      eventType = 'medication_not_taken';
      eventPayload.responseTime = now;
    } else if (response === 'dismissed') {
      updatedFields = {
        status: reminder.status === 'scheduled' ? 'reminded' : reminder.status,
        responseType: 'dismissed',
        respondedAt: now
      };
      eventType = 'reminder_dismissed';
      eventPayload.responseTime = now;
    } else if (response === 'no_response') {
      // CRITICAL SEMANTIC RULE:
      // If no_response, the system must represent the medication as 'not confirmed'.
      // It must NOT automatically claim 'not taken'.
      updatedFields = {
        status: reminder.status === 'scheduled' ? 'overdue' : reminder.status,
        responseType: 'no_response',
        respondedAt: null
      };
      eventType = 'medication_not_taken';
      eventPayload.note = 'not confirmed';
    }

    // Persist update
    const updated = await dataStore.updateReminder(reminderId, updatedFields);

    // Create audit event in events collection
    await dataStore.addEvent({
      patientId,
      type: eventType,
      reminderId,
      payload: eventPayload,
      timestamp: now,
      actor: response === 'no_response' ? 'system' : patientId
    });

    const confirmationStatus = computeConfirmationStatus(updated);

    return {
      ...updated,
      confirmationStatus,
      isConfirmed: updated.status === 'taken' || updated.responseType === 'taken'
    };
  }
};

module.exports = reminderService;
