import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import SwipeConfirmButton from '../../components/SwipeConfirmButton';
import {
  getMedicationReminders,
  confirmMedicationTaken
} from '../../services/medicationService';
import { getAllPatients } from '../../services/patientService';
import { useApp } from '../../context/AppContext';
import { Pill, Clock, Calendar, Utensils, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Medication() {
  const { activePatientId, setActivePatientId } = useApp();
  
  const [reminders, setReminders] = useState([]);
  const [allPatientsList, setAllPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Per-reminder processing loading & error state
  const [processingMap, setProcessingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});

  const loadMedications = async (patientId) => {
    try {
      setLoading(true);
      setError(null);
      const [pList, rList] = await Promise.all([
        getAllPatients(),
        getMedicationReminders(patientId)
      ]);
      setAllPatientsList(pList);
      setReminders(rList);
    } catch (err) {
      console.error('Failed to load medication reminders:', err);
      setError('Unable to load medication schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications(activePatientId || 'P001');
  }, [activePatientId]);

  const handleConfirmTaken = async (reminderId) => {
    // Prevent duplicate processing
    if (processingMap[reminderId]) return;

    setProcessingMap((prev) => ({ ...prev, [reminderId]: true }));
    setErrorMap((prev) => ({ ...prev, [reminderId]: null }));

    try {
      const result = await confirmMedicationTaken(reminderId);
      if (result.success) {
        const confirmedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Update local state cleanly
        setReminders((prevReminders) =>
          prevReminders.map((r) =>
            r._id === reminderId
              ? {
                  ...r,
                  status: 'taken',
                  responseType: 'taken',
                  respondedAt: result.data.respondedAt || new Date().toISOString(),
                  confirmedFormattedTime: confirmedTime
                }
              : r
          )
        );
      } else {
        throw new Error('API confirmation failed.');
      }
    } catch (err) {
      console.error(`Error confirming reminder ${reminderId}:`, err);
      setErrorMap((prev) => ({
        ...prev,
        [reminderId]: 'Failed to confirm intake. Please retry.'
      }));
    } finally {
      setProcessingMap((prev) => ({ ...prev, [reminderId]: false }));
    }
  };

  /**
   * Helper function for rendering status according to exact semantic rules
   */
  const getStatusBadgeConfig = (reminder) => {
    const { status, responseType } = reminder;

    if (status === 'taken' || responseType === 'taken') {
      return { status: 'completed', label: '✓ Taken' };
    }
    if (responseType === 'not_taken' || status === 'missed') {
      return { status: 'missed', label: 'Missed' };
    }
    if (status === 'overdue' || responseType === 'no_response') {
      // IMPORTANT SEMANTIC RULE: Display "Not confirmed", NOT "Patient definitely did not take"
      return { status: 'pending', label: 'Not confirmed' };
    }
    if (status === 'reminded') {
      return { status: 'info', label: 'Reminded' };
    }
    return { status: 'info', label: 'Scheduled' };
  };

  if (loading) {
    return (
      <PageContainer title="Medication Schedule & Dosage Log">
        <LoadingState message="Fetching medication reminders & dosage schedules..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Medication Schedule & Dosage Log">
        <ErrorState
          title="Medication Schedule Error"
          message={error}
          onRetry={() => loadMedications(activePatientId || 'P001')}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Medication Schedule & Dosage Confirmation"
      subtitle="Track your daily dosage timing, instructions, and swipe to confirm intake."
      actions={
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-[#78716C] mr-2 hidden sm:inline">Select Patient:</span>
            <select
              value={activePatientId || 'P001'}
              onChange={(e) => setActivePatientId(e.target.value)}
              className="bg-white border border-[#E8E2D7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#CC785C] shadow-2xs cursor-pointer"
            >
              {allPatientsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p._id})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => loadMedications(activePatientId || 'P001')}
            className="p-2 rounded-xl bg-white border border-[#E8E2D7] text-[#78716C] hover:text-[#1C1917] transition-all shadow-2xs"
            title="Refresh Schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {reminders.length === 0 ? (
        <EmptyState
          title="No Medications Scheduled"
          description="There are no active medication reminders for this patient profile."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {reminders.map((med) => {
              const badgeConfig = getStatusBadgeConfig(med);
              const isTaken = med.status === 'taken' || med.responseType === 'taken';
              const confirmedTime = med.confirmedFormattedTime || (med.respondedAt ? new Date(med.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);

              return (
                <Card key={med._id} className="hover:border-[#CC785C]/40 transition-all p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Medication Info */}
                    <div className="flex items-start gap-4">
                      <div className={`p-3.5 rounded-2xl flex-shrink-0 border ${isTaken ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' : 'bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20'}`}>
                        <Pill className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-bold text-[#1C1917] font-serif">{med.medicationName}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#CC785C] border border-[#E8E2D7]">
                            {med.dose}
                          </span>
                          <StatusBadge status={badgeConfig.status} label={badgeConfig.label} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#78716C] pt-1">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#CC785C]" />
                            <strong>Timing:</strong> {med.timing}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
                            <strong>Frequency:</strong> {med.frequency}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#D97706]" />
                            <strong>Meal Instruction:</strong> {med.foodRelation}
                          </span>
                          <span>
                            <strong>Duration:</strong> {med.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Swipe Confirmation Control */}
                    <div className="w-full lg:w-72 flex-shrink-0 pt-2 lg:pt-0">
                      <SwipeConfirmButton
                        onConfirm={() => handleConfirmTaken(med._id)}
                        isConfirmed={isTaken}
                        confirmedTime={confirmedTime}
                        loading={processingMap[med._id] || false}
                        error={errorMap[med._id] || null}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
