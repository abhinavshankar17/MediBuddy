const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  patientId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'in_progress'
  },
  startedAt: { type: String, default: () => new Date().toISOString() },
  completedAt: { type: String, default: null },
  score: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 5 },
  aiGenerated: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.models.QuizSession || mongoose.model('QuizSession', QuizSessionSchema);
