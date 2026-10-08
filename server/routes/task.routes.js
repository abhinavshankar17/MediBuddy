const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

/**
 * Task Routes (/api/tasks)
 */

// Query tasks for a patient (?patientId=P001)
router.get('/', taskController.getTasks);

module.exports = router;
