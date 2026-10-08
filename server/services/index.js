const patientService = require('./patient.service');
const documentService = require('./document.service');
const reminderService = require('./reminder.service');
const eventService = require('./event.service');
const adherenceService = require('./adherence.service');
const { quizService, validateExactFiveQuestions } = require('./quiz.service');
const insightService = require('./insight.service');
const nurseService = require('./nurse.service');
const escalationService = require('./escalation.service');
const dataStore = require('./dataStore');

module.exports = {
  patientService,
  documentService,
  reminderService,
  eventService,
  adherenceService,
  quizService,
  validateExactFiveQuestions,
  insightService,
  nurseService,
  escalationService,
  dataStore
};
