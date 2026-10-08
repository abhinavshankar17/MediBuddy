const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const upload = require('../middleware/upload');

/**
 * Document & Prescription Routes (/api/documents)
 */

// List all documents (supports ?patientId=...)
router.get('/', documentController.getAllDocuments);

// Upload real PDF prescription or discharge summary
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// Retrieve patient's discharge document by patient ID
router.get('/patient/:patientId', documentController.getDocumentByPatientId);

// Retrieve document by document ID (supports ?patientId=... verification)
router.get('/:id', documentController.getDocumentById);

module.exports = router;
