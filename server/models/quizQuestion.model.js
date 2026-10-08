const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  quizSessionId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  sourceItemId: { type: String, default: null },
  sourceSentence: { type: String, default: null },
  difficulty: { type: String, default: 'easy' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.QuizQuestion || mongoose.model('QuizQuestion', QuizQuestionSchema);
