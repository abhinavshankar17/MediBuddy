const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const reminderController = require('../controllers/reminder.controller');
const eventController = require('../controllers/event.controller');
const adherenceController = require('../controllers/adherence.controller');
const quizController = require('../controllers/quiz.controller');
const insightController = require('../controllers/insight.controller');
const nurseController = require('../controllers/nurse.controller');
const escalationController = require('../controllers/escalation.controller');
const feedbackController = require('../controllers/feedback.controller');

/**
 * Patient Routes (/api/patients)
 */

// List patients (supports ?caregiverId=..., ?language=..., ?recoveryPhase=...)
router.get('/', patientController.getPatients);

// Patient Profile & Baseline Recovery Information
router.get('/:id', patientController.getPatientById);

// Patient Language Preference
router.get('/:id/language', patientController.getPatientLanguage);
router.put('/:id/language', patientController.updatePatientLanguage);
router.patch('/:id/language', patientController.updatePatientLanguage);

// Patient Recovery Information
router.get('/:id/recovery', patientController.getPatientRecovery);

// Patient Tasks (Strictly isolated by patientId)
router.get('/:id/tasks', patientController.getPatientTasks);

// Patient Discharge Summary Document
router.get('/:id/document', patientController.getPatientDocument);

// Patient Verified Extracted Instructions (medication, dose, frequency, timing, duration, activity, restriction, diet, wound care, follow-up, warning signs)
router.get('/:id/instructions', patientController.getPatientInstructions);

// Full Patient Discharge Summary Package
router.get('/:id/discharge-summary', patientController.getPatientDischargeSummary);

// Feature 3: Nested Medication Reminders for Patient
router.get('/:patientId/reminders', reminderController.getReminders);
router.get('/:patientId/medication-reminders', reminderController.getReminders);
router.get('/:patientId/reminders/:id/status', reminderController.getReminderStatus);
router.get('/:patientId/reminders/:id', reminderController.getReminderById);
router.get('/:patientId/medication-reminders/:id', reminderController.getReminderById);
router.post('/:patientId/reminders/:id/confirm', reminderController.confirmMedication);
router.post('/:patientId/medication-reminders/:id/confirm', reminderController.confirmMedication);

// Feature 4: Nested Medication Events & Adherence for Patient
router.get('/:patientId/adherence', adherenceController.getAdherence);
router.get('/:patientId/events/medication', eventController.getMedicationEvents);
router.get('/:patientId/events', eventController.getEvents);
router.post('/:patientId/events', eventController.trackEvent);

// Feature 5: Nested Daily Quiz for Patient
router.get('/:patientId/quiz/today', quizController.getTodayQuiz);
router.get('/:patientId/quiz-session', quizController.getTodayQuiz);
router.post('/:patientId/quiz/start', quizController.startQuiz);
router.get('/:patientId/quiz/sessions/:id/questions', quizController.getQuizQuestions);
router.post('/:patientId/quiz/sessions/:id/submit', quizController.submitQuiz);
router.post('/:patientId/quiz-sessions/:id/submit', quizController.submitQuiz);

// Feature 6: Nested Daily Quiz Answer & Educational Score
router.post('/:patientId/quiz/sessions/:id/answer', quizController.recordAnswer);
router.get('/:patientId/quiz/sessions/:id/score', quizController.getQuizScore);

// Feature 7: Nested Patient Insights & Educational Grounding
router.get('/:id/insight', insightController.getLatestInsight);
router.get('/:id/insights/latest', insightController.getLatestInsight);
router.get('/:id/insights', insightController.getPatientInsights);
router.get('/:patientId/insights/:id', insightController.getInsightById);
router.post('/:id/insight/generate', insightController.generateInsight);
router.post('/:id/insights/generate', insightController.generateInsight);

// Feature 8: Nested Nurse Dashboard Patient Summary
router.get('/:id/nurse-dashboard', nurseController.getPatientDetail);

// Feature 9: Nested Nurse AI Summary for Patient
router.get('/:id/nurse-ai-summary', nurseController.getAISummary);
router.get('/:id/nurse-summary', nurseController.getAISummary);
router.post('/:id/nurse-ai-summary/generate', nurseController.generateAISummary);

// Feature 10: Nested Patient Escalations
router.get('/:id/escalations', escalationController.getPatientEscalations);
router.post('/:id/escalations', escalationController.createEscalation);
router.post('/:id/escalations/evaluate', escalationController.evaluateEscalations);

// Feature: Patient Condition Feedback & Appointment Booking
router.get('/:id/feedback', feedbackController.getPatientFeedbacks);
router.post('/:id/feedback', feedbackController.submitFeedback);
router.delete('/:id/feedback', feedbackController.clearPatientFeedbacks);
router.get('/:id/appointments/slots', feedbackController.getAvailableSlots);
router.get('/:id/appointments', feedbackController.getPatientAppointments);
router.post('/:id/appointments', feedbackController.bookAppointment);

module.exports = router;
