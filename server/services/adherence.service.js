const dataStore = require('./dataStore');

/**
 * Service for calculating medication adherence metrics without medical judgment
 */
const adherenceService = {
  /**
   * Calculate adherence metrics for a specific patient
   * @param {string} patientId 
   */
  async calculateAdherence(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required to calculate adherence' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    // Get all reminders strictly belonging to this patient
    const reminders = await dataStore.getRemindersByPatient(patientId);
    const isolatedReminders = reminders.filter(r => r.patientId === patientId);

    let confirmed = 0;
    let notConfirmed = 0;
    let missed = 0;

    const byMedication = {};

    for (const reminder of isolatedReminders) {
      const medName = reminder.medicationName || 'Unknown';
      if (!byMedication[medName]) {
        byMedication[medName] = { total: 0, confirmed: 0, notConfirmed: 0, missed: 0 };
      }
      byMedication[medName].total++;

      // 1. Confirmed taken
      if (reminder.status === 'taken' || reminder.responseType === 'taken') {
        confirmed++;
        byMedication[medName].confirmed++;
      }
      // 2. CRITICAL SEMANTIC RULE:
      // If no_response, the system must represent the medication as 'not confirmed'.
      // It must NOT automatically claim 'not taken'.
      else if (reminder.responseType === 'no_response') {
        notConfirmed++;
        byMedication[medName].notConfirmed++;
      }
      // 3. Explicitly recorded as not taken
      else if (reminder.responseType === 'not_taken') {
        missed++;
        byMedication[medName].missed++;
      }
      // 4. Status missed (where responseType is not no_response)
      else if (reminder.status === 'missed') {
        missed++;
        byMedication[medName].missed++;
      }
      // 5. Dismissed / overdue / scheduled / reminded (awaiting confirmation)
      else {
        notConfirmed++;
        byMedication[medName].notConfirmed++;
      }
    }

    const total = isolatedReminders.length;
    const adherenceRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    return {
      patientId,
      total,
      confirmed,
      notConfirmed,
      missed,
      adherenceRate,
      byMedication
    };
  }
};

module.exports = adherenceService;
