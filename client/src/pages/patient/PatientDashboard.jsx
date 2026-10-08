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
  getPatientDischargeInstructions
} from '../../services/patientService';
import { getPatientEncouragements } from '../../services/insightService';
import { useRealtimeSync } from '../../utils/realtimeSync';
import PatientMedicationCalendar from '../../components/patient/PatientMedicationCalendar';
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
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function PatientDashboard() {
  const { currentUser, logout, activePatientId } = useApp();
  const navigate = useNavigate();
  const patientId = activePatientId || currentUser?.patientId || 'P001';

  const [patient, setPatient] = useState(null);
  const [overview, setOverview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [encouragements, setEncouragements] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadDashboardData = async (targetId = patientId) => {
    try {
      setLoading(true);
      setError(null);

      const [pData, oData, prData, iData, encs] = await Promise.all([
        getPatientById(targetId),
        getPatientTodayOverview(targetId),
        getPatientRecoveryProgress(targetId),
        getPatientDischargeInstructions(targetId),
        getPatientEncouragements(targetId)
      ]);

      setPatient(pData);
      setOverview(oData);
      setProgress(prData);
      setInstructions(iData);
      setEncouragements(Array.isArray(encs) ? encs : []);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
      setError('Could not load patient dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSync({
    patientId,
    onUpdate: () => loadDashboardData(patientId),
    pollingInterval: 3000,
    enabled: true
  });

  useEffect(() => {
    loadDashboardData(patientId);
  }, [patientId]);

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
          onRetry={() => loadDashboardData(activePatientId || currentUser?.patientId || 'P001')}
        />
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer title="Patient Recovery Dashboard">
        <EmptyState
          title="No Patient Profile Found"
          description="Please log in with a valid patient profile to view post-discharge guidelines."
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
    <PageContainer>
      {/* Patient Information Card (Top Element) */}
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

      {/* Family Encouragement Alert Banner */}
      {encouragements && encouragements.length > 0 && (
        <div
          onClick={() => navigate('/patient/insights')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-amber-50/40 border border-rose-200 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all cursor-pointer flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1C1917]">
                  Message from {encouragements[0].caregiverName || 'Family'}:
                </span>
                <span className="text-[10px] text-rose-700 font-semibold bg-rose-100/70 px-2 py-0.5 rounded-full">
                  ❤️ Family Encouragement
                </span>
              </div>
              <p className="text-xs text-[#78716C] italic truncate mt-0.5">
                "{encouragements[0].message}"
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#CC785C] hover:underline flex items-center gap-1 flex-shrink-0">
            <span>View in Care Insights</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Monthly Recovery & Medication Calendar with Lab Test Dots & Exact Daily Timings */}
      {instructions && (
        <PatientMedicationCalendar
          patient={patient}
          medications={instructions.medications || []}
          labTests={instructions.labTests || []}
          followUp={instructions.followUp || []}
        />
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
