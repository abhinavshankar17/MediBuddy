const dataStore = require('./dataStore');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Format ISO / date string to friendly 12-hour time (e.g. 10:00 AM)
 */
const formatTime = (isoString) => {
  if (!isoString) return 'Scheduled Time';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return isoString;
  }
};

/**
 * Service for timed medication reminder notifications
 * STRICT RULE: Deterministic time logic. NOT a medical escalation system.
 */
const notificationService = {
  /**
   * Process all pending medication reminder notifications
   * @param {Object} [options]
   * @param {Date|string} [options.currentTime] - Optional custom time for simulation/testing
   * @param {string} [options.patientId] - Optional patientId filter
   * @param {number} [options.followUpMinutes] - Override for +10 minute threshold
   * @param {number} [options.simulatedCallMinutes] - Override for +25 minute threshold
   */
  async processMedicationReminderNotifications(options = {}) {
    const now = options.currentTime ? new Date(options.currentTime) : new Date();
    const followUpThresholdMinutes = options.followUpMinutes !== undefined
      ? options.followUpMinutes
      : (config.MEDICATION_FOLLOWUP_NOTIFICATION_MINUTES || 10);
    const simulatedCallThresholdMinutes = options.simulatedCallMinutes !== undefined
      ? options.simulatedCallMinutes
      : (config.MEDICATION_SIMULATED_CALL_MINUTES || 25);

    const generatedNotifications = [];
    const generatedEvents = [];

    // Fetch reminders
    let reminders = await dataStore.getReminders();
    if (options.patientId) {
      reminders = reminders.filter(r => r.patientId === options.patientId);
    }

    for (const reminder of reminders) {
      // 1. If patient has swiped / confirmed taken, STOP workflow for this reminder (no more notifications)
      if (reminder.status === 'taken' || reminder.responseType === 'taken') {
        continue;
      }

      if (!reminder.scheduledAt) continue;

      const scheduledDate = new Date(reminder.scheduledAt);
      if (isNaN(scheduledDate.getTime())) continue;

      // Elapsed time in minutes since scheduledAt
      const elapsedMs = now.getTime() - scheduledDate.getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);

      // Reminder not due yet
      if (elapsedMinutes < 0) {
        continue;
      }

      // Initialize notification state safely
      const notificationState = {
        initialReminderSent: reminder.notificationState?.initialReminderSent || false,
        followUpNotificationSent: reminder.notificationState?.followUpNotificationSent || false,
        simulatedCallNotificationSent: reminder.notificationState?.simulatedCallNotificationSent || false,
        caregiverNotificationSent: reminder.notificationState?.caregiverNotificationSent || false
      };

      let stateModified = false;

      // STEP 1: +10 MINUTE FOLLOW-UP NOTIFICATION (Patient)
      if (
        elapsedMinutes >= followUpThresholdMinutes &&
        !notificationState.followUpNotificationSent
      ) {
        const notifId = `NOTIF_FOLLOWUP_${reminder._id}`;
        const existingNotif = await dataStore.getNotificationById(notifId);

        if (!existingNotif) {
          const followUpNotif = await dataStore.addNotification({
            _id: notifId,
            recipientId: reminder.patientId,
            recipientRole: 'patient',
            patientId: reminder.patientId,
            reminderId: reminder._id,
            type: 'medication_followup',
            title: '💊 Medication Reminder',
            message: `Your ${reminder.medicationName} ${reminder.dose || ''} reminder has not been confirmed.\n\nPlease take your medication according to your discharge instructions and swipe to confirm.`.trim(),
            metadata: {
              medicationName: reminder.medicationName,
              dose: reminder.dose,
              scheduledAt: reminder.scheduledAt,
              elapsedMinutes: Math.floor(elapsedMinutes)
            },
            read: false,
            createdAt: now.toISOString()
          });
          generatedNotifications.push(followUpNotif);

          // Record timeline event
          const event = await dataStore.addEvent({
            _id: `EV_FOLLOWUP_${reminder._id}_${Date.now()}`,
            patientId: reminder.patientId,
            type: 'medication_followup_notification',
            reminderId: reminder._id,
            payload: {
              medicationName: reminder.medicationName,
              dose: reminder.dose,
              scheduledAt: reminder.scheduledAt,
              elapsedMinutes: Math.floor(elapsedMinutes)
            },
            timestamp: now.toISOString(),
            actor: 'system'
          });
          generatedEvents.push(event);
        }

        notificationState.followUpNotificationSent = true;
        stateModified = true;
      }

      // STEP 2: +25 MINUTE SIMULATED CALL & CAREGIVER NOTIFICATION
      if (
        elapsedMinutes >= simulatedCallThresholdMinutes &&
        !notificationState.simulatedCallNotificationSent
      ) {
        const callTimeStr = formatTime(now.toISOString());
        const scheduledTimeStr = formatTime(reminder.scheduledAt);

        // (a) Patient Call Notification
        const patientCallNotifId = `NOTIF_CALL_${reminder._id}`;
        const existingPatientCall = await dataStore.getNotificationById(patientCallNotifId);

        if (!existingPatientCall) {
          // Record simulated call attempt event
          const callEventId = `EV_CALL_${reminder._id}_${Date.now()}`;
          const callEvent = await dataStore.addEvent({
            _id: callEventId,
            patientId: reminder.patientId,
            type: 'simulated_call_attempt',
            reminderId: reminder._id,
            payload: {
              result: 'no_answer',
              demo: true,
              medicationName: reminder.medicationName,
              dose: reminder.dose,
              scheduledAt: reminder.scheduledAt,
              callTime: callTimeStr,
              note: 'Demo: Simulated call — not answered'
            },
            timestamp: now.toISOString(),
            actor: 'system'
          });
          generatedEvents.push(callEvent);

          const patientCallNotif = await dataStore.addNotification({
            _id: patientCallNotifId,
            recipientId: reminder.patientId,
            recipientRole: 'patient',
            patientId: reminder.patientId,
            reminderId: reminder._id,
            type: 'simulated_call',
            title: '📞 Call Attempt',
            message: `Medi Buddy attempted to contact you regarding your unconfirmed ${reminder.medicationName} ${reminder.dose || ''} reminder.\n\nDemo: Simulated call — not answered.`.trim(),
            metadata: {
              result: 'no_answer',
              demo: true,
              medicationName: reminder.medicationName,
              dose: reminder.dose,
              scheduledAt: reminder.scheduledAt,
              callTime: callTimeStr
            },
            read: false,
            createdAt: now.toISOString()
          });
          generatedNotifications.push(patientCallNotif);
        }

        // (b) Caregiver Notification (Find designated caregiver)
        const patient = await dataStore.getPatient(reminder.patientId);
        let caregiverId = patient?.caregiverId;

        if (!caregiverId) {
          const allUsers = await dataStore.getUsersByRole('caregiver');
          const matched = allUsers.find(u => Array.isArray(u.patientIds) && u.patientIds.includes(reminder.patientId));
          if (matched) caregiverId = matched._id;
        }

        if (caregiverId && !notificationState.caregiverNotificationSent) {
          const cgNotifId = `NOTIF_CG_${reminder._id}`;
          const existingCgNotif = await dataStore.getNotificationById(cgNotifId);

          if (!existingCgNotif) {
            const patientName = patient?.name || 'Patient';
            const cgNotif = await dataStore.addNotification({
              _id: cgNotifId,
              recipientId: caregiverId,
              recipientRole: 'caregiver',
              patientId: reminder.patientId,
              reminderId: reminder._id,
              type: 'caregiver_medication_notification',
              title: '🚨 Medication Reminder',
              message: `${patientName} has not confirmed the scheduled medication.\n\nMedication: ${reminder.medicationName} ${reminder.dose || ''}\nScheduled: ${scheduledTimeStr}\n\nA simulated call attempt was made at: ${callTimeStr}\nResult: Not answered.\n\nDemo notification — no real call was placed.`.trim(),
              metadata: {
                demo: true,
                result: 'no_answer',
                patientName,
                medicationName: reminder.medicationName,
                dose: reminder.dose,
                scheduledAt: reminder.scheduledAt,
                callTime: callTimeStr
              },
              read: false,
              createdAt: now.toISOString()
            });
            generatedNotifications.push(cgNotif);

            // Caregiver notification event
            const cgEvent = await dataStore.addEvent({
              _id: `EV_CG_NOTIF_${reminder._id}_${Date.now()}`,
              patientId: reminder.patientId,
              type: 'caregiver_notification',
              reminderId: reminder._id,
              payload: {
                caregiverId,
                patientId: reminder.patientId,
                patientName,
                medicationName: reminder.medicationName,
                dose: reminder.dose,
                demo: true
              },
              timestamp: now.toISOString(),
              actor: 'system'
            });
            generatedEvents.push(cgEvent);
          }

          notificationState.caregiverNotificationSent = true;
        }

        notificationState.simulatedCallNotificationSent = true;
        stateModified = true;
      }

      // Persist updated notificationState on reminder if modified
      if (stateModified) {
        await dataStore.updateReminder(reminder._id, {
          notificationState
        });
      }
    }

    return {
      processedCount: reminders.length,
      notificationsGenerated: generatedNotifications.length,
      eventsGenerated: generatedEvents.length,
      notifications: generatedNotifications,
      events: generatedEvents
    };
  },

  /**
   * Retrieve notifications with filter
   * @param {Object} filter
   */
  async getNotifications(filter = {}) {
    return dataStore.getNotifications(filter);
  },

  /**
   * Retrieve a single notification by ID
   * @param {string} notificationId
   */
  async getNotificationById(notificationId) {
    return dataStore.getNotificationById(notificationId);
  },

  /**
   * Mark a notification as read
   * @param {string} notificationId
   */
  async markNotificationAsRead(notificationId) {
    return dataStore.markNotificationAsRead(notificationId);
  },

  /**
   * Mark all notifications as read
   * @param {Object} filter
   */
  async markAllAsRead(filter = {}) {
    return dataStore.markAllNotificationsAsRead(filter);
  },

  /**
   * Delete a notification
   * @param {string} notificationId
   */
  async deleteNotification(notificationId) {
    return dataStore.deleteNotification(notificationId);
  },

  /**
   * Clear notifications
   * @param {Object} filter
   */
  async clearNotifications(filter = {}) {
    return dataStore.clearNotifications(filter);
  }
};

module.exports = notificationService;
