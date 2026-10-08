const mongoose = require('mongoose');

const QuizAnswerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  quizSessionId: { type: String, required: true, index: true },
  questionId: { type: String, required: true, index: true },
  selectedAnswer: { type: String, required: true },
  correct: { type: Boolean, required: true },
  answeredAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.QuizAnswer || mongoose.model('QuizAnswer', QuizAnswerSchema);
