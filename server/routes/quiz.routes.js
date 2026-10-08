const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');

/**
 * Quiz Routes (/api/quiz and /api/quizzes)
 */

// Retrieve today's daily quiz (?patientId=P001)
router.get('/today', quizController.getTodayQuiz);

// Start a new daily quiz session
router.post('/start', quizController.startQuiz);

// Retrieve questions for a quiz session (exactly 5 questions, API safe)
router.get('/sessions/:id/questions', quizController.getQuizQuestions);
router.get('/:id/questions', quizController.getQuizQuestions);

// Submit quiz answers
router.post('/sessions/:id/submit', quizController.submitQuiz);
router.post('/:id/submit', quizController.submitQuiz);

// Record an individual question answer (Feature 6)
router.post('/sessions/:id/answer', quizController.recordAnswer);
router.post('/:id/answer', quizController.recordAnswer);

// Retrieve educational score after completion (Feature 6)
router.get('/sessions/:id/score', quizController.getQuizScore);
router.get('/:id/score', quizController.getQuizScore);

module.exports = router;
