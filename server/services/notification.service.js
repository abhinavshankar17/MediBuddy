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
    const caregiverThresholdMinutes = options.caregiverMinutes !== undefined
      ? options.caregiverMinutes
      : (config.MEDICATION_CAREGIVER_NOTIFICATION_MINUTES || (simulatedCallThresholdMinutes + 5));

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
          const patient = await dataStore.getPatient(reminder.patientId);
          const lang = patient?.language || 'en';

          let notifTitle = '💊 Medication Reminder';
          let notifMsg = `Your ${reminder.medicationName} ${reminder.dose || ''} reminder has not been confirmed.\n\nPlease take your medication according to your discharge instructions and swipe to confirm.`.trim();

          if (lang === 'hi') {
            notifTitle = '💊 दवा अनुस्मारक';
            notifMsg = `आपकी दवा ${reminder.medicationName} ${reminder.dose || ''} की खुराक अभी तक पुष्ट नहीं हुई है।\n\nकृपया अपने डिस्चार्ज निर्देशों के अनुसार दवा लें और पुष्टि करने के लिए स्वाइप करें।`.trim();
          } else if (lang === 'ta') {
            notifTitle = '💊 மருந்து நினைவூட்டல்';
            notifMsg = `உங்கள் ${reminder.medicationName} ${reminder.dose || ''} மருந்து நினைவூட்டல் இன்னும் உறுதிப்படுத்தப்படவில்லை.\n\nதயவுசெய்து உங்கள் டிஸ்சார்ஜ் வழிமுறைகளின்படி மருந்தை உட்கொண்டு உறுதிப்படுத்தவும்.`.trim();
          }

          const followUpNotif = await dataStore.addNotification({
            _id: notifId,
            recipientId: reminder.patientId,
            recipientRole: 'patient',
            patientId: reminder.patientId,
            reminderId: reminder._id,
            type: 'medication_followup',
            title: notifTitle,
            message: notifMsg,
            metadata: {
              medicationName: reminder.medicationName,
              dose: reminder.dose,
              scheduledAt: reminder.scheduledAt,
              elapsedMinutes: Math.floor(elapsedMinutes),
              language: lang
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

      // STEP 2: +25 MINUTE SIMULATED CALL (Patient)
      if (
        elapsedMinutes >= simulatedCallThresholdMinutes &&
        !notificationState.simulatedCallNotificationSent
      ) {
        const callTimeStr = formatTime(now.toISOString());

        // (a) Patient Call Notification & Audit Event
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

        notificationState.simulatedCallNotificationSent = true;
        stateModified = true;
      }

      // STEP 3: 5 MINUTES AFTER CALL (+30 MINUTE) CAREGIVER NOTIFICATION
      // User rule: "after the phone call also , if the medicine is not marked as taken , then send notification to the caregiver after 5 minutes and sync them accordingly"
      if (
        elapsedMinutes >= caregiverThresholdMinutes &&
        !notificationState.caregiverNotificationSent
      ) {
        const scheduledTimeStr = formatTime(reminder.scheduledAt);
        const callTimeStr = formatTime(new Date(scheduledDate.getTime() + simulatedCallThresholdMinutes * 60 * 1000).toISOString());

        // Find designated caregiver(s) linked to this patient
        const patient = await dataStore.getPatient(reminder.patientId);
        let caregiverIds = [];

        if (patient?.caregiverId) {
          caregiverIds.push(patient.caregiverId);
        }

        const allCaregivers = await dataStore.getUsersByRole('caregiver');
        for (const cg of allCaregivers) {
          if (Array.isArray(cg.patientIds) && cg.patientIds.includes(reminder.patientId)) {
            if (!caregiverIds.includes(cg._id)) {
              caregiverIds.push(cg._id);
            }
          }
        }

        if (caregiverIds.length === 0) {
          caregiverIds.push('U101'); // Standard demo caregiver fallback
        }

        const patientName = patient?.name || 'Loved One';

        for (const caregiverId of caregiverIds) {
          const cgNotifId = `NOTIF_CG_${reminder._id}_${caregiverId}`;
          const existingCgNotif = await dataStore.getNotificationById(cgNotifId);

          if (!existingCgNotif) {
            const cgNotif = await dataStore.addNotification({
              _id: cgNotifId,
              recipientId: caregiverId,
              recipientRole: 'caregiver',
              patientId: reminder.patientId,
              reminderId: reminder._id,
              type: 'caregiver_medication_notification',
              title: '🚨 Medication Reminder',
              message: `${patientName} has not confirmed the scheduled medication.\n\nMedication: ${reminder.medicationName} ${reminder.dose || ''}\nScheduled: ${scheduledTimeStr}\n\nA simulated call attempt was made at ${callTimeStr} (Not answered).\n5 minutes have elapsed since the call attempt with no confirmation.\n\nDemo notification — please check in with ${patientName}.`.trim(),
              metadata: {
                demo: true,
                result: 'no_answer',
                patientName,
                medicationName: reminder.medicationName,
                dose: reminder.dose,
                scheduledAt: reminder.scheduledAt,
                callTime: callTimeStr,
                elapsedMinutesSinceCall: Math.floor(elapsedMinutes - simulatedCallThresholdMinutes)
              },
              read: false,
              createdAt: now.toISOString()
            });
            generatedNotifications.push(cgNotif);
          }
        }

        // Caregiver notification timeline event
        const cgEvent = await dataStore.addEvent({
          _id: `EV_CG_NOTIF_${reminder._id}_${Date.now()}`,
          patientId: reminder.patientId,
          type: 'caregiver_notification',
          reminderId: reminder._id,
          payload: {
            caregiverIds,
            patientId: reminder.patientId,
            patientName,
            medicationName: reminder.medicationName,
            dose: reminder.dose,
            elapsedMinutes: Math.floor(elapsedMinutes),
            demo: true
          },
          timestamp: now.toISOString(),
          actor: 'system'
        });
        generatedEvents.push(cgEvent);

        notificationState.caregiverNotificationSent = true;
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
