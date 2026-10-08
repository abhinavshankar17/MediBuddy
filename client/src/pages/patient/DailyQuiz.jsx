import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import {
  getPatientQuizSession,
  saveQuizProgress,
  submitQuizSession,
  resetPatientQuiz
} from '../../services/quizService';
import { useApp } from '../../context/AppContext';
import {
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Award,
  Star,
  RotateCcw,
  Check,
  ShieldCheck,
  Zap,
  BookOpen
} from 'lucide-react';

export default function DailyQuiz() {
  const { currentUser, activePatientId } = useApp();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Quiz state
  const [quizState, setQuizState] = useState('cover'); // 'cover' | 'in_progress' | 'completed'
  const [currentIndex, setCurrentIndex] = useState(0); // 0 to 4 (5 questions)
  const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
  const [resultSummary, setResultSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadQuizData = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const quizData = await getPatientQuizSession(patientId);

      setSession(quizData.session);
      setQuestions(quizData.questions);

      if (quizData.savedAnswers && Object.keys(quizData.savedAnswers).length > 0) {
        setAnswers(quizData.savedAnswers);
        setCurrentIndex(quizData.savedCurrentIndex || 0);
      } else {
        setAnswers({});
        setCurrentIndex(0);
      }

      if (quizData.isCompleted) {
        const summary = await submitQuizSession(
          patientId,
          quizData.session._id,
          quizData.questions,
          quizData.savedAnswers || {}
        );
        setResultSummary(summary);
        setQuizState('completed');
      } else {
        setQuizState('cover');
      }
    } catch (err) {
      console.error('Failed to load quiz session:', err);
      setError('Could not load daily teach-back quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizData(activePatientId || currentUser?.patientId || 'P001');
  }, [activePatientId, currentUser]);

  const handleSelectOption = (questionId, option) => {
    const updatedAnswers = { ...answers, [questionId]: option };
    setAnswers(updatedAnswers);
    saveQuizProgress(activePatientId || currentUser?.patientId || 'P001', updatedAnswers, currentIndex, false);
  };

  const handleNextQuestion = () => {
    if (currentIndex < 4) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveQuizProgress(activePatientId || currentUser?.patientId || 'P001', answers, nextIdx, false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      saveQuizProgress(activePatientId || currentUser?.patientId || 'P001', answers, prevIdx, false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(answers).length < 5) {
      alert('Please answer all 5 questions before submitting the quiz.');
      return;
    }

    try {
      setSubmitting(true);
      const summary = await submitQuizSession(
        activePatientId || currentUser?.patientId || 'P001',
        session._id,
        questions,
        answers
      );
      setResultSummary(summary);
      setQuizState('completed');
    } catch (err) {
      console.error('Quiz submission error:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    resetPatientQuiz(activePatientId || currentUser?.patientId || 'P001');
    setAnswers({});
    setCurrentIndex(0);
    setResultSummary(null);
    setQuizState('in_progress');
  };

  if (loading) {
    return (
      <PageContainer title="Daily Teach-Back Quiz">
        <LoadingState message="Preparing your 5-question daily recovery quiz..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Daily Teach-Back Quiz">
        <ErrorState
          title="Quiz Unavailable"
          message={error}
          onRetry={() => loadQuizData(activePatientId || currentUser?.patientId || 'P001')}
        />
      </PageContainer>
    );
  }

  const currentQuestion = questions[currentIndex] || questions[0];
  const isCurrentAnswered = Boolean(answers[currentQuestion._id]);
  const progressPercent = Math.round(((currentIndex + 1) / 5) * 100);

  return (
    <PageContainer
      title="Daily Teach-Back Recovery Quiz"
      subtitle="Interactive 5-question comprehension check grounded in your discharge instructions."
      actions={<StatusBadge status="completed" label="★ 100 Max Points" />}
    >
      {/* Quiz Cover Screen */}
      {quizState === 'cover' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in py-4">
          <Card className="p-8 text-center bg-gradient-to-br from-white via-[#FAF8F5] to-[#F4F0E8]/60 border-[#E8E2D7]">
            <div className="w-16 h-16 rounded-2xl bg-[#CC785C]/15 border border-[#CC785C]/30 text-[#CC785C] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <HelpCircle className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC785C]/10 text-[#CC785C] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5-Question Daily Check</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] font-serif">
              Ready for Today's Teach-Back Quiz?
            </h2>

            <p className="text-xs sm:text-sm text-[#78716C] mt-2 max-w-md mx-auto leading-relaxed font-medium">
              Reinforce your knowledge on medication timing, physical restrictions, and follow-up schedules in 5 quick questions.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto my-6">
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs">
                <span className="text-lg font-bold text-[#1C1917] font-serif">5</span>
                <p className="text-[10px] text-[#78716C] font-semibold">Questions</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs">
                <span className="text-lg font-bold text-[#CC785C] font-serif">100</span>
                <p className="text-[10px] text-[#78716C] font-semibold">Knowledge Pts</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs">
                <span className="text-lg font-bold text-[#0D9488] font-serif">~2 min</span>
                <p className="text-[10px] text-[#78716C] font-semibold">Est. Time</p>
              </div>
            </div>

            <button
              onClick={() => setQuizState('in_progress')}
              className="w-full sm:w-auto px-8 py-3 bg-[#CC785C] hover:bg-[#B86549] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <span>Start Quiz Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        </div>
      )}

      {/* Quiz In-Progress Screen */}
      {quizState === 'in_progress' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#CC785C]" />
                <span className="font-serif text-sm">Question {currentIndex + 1} of 5</span>
              </span>
              <span className="text-[#CC785C] bg-[#CC785C]/10 px-2.5 py-0.5 rounded-full border border-[#CC785C]/20">
                ★ {progressPercent}% Completed
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#E8E2D7] rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#CC785C] to-[#0D9488] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Card className="p-6 sm:p-8 bg-white border-[#E8E2D7]">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#CC785C] bg-[#CC785C]/10 px-2 py-0.5 rounded border border-[#CC785C]/20">
                  Instruction Check #{currentIndex + 1}
                </span>
                <h3 className="text-xl font-bold text-[#1C1917] font-serif mt-2 leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion._id] === option;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(currentQuestion._id, option)}
                      className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#CC785C]/10 border-[#CC785C] text-[#1C1917] shadow-xs'
                          : 'bg-[#FAF8F5] border-[#E8E2D7] text-[#78716C] hover:border-[#CC785C]/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-[#CC785C] text-white' : 'bg-[#E8E2D7] text-[#78716C]'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span>{option}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-[#CC785C]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#F4F0E8] flex items-center justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentIndex === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed text-[#78716C]'
                    : 'text-[#1C1917] bg-[#F4F0E8] hover:bg-[#E8E2D7] border border-[#E8E2D7] cursor-pointer'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {currentIndex < 4 ? (
                <button
                  onClick={handleNextQuestion}
                  disabled={!isCurrentAnswered}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrentAnswered
                      ? 'bg-[#CC785C] hover:bg-[#B86549] text-white shadow-xs cursor-pointer'
                      : 'bg-[#E8E2D7] text-[#78716C] cursor-not-allowed'
                  }`}
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={!isCurrentAnswered || submitting}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrentAnswered && !submitting
                      ? 'bg-[#0D9488] hover:bg-[#0B7A70] text-white shadow-xs cursor-pointer'
                      : 'bg-[#E8E2D7] text-[#78716C] cursor-not-allowed'
                  }`}
                >
                  <span>Submit Quiz</span>
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Quiz Completed Results Screen */}
      {quizState === 'completed' && resultSummary && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in py-2">
          <Card className="p-8 text-center bg-gradient-to-br from-white via-[#FAF8F5] to-emerald-50/30 border-emerald-200">
            <div className="w-16 h-16 rounded-2xl bg-[#059669]/15 border border-[#059669]/30 text-[#059669] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Award className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#059669]/10 text-[#059669] text-xs font-bold mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Teach-Back Quiz Completed</span>
            </div>

            <h2 className="text-3xl font-extrabold text-[#1C1917] font-serif">
              Knowledge Comprehension Score
            </h2>

            <div className="my-4">
              <span className="text-5xl font-extrabold text-[#059669] font-serif tracking-tight">
                {resultSummary.score}%
              </span>
              <p className="text-xs font-bold text-[#78716C] mt-1">
                ({resultSummary.correctCount} of 5 Questions Correct)
              </p>
            </div>

            <p className="text-xs text-[#78716C] max-w-sm mx-auto font-medium">
              Great effort! Your quiz responses help reinforce your recovery plan and provide valuable knowledge signals to your care team.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={handleRetakeQuiz}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#1C1917] font-bold text-xs rounded-xl border border-[#E8E2D7] shadow-2xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#CC785C]" />
                <span>Retake Today's Quiz</span>
              </button>

              <button
                onClick={() => navigate('/patient')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#CC785C] hover:bg-[#B86549] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Card>

          <Card title="Question Performance Review">
            <div className="space-y-3">
              {resultSummary.answers && resultSummary.answers.map((ans, idx) => (
                <div key={idx} className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1C1917] font-serif">Q{idx + 1}: {ans.question}</span>
                    <StatusBadge
                      status={ans.isCorrect ? 'completed' : 'missed'}
                      label={ans.isCorrect ? 'Correct' : 'Needs Review'}
                    />
                  </div>
                  <p className="text-[#78716C]">Your Answer: <strong className="text-[#1C1917]">{ans.selectedAnswer}</strong></p>
                  {!ans.isCorrect && (
                    <p className="text-[#059669] font-medium">Correct Answer: <strong>{ans.correctAnswer}</strong></p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
