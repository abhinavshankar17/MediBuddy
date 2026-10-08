const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

/**
 * Health check route
 * GET /api/health
 */
router.get('/', healthController.getHealth);

module.exports = router;
