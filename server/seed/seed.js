const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const MOCK_DATA_DIR = path.resolve(__dirname, '../../data/mock');

/**
 * Helper to load mock JSON file from data/mock directory
 * @param {string} filename 
 * @returns {Array|Object|null}
 */
const loadMockJson = (filename) => {
  try {
    const filePath = path.join(MOCK_DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      logger.warn(`Mock file not found: ${filename}`);
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    logger.error(`Error loading mock JSON file ${filename}: ${err.message}`);
    return null;
  }
};

/**
 * Load all mock datasets into memory for fast lookup or seeding
 */
const loadAllMockData = () => {
  const collections = [
    'users.json',
    'patients.json',
    'documents.json',
    'extractedItems.json',
    'tasks.json',
    'events.json',
    'checkIns.json',
    'teachBacks.json',
    'escalations.json',
    'dayColors.json',
    'nurseBriefs.json',
    'providers.json',
    'auditLogs.json',
    'agentTraces.json',
    'medicationReminders.json',
    'patientInsights.json',
    'quizAnswers.json',
    'quizQuestions.json',
    'quizSessions.json'
  ];

  const datasets = {};
  for (const file of collections) {
    const key = path.basename(file, '.json');
    datasets[key] = loadMockJson(file);
  }
  return datasets;
};

module.exports = {
  loadMockJson,
  loadAllMockData
};
