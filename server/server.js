const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const notificationService = require('./services/notification.service');
const { syncAllMockFilesToDB, startMockFileWatcher } = require('./services/mockSync.service');

const startServer = async () => {
  // Connect to database (gracefully handles offline state)
  await connectDB();

  // Sync initial mock data into MongoDB and start real-time file watcher
  await syncAllMockFilesToDB();
  const mockWatcher = startMockFileWatcher();

  const server = app.listen(config.PORT, () => {
    logger.info(`CareBridge / MediBuddy backend server listening on port ${config.PORT}`);
    logger.info(`Health check available at http://localhost:${config.PORT}/api/health`);
  });

  // Background worker for deterministic timed medication reminder notifications
  const workerIntervalMs = 15000; // Run every 15 seconds
  const notificationWorker = setInterval(async () => {
    try {
      await notificationService.processMedicationReminderNotifications();
    } catch (err) {
      logger.error('Error running background medication reminder notification worker:', err);
    }
  }, workerIntervalMs);

  // Graceful shutdown handlers
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    clearInterval(notificationWorker);
    if (mockWatcher) mockWatcher.close();
    server.close(() => {
      logger.info('Server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
