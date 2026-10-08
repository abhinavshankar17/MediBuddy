const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const startServer = async () => {
  // Connect to database (gracefully handles offline state)
  await connectDB();

  const server = app.listen(config.PORT, () => {
    logger.info(`CareBridge / MediBuddy backend server listening on port ${config.PORT}`);
    logger.info(`Health check available at http://localhost:${config.PORT}/api/health`);
  });

  // Graceful shutdown handlers
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
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
