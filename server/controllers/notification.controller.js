const { notificationService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for medication reminder notifications
 */
const notificationController = {
  /**
   * GET /api/notifications
   * GET /api/patients/:patientId/notifications
   * Retrieve notifications with filtering
   */
  async getNotifications(req, res, next) {
    try {
      const recipientId = req.query.recipientId || req.query.userId || req.params.patientId || req.query.patientId;
      const patientId = req.params.patientId || req.query.patientId;
      const { type, read } = req.query;

      const filter = {};
      if (recipientId) filter.recipientId = recipientId;
      if (patientId && !recipientId) filter.patientId = patientId;
      if (type) filter.type = type;
      if (read !== undefined) filter.read = read === 'true';

      const notifications = await notificationService.getNotifications(filter);
      return successResponse(res, notifications, 'Notifications retrieved successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/notifications/:id
   * Retrieve a single notification by ID
   */
  async getNotificationById(req, res, next) {
    try {
      const notificationId = req.params.id;
      const notification = await notificationService.getNotificationById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Notification with ID '${notificationId}' not found`
          }
        });
      }
      return successResponse(res, notification, 'Notification retrieved successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * POST /api/notifications/:id/read
   * Mark a notification as read
   */
  async markAsRead(req, res, next) {
    try {
      const notificationId = req.params.id;
      const updated = await notificationService.markNotificationAsRead(notificationId);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Notification with ID '${notificationId}' not found`
          }
        });
      }
      return successResponse(res, updated, 'Notification marked as read');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req, res, next) {
    try {
      const recipientId = req.query.recipientId || req.body.recipientId;
      const patientId = req.query.patientId || req.body.patientId;
      const recipientRole = req.query.recipientRole || req.body.recipientRole;
      await notificationService.markAllAsRead({ recipientId, patientId, recipientRole });
      return successResponse(res, { success: true }, 'All notifications marked as read');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/notifications/:id
   * Dismiss or delete a notification
   */
  async deleteNotification(req, res, next) {
    try {
      const notificationId = req.params.id;
      const deleted = await notificationService.deleteNotification(notificationId);
      return successResponse(res, { deleted }, 'Notification removed successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/notifications
   * Clear notifications
   */
  async clearNotifications(req, res, next) {
    try {
      const recipientId = req.query.recipientId || req.body.recipientId;
      const patientId = req.query.patientId || req.body.patientId;
      const recipientRole = req.query.recipientRole || req.body.recipientRole;
      await notificationService.clearNotifications({ recipientId, patientId, recipientRole });
      return successResponse(res, { cleared: true }, 'Notifications cleared successfully');
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/notifications/check
   * POST /api/notifications/process
   * Trigger / simulate reminder notification workflow pass
   */
  async triggerCheck(req, res, next) {
    try {
      const { currentTime, patientId, followUpMinutes, simulatedCallMinutes } = req.body || {};
      const result = await notificationService.processMedicationReminderNotifications({
        currentTime: currentTime || req.query.currentTime,
        patientId: patientId || req.query.patientId,
        followUpMinutes: followUpMinutes !== undefined ? parseInt(followUpMinutes, 10) : undefined,
        simulatedCallMinutes: simulatedCallMinutes !== undefined ? parseInt(simulatedCallMinutes, 10) : undefined
      });

      return successResponse(res, result, 'Medication reminder notifications check processed successfully');
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = notificationController;
