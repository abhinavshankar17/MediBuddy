const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

/**
 * Notification Routes (/api/notifications)
 */

// 1. Retrieve notifications (?recipientId=...&patientId=...&read=...)
router.get('/', notificationController.getNotifications);

// 2. Process / trigger timed reminder notifications check
router.post('/check', notificationController.triggerCheck);
router.post('/process', notificationController.triggerCheck);

// 4. Mark all as read or clear
router.patch('/read-all', notificationController.markAllAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/', notificationController.clearNotifications);

// 5. Retrieve a specific notification by ID
router.get('/:id', notificationController.getNotificationById);

// 6. Mark notification as read or delete
router.patch('/:id/read', notificationController.markAsRead);
router.post('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
