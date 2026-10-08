const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');

/**
 * Document Routes (/api/documents)
 */

// Retrieve patient's discharge document by patient ID
router.get('/patient/:patientId', documentController.getDocumentByPatientId);

// Retrieve document by document ID (supports ?patientId=... verification)
router.get('/:id', documentController.getDocumentById);

module.exports = router;
