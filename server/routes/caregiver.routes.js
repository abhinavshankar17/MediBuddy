const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiver.controller');
const dataStore = require('../services/dataStore');

/**
 * Caregiver & Family Dashboard Routes (/api/caregiver)
 */

// 1. Linked Patients
router.get('/patients', caregiverController.getCaregiverPatients);

// 2. Daily Report
router.get('/patients/:patientId/daily-report', caregiverController.getDailyReport);
router.get('/daily-report/:patientId', caregiverController.getDailyReport);
router.get('/daily-report', caregiverController.getDailyReport);

// 3. Recovery Calendar
router.get('/patients/:patientId/calendar', caregiverController.getCalendarData);
router.get('/calendar/:patientId', caregiverController.getCalendarData);
router.get('/calendar', caregiverController.getCalendarData);

// 4. Patient Feedback Review
router.get('/patients/:patientId/feedback', caregiverController.getPatientFeedbacks);
router.get('/feedback/:patientId', caregiverController.getPatientFeedbacks);
router.get('/feedback', caregiverController.getPatientFeedbacks);
router.post('/patients/:patientId/feedback/:feedbackId/review', caregiverController.reviewFeedback);
router.post('/feedback/:feedbackId/review', caregiverController.reviewFeedback);

// 5. Encouragement & Messages
router.get('/patients/:patientId/encouragement', caregiverController.getPatientEncouragements);
router.get('/patients/:patientId/encouragements', caregiverController.getPatientEncouragements);
router.get('/encouragement/:patientId', caregiverController.getPatientEncouragements);
router.post('/patients/:patientId/encouragement', caregiverController.sendEncouragement);
router.post('/encouragement', caregiverController.sendEncouragement);

module.exports = router;
