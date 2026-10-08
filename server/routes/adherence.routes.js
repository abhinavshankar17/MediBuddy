const express = require('express');
const router = express.Router();
const adherenceController = require('../controllers/adherence.controller');

/**
 * Medication Adherence Routes (/api/adherence)
 */

// Calculate adherence metrics for a patient (?patientId=P001)
router.get('/', adherenceController.getAdherence);

module.exports = router;
