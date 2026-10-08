const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware pipeline
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
