const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');

/**
 * Medication Reminder Routes (/api/reminders)
 */

// Retrieve reminders for a patient (?patientId=P001&status=scheduled)
router.get('/', reminderController.getReminders);

// Retrieve reminder status
router.get('/:id/status', reminderController.getReminderStatus);

// Retrieve a specific reminder by ID
router.get('/:id', reminderController.getReminderById);

// Confirm medication reminder response
router.post('/:id/confirm', reminderController.confirmMedication);
router.patch('/:id/confirm', reminderController.confirmMedication);
router.patch('/:id', reminderController.confirmMedication);

module.exports = router;
