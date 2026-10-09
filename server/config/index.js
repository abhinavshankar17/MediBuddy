const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medibuddy',
  JWT_SECRET: process.env.JWT_SECRET || 'carebridge_medibuddy_jwt_secret_dev_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  MEDICATION_FOLLOWUP_NOTIFICATION_MINUTES: parseInt(process.env.MEDICATION_FOLLOWUP_NOTIFICATION_MINUTES, 10) || 10,
  MEDICATION_SIMULATED_CALL_MINUTES: parseInt(process.env.MEDICATION_SIMULATED_CALL_MINUTES, 10) || 25,
  MEDICATION_CAREGIVER_NOTIFICATION_MINUTES: parseInt(process.env.MEDICATION_CAREGIVER_NOTIFICATION_MINUTES, 10) || 30
};
