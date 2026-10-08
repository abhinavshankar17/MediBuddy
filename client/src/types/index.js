/**
 * @typedef {Object} Patient
 * @property {string} id
 * @property {string} name
 * @property {string} age
 * @property {string} gender
 * @property {string} condition
 * @property {string} dischargeDate
 */

/**
 * @typedef {Object} MedicationReminder
 * @property {string} id
 * @property {string} patientId
 * @property {string} name
 * @property {string} dosage
 * @property {string} frequency
 * @property {string} status
 */

/**
 * @typedef {Object} QuizSession
 * @property {string} id
 * @property {string} patientId
 * @property {number} score
 * @property {string} status
 */

export const PORTAL_TYPES = {
  PATIENT: 'PATIENT',
  NURSE: 'NURSE'
};
