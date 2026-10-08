const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

/**
 * Event Routes (/api/events)
 */

// Retrieve medication events (?patientId=P001)
router.get('/medication', eventController.getMedicationEvents);

// Retrieve events for a patient (?patientId=P001)
router.get('/', eventController.getEvents);

// Retrieve a single event by ID
router.get('/:id', eventController.getEventById);

// Track a new medication event
router.post('/medication', eventController.trackEvent);
router.post('/', eventController.trackEvent);

module.exports = router;
