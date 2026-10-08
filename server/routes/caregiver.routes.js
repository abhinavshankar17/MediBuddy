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
router.post('/patients/:patientId/encouragement', caregiverController.sendEncouragement);
router.post('/encouragement', caregiverController.sendEncouragement);

// 6. Real-Time Server-Sent Events (SSE) Live Stream
router.get('/patients/:patientId/live-stream', (req, res) => {
  const patientId = req.params.patientId || 'P001';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', patientId, timestamp: new Date().toISOString() })}\n\n`);

  // Subscribe to patient-specific real-time events
  const unsubscribe = dataStore.onPatientUpdate(patientId, (update) => {
    try {
      res.write(`data: ${JSON.stringify({ patientId, timestamp: new Date().toISOString(), ...update })}\n\n`);
    } catch (e) {}
  });

  // Periodic heartbeat to prevent socket timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {}
  }, 20000);

  req.on('close', () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
});

module.exports = router;
