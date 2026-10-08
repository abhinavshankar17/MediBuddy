const express = require('express');
const router = express.Router();
const escalationController = require('../controllers/escalation.controller');

/**
 * Escalation Routes (/api/escalations)
 */

// List escalations (supports ?patientId=..., ?category=..., ?status=..., ?priority=...)
router.get('/', escalationController.getEscalations);

// Evaluate/detect escalations for a patient from actual records
router.post('/evaluate/:patientId', escalationController.evaluateEscalations);

// Retrieve all escalations for a single patient
router.get('/patient/:patientId', escalationController.getPatientEscalations);

// Retrieve single escalation by ID
router.get('/:id', escalationController.getEscalationById);

// Create an escalation
router.post('/', escalationController.createEscalation);

// Update an escalation status or resolution
router.patch('/:id', escalationController.updateEscalation);
router.put('/:id', escalationController.updateEscalation);

module.exports = router;
