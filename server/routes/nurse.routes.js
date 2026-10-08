const express = require('express');
const router = express.Router();
const nurseController = require('../controllers/nurse.controller');

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

module.exports = router;
