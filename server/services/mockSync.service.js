const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { getDBStatus } = require('../config/db');
const models = require('../models');
const dataStore = require('./dataStore');

const MOCK_DIR = path.resolve(__dirname, '../../data/mock');

const FILE_MODEL_MAP = {
  'medicationReminders.json': { model: models.MedicationReminder, cacheKey: 'medicationReminders' },
  'notifications.json': { model: models.Notification, cacheKey: 'notifications' },
  'patients.json': { model: models.Patient, cacheKey: 'patients' },
  'documents.json': { model: models.Document, cacheKey: 'documents' },
  'extractedItems.json': { model: models.ExtractedItem, cacheKey: 'extractedItems' },
  'tasks.json': { model: models.Task, cacheKey: 'tasks' },
  'events.json': { model: models.Event, cacheKey: 'events' },
  'quizSessions.json': { model: models.QuizSession, cacheKey: 'quizSessions' },
  'quizQuestions.json': { model: models.QuizQuestion, cacheKey: 'quizQuestions' },
  'quizAnswers.json': { model: models.QuizAnswer, cacheKey: 'quizAnswers' },
  'patientInsights.json': { model: models.PatientInsight, cacheKey: 'patientInsights' },
  'nurseBriefs.json': { model: models.NurseBrief, cacheKey: 'nurseBriefs' },
  'escalations.json': { model: models.Escalation, cacheKey: 'escalations' }
};

let debounceTimers = {};

/**
 * Sync a single mock JSON file to in-memory cache and MongoDB
 * @param {string} filename
 */
async function syncMockFileToDB(filename) {
  const mapping = FILE_MODEL_MAP[filename];
  if (!mapping) return;

  const filePath = path.join(MOCK_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    if (!rawContent || !rawContent.trim()) return;

    const data = JSON.parse(rawContent);
    if (!Array.isArray(data)) return;

    // 1. Update in-memory cache immediately
    dataStore.setCacheCollection(mapping.cacheKey, data);

    // 2. If MongoDB is connected, upsert all records
    const dbStatus = getDBStatus();
    if (dbStatus.connected && mapping.model) {
      const Model = mapping.model;

      if (filename === 'medicationReminders.json') {
        // Query existing reminders to detect actual scheduledAt changes
        const existingDocs = await Model.find({}).lean();
        const existingMap = new Map(existingDocs.map(d => [d._id, d]));
        const changedReminderIds = [];

        const operations = data.map(item => {
          const existing = existingMap.get(item._id);
          const scheduledAtChanged = existing && existing.scheduledAt !== item.scheduledAt;

          if (scheduledAtChanged) {
            changedReminderIds.push(item._id);
          }

          // If scheduledAt changed, reset state for that specific reminder. Otherwise, preserve existing state.
          const notificationState = scheduledAtChanged
            ? {
                initialReminderSent: false,
                followUpNotificationSent: false,
                simulatedCallNotificationSent: false,
                caregiverNotificationSent: false
              }
            : (existing?.notificationState || item.notificationState || {
                initialReminderSent: false,
                followUpNotificationSent: false,
                simulatedCallNotificationSent: false,
                caregiverNotificationSent: false
              });

          const docToSet = {
            ...item,
            notificationState
          };

          return {
            updateOne: {
              filter: { _id: item._id },
              update: { $set: docToSet },
              upsert: true
            }
          };
        });

        if (operations.length > 0) {
          await Model.bulkWrite(operations);
        }

        // Auto mark notifications as read for reminders marked as taken
        const takenReminderIds = data.filter(d => d.status === 'taken' || d.responseType === 'taken').map(d => d._id);
        if (takenReminderIds.length > 0) {
          await models.Notification.updateMany(
            { reminderId: { $in: takenReminderIds }, read: false },
            { $set: { read: true } }
          );
        }

        // Only delete old dynamic notifications for the reminders whose scheduledAt actually changed!
        if (changedReminderIds.length > 0) {
          await models.Notification.deleteMany({
            reminderId: { $in: changedReminderIds },
            _id: { $regex: /^NOTIF_(FOLLOWUP|CALL|CG)_/ }
          });
        }
      } else if (filename === 'notifications.json') {
        // Preserve read: true status when syncing static mock notifications
        const existingNotifs = await Model.find({}).lean();
        const existingMap = new Map(existingNotifs.map(n => [n._id, n]));

        const operations = data.map(item => {
          const existing = existingMap.get(item._id);
          const docToSet = {
            ...item,
            read: existing?.read !== undefined ? existing.read : (item.read || false)
          };
          return {
            updateOne: {
              filter: { _id: item._id },
              update: { $set: docToSet },
              upsert: true
            }
          };
        });

        if (operations.length > 0) {
          await Model.bulkWrite(operations);
        }
      } else {
        const operations = data.map(item => ({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: item },
            upsert: true
          }
        }));

        if (operations.length > 0) {
          await Model.bulkWrite(operations);
        }
      }
    }

    logger.info(`[MockSync] Successfully synced ${filename} (${data.length} records) to memory & MongoDB`);

    // If medication reminders changed, trigger immediate notification evaluation
    if (filename === 'medicationReminders.json') {
      try {
        const notificationService = require('./notification.service');
        await notificationService.processMedicationReminderNotifications();
      } catch (err) {
        logger.warn('[MockSync] Could not trigger notification check on sync:', err.message);
      }
    }
  } catch (err) {
    logger.error(`[MockSync] Error syncing ${filename}: ${err.message}`);
  }
}

/**
 * Sync all mock JSON files to MongoDB at startup
 */
async function syncAllMockFilesToDB() {
  for (const filename of Object.keys(FILE_MODEL_MAP)) {
    await syncMockFileToDB(filename);
  }
}

/**
 * Start watching data/mock directory for immediate real-time synchronization
 */
function startMockFileWatcher() {
  if (!fs.existsSync(MOCK_DIR)) {
    logger.warn(`[MockSync] Mock data directory not found at ${MOCK_DIR}`);
    return null;
  }

  logger.info(`[MockSync] Watching for mock JSON changes in ${MOCK_DIR}...`);

  try {
    const watcher = fs.watch(MOCK_DIR, (eventType, filename) => {
      if (!filename || !FILE_MODEL_MAP[filename]) return;

      if (debounceTimers[filename]) {
        clearTimeout(debounceTimers[filename]);
      }

      debounceTimers[filename] = setTimeout(async () => {
        logger.info(`[MockSync] Detected change in ${filename}, synchronizing immediately...`);
        await syncMockFileToDB(filename);
      }, 300);
    });

    return watcher;
  } catch (err) {
    logger.error(`[MockSync] Failed to start file watcher: ${err.message}`);
    return null;
  }
}

module.exports = {
  syncMockFileToDB,
  syncAllMockFilesToDB,
  startMockFileWatcher
};
