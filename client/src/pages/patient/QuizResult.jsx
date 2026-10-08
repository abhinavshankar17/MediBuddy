import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getPatientQuizSession } from '../../services/quizService';
import { getPatientInsight } from '../../services/insightService';
import { useApp } from '../../context/AppContext';
import { Award, CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Sparkles, Check, HelpCircle } from 'lucide-react';

export default function QuizResult() {
  const { currentUser, activePatientId } = useApp();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState(null);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResults = async (patientId) => {
    try {
      setLoading(true);
      setError(null);
      const [qSession, pInsight] = await Promise.all([
        getPatientQuizSession(patientId),
        getPatientInsight(patientId)
      ]);
      setQuizData(qSession);
      setInsight(pInsight);
    } catch (err) {
      console.error('Failed to load quiz results:', err);
      setError('Unable to load quiz results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults(activePatientId || currentUser?.patientId || 'P001');
  }, [activePatientId, currentUser]);

  if (loading) {
    return (
      <PageContainer title="Your Recovery Check">
        <LoadingState message="Loading your daily quiz results & recovery check..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Your Recovery Check">
        <ErrorState
          title="Quiz Results Unavailable"
          message={error}
          onRetry={() => loadResults(activePatientId || currentUser?.patientId || 'P001')}
        />
      </PageContainer>
    );
  }

  const score = insight ? insight.score : (quizData?.session?.score || 80);
  const correctCount = Math.round((score / 100) * 5);
  const totalQuestions = 5;

  const strengthsList = insight?.strengths && insight.strengths.length > 0
    ? insight.strengths
    : ['Medication timing', 'Exercise frequency', 'Follow-up scheduling'];

  const areasToReviewList = insight?.weaknesses && insight.weaknesses.length > 0
    ? insight.weaknesses
    : (score < 100 ? ['Wound care fever threshold'] : []);

  return (
    <PageContainer
      title="Your Recovery Check"
      subtitle="Knowledge comprehension feedback from your 5-question teach-back check."
      actions={<StatusBadge status="completed" label="Teach-Back Signal" />}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Main Score Banner Card */}
        <Card className="text-center p-8 bg-gradient-to-br from-white via-[#FAF8F5] to-emerald-50/30 border-emerald-200">
          <div className="w-16 h-16 rounded-2xl bg-[#059669]/15 border border-[#059669]/30 text-[#059669] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Award className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] font-serif">
            Your Recovery Check
          </h2>

          <div className="my-4">
            <span className="text-5xl font-extrabold text-[#059669] font-serif tracking-tight">
              {correctCount} / {totalQuestions} correct
            </span>
            <p className="text-xs font-bold text-[#78716C] mt-1">
              Comprehension Rating: {score}%
            </p>
          </div>

          <p className="text-xs text-[#78716C] max-w-sm mx-auto font-medium">
            Great job checking your discharge instructions today! Use these findings to guide your recovery routines.
          </p>

          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link
              to="/patient/insights"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#CC785C] hover:bg-[#B86549] text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Lightbulb className="w-4 h-4" />
              <span>View Detailed Care Insights</span>
            </Link>

            <Link
              to="/patient"
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#1C1917] font-bold text-xs rounded-xl border border-[#E8E2D7] shadow-2xs transition-all"
            >
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </Card>

        {/* Strengths & Areas to Review Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
          <Card title="Knowledge Strengths" subtitle="Topics answered correctly">
            <div className="space-y-2.5">
              {strengthsList.map((item, idx) => (
                <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] flex-shrink-0" />
                  <span className="font-bold">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Areas to Review Card */}
          <Card title="Areas to Review" subtitle="Topics recommended for reinforcement">
            {areasToReviewList.length > 0 ? (
              <div className="space-y-2.5">
                {areasToReviewList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Review: {item}</span>
                      <span className="text-[11px] text-amber-800">Recommend double-checking your discharge document section.</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-bold">
                ✓ Excellent! All 5 topics answered correctly. No areas requiring review today.
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
