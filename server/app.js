const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware pipeline
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded PDF and document files statically
app.use('/uploads', express.static(uploadDir));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root welcome / ping
app.get('/', (req, res) => {
  res.json({
    message: 'CareBridge / MediBuddy API Server',
    status: 'running',
    health: '/api/health',
    api: '/api'
  });
});

// Mount authoritative API Router under /api prefix
app.use('/api', apiRouter);

// 404 Catch-all handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
