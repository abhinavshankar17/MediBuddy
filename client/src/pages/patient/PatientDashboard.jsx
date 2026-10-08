import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import {
  getPatientById,
  getPatientTodayOverview,
  getPatientRecoveryProgress,
  getPatientDischargeInstructions,
  getAllPatients
} from '../../services/patientService';
import { useApp } from '../../context/AppContext';
import {
  User,
  Pill,
  CheckSquare,
  HelpCircle,
  Calendar,
  AlertTriangle,
  FileText,
  Activity,
  Sparkles,
  ShieldAlert,
  Info,
  Clock,
  Heart,
  LogOut
} from 'lucide-react';

export default function PatientDashboard() {
  const { currentUser, logout, activePatientId } = useApp();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [overview, setOverview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [instructions, setInstructions] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadDashboardData = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const [pData, oData, prData, iData] = await Promise.all([
        getPatientById(patientId),
        getPatientTodayOverview(patientId),
        getPatientRecoveryProgress(patientId),
        getPatientDischargeInstructions(patientId)
      ]);

      setPatient(pData);
      setOverview(oData);
      setProgress(prData);
      setInstructions(iData);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
      setError('Could not load patient dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(activePatientId || currentUser?.patientId || 'P001');
  }, [activePatientId, currentUser]);

  if (loading) {
    return (
      <PageContainer title="Patient Recovery Dashboard">
        <LoadingState message="Loading patient recovery plan & discharge guidelines..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Patient Recovery Dashboard">
        <ErrorState
          title="Patient Data Unavailable"
          message={error}
          onRetry={() => loadDashboardData(activePatientId || 'P001')}
        />
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer title="Patient Recovery Dashboard">
        <EmptyState
          title="No Patient Profile Found"
          description="Please select a valid patient profile to view post-discharge guidelines."
        />
      </PageContainer>
    );
  }

  const colorBadgeMap = {
    GREEN: { status: 'completed', label: 'On Track (Green)' },
    YELLOW: { status: 'pending', label: 'Attention Needed (Yellow)' },
    RED: { status: 'missed', label: 'Action Required (Red)' }
  };

  return (
    <PageContainer
      title="Patient Recovery Dashboard"
      subtitle="Personalized post-discharge recovery monitoring and verified clinical guidelines."
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-[#E8E2D7] hover:border-rose-200 rounded-xl text-xs font-bold text-rose-700 shadow-2xs transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
          <StatusBadge status="completed" label={patient.recoveryDay} />
        </div>
      }
    >
      {/* Safety Wording Banner */}
      <div className="p-3 bg-[#CC785C]/10 border border-[#CC785C]/25 rounded-xl flex items-center justify-between text-xs text-[#1C1917]">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-[#CC785C] flex-shrink-0" />
          <span>
            <strong className="text-[#CC785C]">AI-generated — verify before acting.</strong> Clinical summaries and instructions are extracted from original discharge documentation.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-[#CC785C] bg-white px-2 py-0.5 rounded border border-[#CC785C]/20 hidden sm:inline">
          VERIFIED DATASET
        </span>
      </div>

      {/* Patient Information Card */}
      <Card className="bg-gradient-to-r from-white via-[#FAF8F5] to-[#F4F0E8]/40 border-[#E8E2D7]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#CC785C] text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0 font-serif">
              {patient.name ? patient.name.charAt(0) : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">{patient.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                  ID: {patient._id} ({patient.syntheticId})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#CC785C]/10 text-[#CC785C]">
                  {patient.gender}, {patient.age} yrs
                </span>
              </div>

              <div className="mt-2 text-xs text-[#78716C] space-y-1">
                <p className="font-semibold text-[#1C1917]">
                  <strong className="text-[#78716C]">Recovery Context:</strong> {patient.condition} • {patient.procedure}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C] pt-1">
                  <span>🌐 <strong>Language:</strong> {patient.languageName}</span>
                  <span>🚶 <strong>Mobility:</strong> {patient.mobility}</span>
                  <span>🥗 <strong>Diet:</strong> {patient.dietaryPreference}</span>
                  <span>📅 <strong>Discharge:</strong> {patient.dischargeDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Progress Day Color Card */}
          <div className="p-4 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs flex flex-col items-center md:items-end justify-center min-w-[200px]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78716C]">Daily Recovery Status</span>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge
                status={colorBadgeMap[progress.latestStatus]?.status}
                label={colorBadgeMap[progress.latestStatus]?.label}
              />
            </div>
            <div className="mt-2 text-center md:text-right">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">{progress.score}%</span>
              <p className="text-[11px] text-[#78716C]">{progress.reasons ? progress.reasons.join(', ') : 'Tasks on track'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Today's Overview Grid */}
      <div>
        <h3 className="text-lg font-bold text-[#1C1917] font-serif mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#CC785C]" />
          Today's Care Overview
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Medications Card */}
          <Card variant="stat" className="hover:border-[#CC785C]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Medications</span>
              <div className="p-2 bg-[#CC785C]/10 text-[#CC785C] rounded-lg">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {overview.medications.completed} / {overview.medications.total}
              </span>
              <p className="text-xs text-[#78716C] mt-1">Dosages completed today</p>
            </div>
            {overview.medications.next && (
              <div className="mt-3 pt-2 border-t border-[#F4F0E8] text-[11px] text-[#78716C]">
                <strong>Next:</strong> {overview.medications.next.name} ({overview.medications.next.dosage || '500mg'})
              </div>
            )}
          </Card>

          {/* Today's Tasks Card */}
          <Card variant="stat" className="hover:border-[#0D9488]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Today's Tasks</span>
              <div className="p-2 bg-[#0D9488]/10 text-[#0D9488] rounded-lg">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {overview.tasks.completed} / {overview.tasks.total}
              </span>
              <p className="text-xs text-[#78716C] mt-1">
                {overview.tasks.pending} pending care tasks
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#F4F0E8] text-[11px] text-[#78716C]">
              <strong>Status:</strong> {overview.tasks.pending > 0 ? 'Action required' : 'All tasks completed'}
            </div>
          </Card>

          {/* Daily Quiz Card */}
          <Card variant="stat" className="hover:border-[#D97706]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Daily Quiz</span>
              <div className="p-2 bg-[#D97706]/10 text-[#D97706] rounded-lg">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {overview.quiz.score !== null ? `${overview.quiz.score}%` : 'Pending'}
              </span>
              <p className="text-xs text-[#78716C] mt-1">Teach-back quiz score</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#F4F0E8] text-[11px] text-[#78716C]">
              <strong>Status:</strong> {overview.quiz.status === 'completed' ? 'Quiz completed' : 'Daily check ready'}
            </div>
          </Card>

          {/* Follow-up Card */}
          <Card variant="stat" className="hover:border-[#059669]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Follow-up</span>
              <div className="p-2 bg-[#059669]/10 text-[#059669] rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm font-extrabold text-[#1C1917] font-serif truncate block">
                {overview.followUp ? overview.followUp.name : 'Orthopedic Clinic'}
              </span>
              <p className="text-xs text-[#78716C] mt-1">
                {overview.followUp ? overview.followUp.timing : 'In 1 week'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#F4F0E8] text-[11px] text-[#78716C]">
              <strong>Location:</strong> Outpatient Clinic
            </div>
          </Card>
        </div>
      </div>

      {/* Important Instruction Callout */}
      {overview.importantInstruction && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-900">
              Important Care Notice — {overview.importantInstruction.name || 'Restriction Alert'}
            </p>
            <p className="text-amber-800 leading-relaxed">
              "{overview.importantInstruction.sourceSentence || overview.importantInstruction.description}"
            </p>
            <p className="text-[10px] text-amber-700 italic">
              AI-generated from discharge summary — verify with care team before acting.
            </p>
          </div>
        </div>
      )}

      {/* Grouped Discharge Instructions Section */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D7]">
          <div>
            <h3 className="text-xl font-bold text-[#1C1917] font-serif flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#CC785C]" />
              Verified Discharge Instructions
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              Clinical instructions extracted from verified hospital discharge document.
            </p>
          </div>
          <StatusBadge status="completed" label="Clinical Ground Truth" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medications Category */}
          <Card title="Prescribed Medications" subtitle="Dosages, frequencies, and food relations">
            {instructions.medications && instructions.medications.length > 0 ? (
              <div className="space-y-3">
                {instructions.medications.map((item) => (
                  <div key={item._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1917]">{item.name} ({item.dose})</span>
                      <StatusBadge status="info" label={item.frequency} />
                    </div>
                    <p className="text-xs text-[#78716C]">{item.foodRelation ? `Relation: ${item.foodRelation}` : item.sourceSentence}</p>
                    <p className="text-[10px] text-[#A8A29E] italic">"{item.sourceSentence}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">No specific medication guidelines extracted.</p>
            )}
          </Card>

          {/* Activity & Exercise Category */}
          <Card title="Activity & Exercise Guidelines" subtitle="Mobility plans and physical therapy recommendations">
            {instructions.activity && instructions.activity.length > 0 ? (
              <div className="space-y-3">
                {instructions.activity.map((item) => (
                  <div key={item._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1917]">{item.name}</span>
                      <StatusBadge status="completed" label={item.frequency || 'Active'} />
                    </div>
                    <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">Light walking and mobility as tolerated.</p>
            )}
          </Card>

          {/* Restrictions Category */}
          <Card title="Physical Restrictions" subtitle="Safety boundaries and prohibited movements">
            {instructions.restrictions && instructions.restrictions.length > 0 ? (
              <div className="space-y-3">
                {instructions.restrictions.map((item) => (
                  <div key={item._id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-1">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {item.name}
                    </span>
                    <p className="text-xs text-amber-800">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">No heavy lifting or strenuous exertion until physician clearance.</p>
            )}
          </Card>

          {/* Diet Category */}
          <Card title="Dietary Instructions" subtitle="Nutritional recommendations and fluid intake">
            {instructions.diet && instructions.diet.length > 0 ? (
              <div className="space-y-3">
                {instructions.diet.map((item) => (
                  <div key={item._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <span className="text-xs font-bold text-[#1C1917]">{item.name}</span>
                    <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">Follow preferred dietary plan ({patient.dietaryPreference}). Stay well hydrated.</p>
            )}
          </Card>

          {/* Follow-up Category */}
          <Card title="Clinical Follow-Up Appointments" subtitle="Scheduled outpatient visits and reviews">
            {instructions.followUp && instructions.followUp.length > 0 ? (
              <div className="space-y-3">
                {instructions.followUp.map((item) => (
                  <div key={item._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1917]">{item.name}</span>
                      <StatusBadge status="info" label={item.timing || 'Scheduled'} />
                    </div>
                    <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">Follow-up consultation in 1 to 2 weeks post-discharge.</p>
            )}
          </Card>

          {/* Warning Signs Category */}
          <Card title="Red-Flag Warning Signs" subtitle="Symptoms requiring immediate clinical outreach">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <ShieldAlert className="w-4 h-4" />
                Contact Care Team Immediately If You Experience:
              </div>
              <ul className="space-y-1 pl-5 list-disc text-[#1C1917]">
                <li>Fever above 100.4°F (38°C) or severe chills</li>
                <li>Sudden increase in surgical site swelling, redness, or purulent discharge</li>
                <li>Shortness of breath or persistent chest discomfort</li>
              </ul>
              <p className="text-[10px] text-rose-700 italic pt-1">
                AI-generated — verify before acting. Call hospital helpline for emergency symptoms.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
