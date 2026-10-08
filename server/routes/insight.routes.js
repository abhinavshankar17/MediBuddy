const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insight.controller');

/**
 * Patient Insight Routes (/api/insights)
 */

// Retrieve latest insight for patient (?patientId=P001)
router.get('/latest', insightController.getLatestInsight);

// Retrieve all insights for a patient (?patientId=P001)
router.get('/', insightController.getPatientInsights);

// Retrieve insights for specific patient path parameter
router.get('/patient/:patientId', insightController.getPatientInsights);

// Generate a fresh grounded insight ({ patientId: 'P001' })
router.post('/generate', insightController.generateInsight);

// Retrieve specific insight by ID
router.get('/:id', insightController.getInsightById);

module.exports = router;
