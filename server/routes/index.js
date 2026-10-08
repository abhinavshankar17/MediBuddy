const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const patientRoutes = require('./patient.routes');
const documentRoutes = require('./document.routes');
const taskRoutes = require('./task.routes');
const reminderRoutes = require('./reminder.routes');
const eventRoutes = require('./event.routes');
const adherenceRoutes = require('./adherence.routes');
const quizRoutes = require('./quiz.routes');
const insightRoutes = require('./insight.routes');
const nurseRoutes = require('./nurse.routes');

// System Health Check
router.use('/health', healthRoutes);

// Domain Routers
router.use('/patients', patientRoutes);
router.use('/documents', documentRoutes);
router.use('/tasks', taskRoutes);
router.use('/reminders', reminderRoutes);
router.use('/medication-reminders', reminderRoutes);
router.use('/events', eventRoutes);
router.use('/adherence', adherenceRoutes);
router.use('/quiz', quizRoutes);
router.use('/quizzes', quizRoutes);
router.use('/insights', insightRoutes);
router.use('/nurse', nurseRoutes);

// Root API information endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'CareBridge / MediBuddy API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
    endpoints: {
      health: '/api/health',
      patients: '/api/patients',
      documents: '/api/documents',
      tasks: '/api/tasks',
      reminders: '/api/reminders',
      events: '/api/events',
      adherence: '/api/adherence',
      quiz: '/api/quiz',
      insights: '/api/insights',
      nurse: '/api/nurse'
    },
    status: 'active'
  });
});

module.exports = router;
