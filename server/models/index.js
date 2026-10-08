/**
 * Canonical Mongoose models registry for CareBridge / MediBuddy
 */

const Patient = require('./patient.model');
const Document = require('./document.model');
const ExtractedItem = require('./extractedItem.model');
const Task = require('./task.model');
const MedicationReminder = require('./medicationReminder.model');
const Event = require('./event.model');
const QuizSession = require('./quizSession.model');
const QuizQuestion = require('./quizQuestion.model');
const QuizAnswer = require('./quizAnswer.model');
const PatientInsight = require('./patientInsight.model');
const NurseBrief = require('./nurseBrief.model');
const Escalation = require('./escalation.model');

module.exports = {
  Patient,
  Document,
  ExtractedItem,
  Task,
  MedicationReminder,
  Event,
  QuizSession,
  QuizQuestion,
  QuizAnswer,
  PatientInsight,
  NurseBrief,
  Escalation
};
