const { quizService } = require('../services');
const { successResponse } = require('../utils/response');

/**
 * Controller for daily quiz operations
 */
const quizController = {
  /**
   * GET /api/quiz/today
   * GET /api/patients/:patientId/quiz/today
   * Retrieve today's daily quiz (exactly 5 questions, API safe with correct answer masked)
   */
  async getTodayQuiz(req, res, next) {
    try {
      const patientId = req.params.patientId || req.query.patientId;
      const { date, language } = req.query;
      const quizData = await quizService.getTodayQuiz(patientId, date, { language });
      return successResponse(
        res,
        quizData,
        `Today's quiz for patient ${patientId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/quiz/start
   * POST /api/patients/:patientId/quiz/start
   * Start or create a new daily quiz session (exactly 5 questions)
   */
  async startQuiz(req, res, next) {
    try {
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      const { date, language } = req.body;
      const sessionData = await quizService.startQuiz(patientId, date, { language });
      return successResponse(
        res,
        sessionData,
        `Quiz session started successfully for patient ${patientId}`,
        201
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/quiz/sessions/:id/questions
   * GET /api/patients/:patientId/quiz/sessions/:id/questions
   * Retrieve the exactly 5 questions for a session
   */
  async getQuizQuestions(req, res, next) {
    try {
      const sessionId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;
      const { language } = req.query;
      const questionsData = await quizService.getQuizQuestions(sessionId, patientId, { language });
      return successResponse(
        res,
        questionsData,
        `Questions for quiz session ${sessionId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/quiz/sessions/:id/submit
   * POST /api/patients/:patientId/quiz/sessions/:id/submit
   * Submit quiz answers, evaluate score, and return review
   */
  async submitQuiz(req, res, next) {
    try {
      const sessionId = req.params.id;
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      const { answers } = req.body;

      const submissionResult = await quizService.submitQuiz(sessionId, {
        patientId,
        answers
      });

      return successResponse(
        res,
        submissionResult,
        `Quiz session ${sessionId} submitted successfully with score ${submissionResult.score}%`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/quiz/sessions/:id/answer
   * POST /api/patients/:patientId/quiz/sessions/:id/answer
   * Record a single question answer with strict validation
   */
  async recordAnswer(req, res, next) {
    try {
      const sessionId = req.params.id;
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      const { questionId, selectedAnswer } = req.body;

      const result = await quizService.recordAnswer(sessionId, {
        patientId,
        questionId,
        selectedAnswer
      });

      return successResponse(
        res,
        result,
        `Answer recorded successfully for question ${questionId}`
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/quiz/sessions/:id/score
   * GET /api/patients/:patientId/quiz/sessions/:id/score
   * Retrieve educational knowledge score after all 5 questions
   */
  async getQuizScore(req, res, next) {
    try {
      const sessionId = req.params.id;
      const patientId = req.params.patientId || req.query.patientId || null;

      const scoreResult = await quizService.getQuizScore(sessionId, patientId);
      return successResponse(
        res,
        scoreResult,
        `Educational score for quiz session ${sessionId} retrieved successfully`
      );
    } catch (err) {
      return next(err);
    }
  }
};

module.exports = quizController;
