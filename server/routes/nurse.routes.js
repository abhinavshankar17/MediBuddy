const express = require('express');
const router = express.Router();
const nurseController = require('../controllers/nurse.controller');
const escalationController = require('../controllers/escalation.controller');

/**
 * Nurse Dashboard Routes (/api/nurse)
 */

// Aggregate nurse dashboard overview (supports ?priority=..., ?caregiverId=..., ?search=...)
router.get('/dashboard', nurseController.getDashboard);

// Patient list monitoring view (alias to dashboard list)
router.get('/patients', nurseController.getDashboard);

// Single patient detailed dashboard view
router.get('/dashboard/patient/:id', nurseController.getPatientDetail);
router.get('/dashboard/:id', nurseController.getPatientDetail);
router.get('/patients/:id', nurseController.getPatientDetail);

// Nurse briefs
router.get('/briefs/:patientId', nurseController.getBriefs);
router.get('/briefs', nurseController.getBriefs);

// Feature 9: Nurse AI Summary
router.get('/ai-summary', nurseController.getAISummary);
router.get('/ai-summary/:patientId', nurseController.getAISummary);
router.get('/patients/:id/ai-summary', nurseController.getAISummary);
router.get('/patients/:id/summary', nurseController.getAISummary);
router.get('/dashboard/:id/ai-summary', nurseController.getAISummary);
router.post('/ai-summary/generate', nurseController.generateAISummary);
router.post('/patients/:id/ai-summary/generate', nurseController.generateAISummary);

// Feature 10: Nurse Escalation Management
router.get('/escalations', escalationController.getEscalations);
router.get('/patients/:id/escalations', escalationController.getPatientEscalations);
router.patch('/escalations/:id', escalationController.updateEscalation);

module.exports = router;
