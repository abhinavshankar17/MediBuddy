import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getQuizAnalyticsCohort } from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  HelpCircle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  ChevronRight,
  UserCheck,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function QuizPerformance() {
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState('ALL'); // 'ALL' | 'PERFECT' | 'GAPS'

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getQuizAnalyticsCohort();
      setData(res);
    } catch (err) {
      console.error('Failed to load quiz analytics cohort:', err);
      setError('Unable to load cohort teach-back quiz metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePatientSelect = (pId) => {
    setActivePatientId(pId);
    navigate(`/nurse/patients/${pId}`);
  };

  if (loading) {
    return (
      <PageContainer title="Cohort Teach-Back Quiz Analytics">
        <LoadingState message="Aggregating quiz comprehension logs & knowledge gap analysis..." />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="Cohort Teach-Back Quiz Analytics">
        <ErrorState
          title="Analytics Unavailable"
          message={error}
          onRetry={loadData}
        />
      </PageContainer>
    );
  }

  const { summary, patientScores } = data;

  const filteredScores = patientScores.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.weaknesses.some((w) => w.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesFilter = true;
    if (scoreFilter === 'PERFECT') matchesFilter = p.score === 100;
    else if (scoreFilter === 'GAPS') matchesFilter = p.weaknesses.length > 0;

    return matchesSearch && matchesFilter;
  });

  return (
    <PageContainer
      title="Cohort Teach-Back Quiz Analytics"
      subtitle="Comprehension rates, score distributions, and real-time knowledge gap detection for nurses and physicians."
      badge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-xs font-bold">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{summary.avgScore}% Cohort Avg</span>
        </div>
      }
    >
      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Quizzes Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-3xl font-extrabold text-[#1C1917] font-serif">{summary.completedCount} / {summary.totalCount}</p>
          <span className="text-[11px] text-[#059669] font-semibold">
            {summary.totalCount - summary.completedCount === 0 ? 'All patients completed' : '1 pending check-in'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Average Score</span>
            <TrendingUp className="w-4 h-4 text-[#0D9488]" />
          </div>
          <p className="text-3xl font-extrabold text-[#0D9488] font-serif">{summary.avgScore}%</p>
          <span className="text-[11px] text-[#0D9488] font-semibold">Target benchmark: &ge;75%</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Gaps Flagged</span>
            <BrainCircuit className="w-4 h-4 text-[#D97706]" />
          </div>
          <p className="text-3xl font-extrabold text-[#D97706] font-serif">{summary.topGaps.length}</p>
          <span className="text-[11px] text-[#D97706] font-semibold">Unique topic areas</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">High Risk Score</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-rose-700 font-serif">
            {patientScores.filter((p) => p.score < 60).length}
          </p>
          <span className="text-[11px] text-rose-600 font-semibold">Score &lt; 60% requiring review</span>
        </div>
      </div>

      {/* 2. Top Knowledge Gaps Hotspot Banner */}
      {summary.topGaps.length > 0 && (
        <Card title="Cohort Knowledge Gaps & Reinforcement Topics" subtitle="Identified from patient quiz responses">
          <div className="flex flex-wrap gap-2.5">
            {summary.topGaps.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-lg bg-[#D97706]/15 text-[#D97706] flex items-center justify-center font-bold text-xs">
                  {item.count}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1C1917]">{item.gap}</p>
                  <p className="text-[10px] text-[#78716C]">{item.count} patient{item.count === 1 ? '' : 's'} missed teach-back</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. Toolbar: Search & Score Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by patient name, knowledge gap..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All Quizzes' },
              { id: 'PERFECT', label: '100% Perfect (5/5)' },
              { id: 'GAPS', label: 'Knowledge Gaps Flagged' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setScoreFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  scoreFilter === btn.id
                    ? 'bg-[#0D9488] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7] hover:border-[#0D9488]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. Patient Teach-Back Score Roster */}
      <div className="space-y-4">
        {filteredScores.map((p) => {
          const hasGaps = p.weaknesses.length > 0;
          const isLowScore = p.score < 60;

          return (
            <Card
              key={p.patientId}
              className={`transition-all ${
                isLowScore
                  ? 'border-rose-200 bg-gradient-to-r from-white via-[#FAF8F5] to-rose-50/20'
                  : 'border-[#E8E2D7] bg-white'
              }`}
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4F0E8]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold text-base font-serif flex-shrink-0">
                      {p.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handlePatientSelect(p.patientId)}
                          className="font-extrabold text-base text-[#1C1917] font-serif hover:text-[#0D9488] transition-colors text-left cursor-pointer flex items-center gap-1"
                        >
                          <span>{p.patientName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#0D9488]" />
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                          {p.patientId}
                        </span>
                        <span className="text-xs text-[#78716C]">
                          ({p.patientGender}, {p.patientAge} yrs)
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C] mt-0.5">{p.recoveryContext}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-base font-extrabold font-serif block ${isLowScore ? 'text-rose-700' : 'text-[#1C1917]'}`}>
                        {p.correctCount} / {p.totalQuestions} ({p.score}%)
                      </span>
                      <span className="text-[10px] text-[#78716C]">
                        {p.completedAt}
                      </span>
                    </div>

                    <StatusBadge
                      status={p.score >= 80 ? 'completed' : p.score >= 60 ? 'pending' : 'missed'}
                      label={p.score >= 80 ? 'HIGH COMPREHENSION' : p.score >= 60 ? 'MODERATE' : 'GAP FLAGGED'}
                    />

                    <button
                      onClick={() => navigate(`/nurse/ai-summary?patientId=${p.patientId}`)}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#CC785C] shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Inspect AI Summary"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">AI Summary</span>
                    </button>
                  </div>
                </div>

                {/* Strengths & Knowledge Gaps Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Strengths */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Demonstrated Strengths</span>
                    </div>
                    {p.strengths.length === 0 ? (
                      <p className="text-xs text-[#78716C]">None recorded</p>
                    ) : (
                      <ul className="space-y-0.5 pt-0.5">
                        {p.strengths.map((s, idx) => (
                          <li key={idx} className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Knowledge Gaps */}
                  <div className={`p-3 rounded-xl border space-y-1 ${hasGaps ? 'bg-amber-50/60 border-amber-200' : 'bg-[#FAF8F5] border-[#E8E2D7]'}`}>
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#D97706]">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Knowledge Gaps for Reinforcement</span>
                    </div>
                    {p.weaknesses.length === 0 ? (
                      <p className="text-xs font-bold text-[#059669] pt-0.5">Zero knowledge gaps detected (100% teach-back)</p>
                    ) : (
                      <ul className="space-y-0.5 pt-0.5">
                        {p.weaknesses.map((w, idx) => (
                          <li key={idx} className="text-xs font-bold text-[#B45309] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
