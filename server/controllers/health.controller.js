const { getDBStatus } = require('../config/db');
const { successResponse } = require('../utils/response');

/**
 * Controller for system health check endpoints
 */
const getHealth = (req, res) => {
  const healthData = {
    service: 'CareBridge / MediBuddy API Server',
    version: '1.0.0',
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDBStatus()
  };

  return successResponse(res, healthData, 'System is healthy and operational', 200);
};

module.exports = {
  getHealth
};
