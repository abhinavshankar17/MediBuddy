import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../Card';
import StatusBadge from '../StatusBadge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Pill,
  Clock,
  TestTube,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  CalendarCheck,
  Stethoscope,
  HeartPulse,
  X,
  Eye,
  ExternalLink,
  ListChecks,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';

export default function PatientMedicationCalendar({
  patient = {},
  medications = [],
  labTests = [],
  followUp = []
}) {
  const popoverRef = useRef(null);

  // Parse discharge date or fallback to 2026-10-05
  const dischargeDateStr = patient?.dischargeDate || '2026-10-05';
  const dischargeDate = new Date(dischargeDateStr);

  // Default calendar month view to October 2026
  const [currentYear, setCurrentYear] = useState(
    isNaN(dischargeDate.getFullYear()) ? 2026 : dischargeDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(dischargeDate.getMonth()) ? 9 : dischargeDate.getMonth() // 9 = October (0-indexed)
  );

  // Active floating popover date (null if closed, or 'YYYY-MM-DD' on click/hover)
  const [activePopoverDateStr, setActivePopoverDateStr] = useState(null);

  // Checked state for lab test preparation checklist items
  const [checkedChecklist, setCheckedChecklist] = useState({});

  const toggleChecklistItem = (itemKey) => {
    setCheckedChecklist((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  // Helper to retrieve or derive actionable pre-lab test preparation checklist
  const getLabPreparationChecklist = (lab) => {
    if (lab?.preparationChecklist && Array.isArray(lab.preparationChecklist) && lab.preparationChecklist.length > 0) {
      return lab.preparationChecklist;
    }
    const nameLower = (lab?.name || '').toLowerCase();
    const instLower = (lab?.instructions || '').toLowerCase();
    const list = [];

    if (
      nameLower.includes('lipid') ||
      nameLower.includes('fasting') ||
      nameLower.includes('glucose') ||
      nameLower.includes('fbg') ||
      nameLower.includes('sugar') ||
      instLower.includes('fasting')
    ) {
      list.push('Strict 8–12 hours overnight fasting before blood collection (plain water is permitted)');
      list.push('Hold morning anti-diabetic or cardiac medications until after blood sample is drawn');
    } else {
      list.push('Take morning medications with water as scheduled (no strict fasting required)');
    }

    if (
      nameLower.includes('x-ray') ||
      nameLower.includes('radiograph') ||
      nameLower.includes('mri') ||
      nameLower.includes('ct') ||
      nameLower.includes('ultrasound') ||
      nameLower.includes('scan')
    ) {
      list.push('Wear loose, comfortable clothing without metal buttons, zippers, or jewelry');
      list.push('Bring previous operative imaging films, X-rays, and hospital discharge summary');
    } else {
      list.push('Stay well-hydrated with 1–2 glasses of drinking water before arrival');
      list.push('Bring official laboratory requisition slip and government ID');
    }

    if (lab?.location) {
      list.push(`Arrive at ${lab.location} at least 15 minutes before ${lab.scheduledTime || '09:00 AM'}`);
    } else {
      list.push('Arrive at the hospital diagnostics department 15 minutes early');
    }

    return list;
  };

  // Calculate maximum medication course duration in days (default 5 days)
  const maxDurationDays = useMemo(() => {
    let maxDays = 5;
    medications.forEach((med) => {
      const match = (med.duration || '').match(/(\d+)\s*day/i);
      if (match && match[1]) {
        const d = parseInt(match[1], 10);
        if (d > maxDays) maxDays = d;
      }
    });
    return maxDays;
  }, [medications]);

  // Calculate medication start and end dates
  const medicationStartDate = new Date(dischargeDateStr);
  const medicationEndDate = new Date(dischargeDateStr);
  medicationEndDate.setDate(medicationEndDate.getDate() + (maxDurationDays - 1));

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleResetToDischarge = () => {
    setCurrentYear(dischargeDate.getFullYear());
    setCurrentMonth(dischargeDate.getMonth());
  };

  // Close floating popover on ESC or outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActivePopoverDateStr(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calendar Grid Calculation
  const { monthName, calendarDays } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const mName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });
    const count = lastDay.getDate();
    const startOffset = firstDay.getDay(); // 0 = Sunday

    const days = [];
    // Leading blanks
    for (let i = 0; i < startOffset; i++) {
      days.push({ isBlank: true, key: `blank-${i}` });
    }
    // Days in current month
    for (let d = 1; d <= count; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const dateObj = new Date(currentYear, currentMonth, d);

      // Check if in active medication period
      const isMedicationDay =
        dateObj >= new Date(dischargeDateStr) &&
        dateObj <= medicationEndDate;

      // Check if discharge day
      const isDischargeDay = dateStr === dischargeDateStr;

      // Check for scheduled lab tests
      const dayLabTests = labTests.filter((lt) => lt.scheduledDate === dateStr);

      days.push({
        isBlank: false,
        dayNumber: d,
        dateStr,
        isMedicationDay,
        isDischargeDay,
        hasLabTest: dayLabTests.length > 0,
        labTests: dayLabTests,
        isActive: dateStr === activePopoverDateStr
      });
    }

    return {
      monthName: mName,
      calendarDays: days
    };
  }, [currentYear, currentMonth, dischargeDateStr, medicationEndDate, labTests, activePopoverDateStr]);

  // Popover Data Calculation for Active Day
  const popoverDayInfo = useMemo(() => {
    if (!activePopoverDateStr) return null;

    const selectedDate = new Date(activePopoverDateStr);
    const isMedDay =
      selectedDate >= new Date(dischargeDateStr) &&
      selectedDate <= medicationEndDate;

    const isDischarge = activePopoverDateStr === dischargeDateStr;
    const dayLabs = labTests.filter((lt) => lt.scheduledDate === activePopoverDateStr);

    // Check for tests scheduled on the following day (to prepare in advance)
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayMonthStr = String(nextDay.getMonth() + 1).padStart(2, '0');
    const nextDayDayStr = String(nextDay.getDate()).padStart(2, '0');
    const nextDayDateStr = `${nextDay.getFullYear()}-${nextDayMonthStr}-${nextDayDayStr}`;
    const tomorrowLabs = labTests.filter((lt) => lt.scheduledDate === nextDayDateStr);

    const dayLabsWithChecklist = dayLabs.map((lab) => ({
      ...lab,
      checklist: getLabPreparationChecklist(lab)
    }));

    const tomorrowLabsWithChecklist = tomorrowLabs.map((lab) => ({
      ...lab,
      checklist: getLabPreparationChecklist(lab)
    }));

    // Recovery Day Calculation
    const diffTime = selectedDate.getTime() - new Date(dischargeDateStr).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const recoveryDayLabel = diffDays > 0 ? `Recovery Day ${diffDays}` : 'Pre-Discharge';

    // Build Time-Slot Schedule for that Day
    const scheduleSlots = [
      {
        id: 'morning',
        title: 'Morning (07:30 AM – 08:30 AM)',
        time: '08:00 AM',
        items: []
      },
      {
        id: 'afternoon',
        title: 'Afternoon (12:30 PM – 01:30 PM)',
        time: '01:00 PM',
        items: []
      },
      {
        id: 'evening',
        title: 'Evening & Night (08:00 PM – 09:30 PM)',
        time: '08:00 PM',
        items: []
      }
    ];

    if (isMedDay) {
      medications.forEach((med) => {
        const freq = (med.frequency || '').toLowerCase();
        const name = med.name;
        const dose = med.dose || 'Standard Dose';
        const food = med.foodRelation || 'With water';

        if (freq.includes('twice') || freq.includes('2 times') || freq.includes('bid')) {
          scheduleSlots[0].items.push({
            name,
            dose,
            food,
            timing: '08:00 AM (After Breakfast)',
            instructions: 'Take 1 tablet with a full glass of water.'
          });
          scheduleSlots[2].items.push({
            name,
            dose,
            food,
            timing: '08:00 PM (After Dinner)',
            instructions: 'Take 1 tablet after meals.'
          });
        } else if (freq.includes('three') || freq.includes('3 times') || freq.includes('tid')) {
          scheduleSlots[0].items.push({
            name,
            dose,
            food,
            timing: '08:00 AM (Morning)',
            instructions: 'Take after breakfast.'
          });
          scheduleSlots[1].items.push({
            name,
            dose,
            food,
            timing: '01:00 PM (Afternoon)',
            instructions: 'Take after lunch.'
          });
          scheduleSlots[2].items.push({
            name,
            dose,
            food,
            timing: '08:00 PM (Night)',
            instructions: 'Take after dinner.'
          });
        } else if (freq.includes('bedtime') || freq.includes('night') || freq.includes('hs')) {
          scheduleSlots[2].items.push({
            name,
            dose,
            food,
            timing: '09:30 PM (At Bedtime)',
            instructions: 'Take before sleeping.'
          });
        } else {
          // Once daily or general
          scheduleSlots[0].items.push({
            name,
            dose,
            food,
            timing: food.includes('before') ? '07:30 AM (Before Breakfast)' : '08:00 AM (After Breakfast)',
            instructions: food.includes('before') ? 'Take 30 mins before breakfast.' : 'Take with morning meal.'
          });
        }
      });
    }

    return {
      dateStr: activePopoverDateStr,
      formattedDate: selectedDate.toLocaleDateString('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      fullFormattedDate: selectedDate.toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      recoveryDayLabel,
      isMedDay,
      isDischarge,
      dayLabs: dayLabsWithChecklist,
      tomorrowLabs: tomorrowLabsWithChecklist,
      scheduleSlots
    };
  }, [activePopoverDateStr, dischargeDateStr, medicationEndDate, labTests, medications]);

  return (
    <div className="relative">
      <Card className="bg-white border-[#E8E2D7] shadow-sm p-4 sm:p-5">
        {/* Compact Header: Title + Legend + Month Navigation in a single clean row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CC785C]/10 text-[#CC785C] flex items-center justify-center font-bold flex-shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1917] font-serif">
                Recovery & Medication Calendar
              </h3>
              <p className="text-[11px] text-[#78716C]">
                Click any day to inspect exact dosage times & scheduled lab tests
              </p>
            </div>
          </div>

          {/* Month Controls & Legend */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Legend Pills */}
            <div className="flex items-center gap-3 text-[10px] text-[#78716C] bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#E8E2D7]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#CC785C]/20 border border-[#CC785C]" />
                <span>Rx Days</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600 ring-2 ring-purple-200" />
                <span className="font-semibold text-purple-900">Lab Test</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488] text-white flex items-center justify-center text-[7px] font-bold">
                  ★
                </span>
                <span>Discharge</span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-[#78716C] hover:text-[#1C1917] transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-bold text-[#1C1917] min-w-[110px] text-center font-serif">
                {monthName}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-[#78716C] hover:text-[#1C1917] transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact 7-Day Month Grid (No scrolling needed) */}
        <div className="mt-3">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#78716C] uppercase pb-1">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell) => {
              if (cell.isBlank) {
                return <div key={cell.key} className="h-10 sm:h-11 rounded-lg bg-[#FAF8F5]/30" />;
              }

              const isOpened = activePopoverDateStr === cell.dateStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setActivePopoverDateStr(isOpened ? null : cell.dateStr)}
                  className={`group relative h-10 sm:h-11 rounded-xl p-1 flex flex-col justify-between items-center transition-all cursor-pointer border text-center ${
                    isOpened
                      ? 'border-[#CC785C] bg-[#CC785C]/15 ring-2 ring-[#CC785C]/40 shadow-xs'
                      : cell.isDischargeDay
                      ? 'border-[#0D9488] bg-[#0D9488]/10 text-[#0D9488] font-extrabold hover:border-[#0D9488]'
                      : cell.isMedicationDay
                      ? 'border-[#CC785C]/35 bg-[#FAF8F5] hover:border-[#CC785C] hover:bg-[#CC785C]/10 text-[#1C1917]'
                      : 'border-transparent bg-white hover:bg-[#FAF8F5] text-[#A8A29E]'
                  }`}
                >
                  {/* Day Number and Badges */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isOpened
                          ? 'text-[#CC785C]'
                          : cell.isDischargeDay
                          ? 'text-[#0D9488]'
                          : cell.isMedicationDay
                          ? 'text-[#1C1917]'
                          : 'text-[#A8A29E]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Small Dot / Marker */}
                    {cell.isDischargeDay ? (
                      <span className="text-[8px] font-bold bg-[#0D9488] text-white px-1 rounded-sm leading-tight">
                        ★
                      </span>
                    ) : cell.hasLabTest ? (
                      <span
                        title="Scheduled Lab Test"
                        className="w-2 h-2 rounded-full bg-purple-600 ring-2 ring-purple-200 animate-pulse"
                      />
                    ) : null}
                  </div>

                  {/* Micro Indicator Label */}
                  <div className="w-full flex items-center justify-center gap-0.5 text-[9px] leading-none">
                    {cell.isMedicationDay && (
                      <span className="text-[#CC785C] font-semibold flex items-center gap-0.5">
                        <Pill className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Rx</span>
                      </span>
                    )}
                    {cell.hasLabTest && (
                      <span className="text-purple-700 font-bold sm:hidden">•</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* FLOATING HOVER / CLICK POPOVER (OVERLAYED RIGHT ON TOP OF THE CALENDAR) */}
      {popoverDayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div
            ref={popoverRef}
            className="relative w-full max-w-lg bg-white border border-[#E8E2D7] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-[#1C1917] font-serif">
                    {popoverDayInfo.fullFormattedDate}
                  </h4>
                  <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-md text-[10px] font-bold text-[#CC785C] uppercase">
                    {popoverDayInfo.recoveryDayLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Scheduled medication consumption times & diagnostic investigations
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePopoverDateStr(null)}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF8F5] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheduled Lab Test Banner & Pre-Test Checklist (if present on this date) */}
            {popoverDayInfo.dayLabs.length > 0 && (
              <div className="space-y-3">
                {popoverDayInfo.dayLabs.map((lab) => {
                  const items = lab.checklist || [];
                  const total = items.length;
                  const completed = items.filter((item, idx) => checkedChecklist[`${lab._id || lab.name}-${idx}`]).length;

                  return (
                    <div
                      key={lab._id || lab.name}
                      className="p-4 bg-purple-50/90 border border-purple-200 rounded-2xl space-y-3 shadow-2xs"
                    >
                      {/* Lab Header */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <TestTube className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 text-xs flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-purple-950 uppercase tracking-wider">
                              Scheduled Lab Test / Scan
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                              {lab.scheduledTime || '09:30 AM'}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-purple-950 font-serif text-sm">{lab.name}</h5>
                          <p className="text-purple-800 text-[11px]">
                            <strong>Location:</strong> {lab.location || 'Hospital Diagnostics Center'}
                          </p>
                          {lab.instructions && (
                            <p className="text-purple-700 text-[10px]">
                              <strong>Clinical Note:</strong> {lab.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Pre-Lab Test Checklist */}
                      {items.length > 0 && (
                        <div className="pt-2 border-t border-purple-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-purple-950">
                              <ListChecks className="w-4 h-4 text-purple-700" />
                              <span className="text-xs font-bold font-serif">
                                Necessary Before the Lab Test (Pre-Test Checklist)
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              completed === total
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-purple-200/70 text-purple-900'
                            }`}>
                              {completed === total ? '✓ All Prepared' : `${completed}/${total} Prepared`}
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-0.5">
                            {items.map((checkItem, idx) => {
                              const itemKey = `${lab._id || lab.name}-${idx}`;
                              const isChecked = !!checkedChecklist[itemKey];

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => toggleChecklistItem(itemKey)}
                                  className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-start gap-2.5 border cursor-pointer ${
                                    isChecked
                                      ? 'bg-purple-100/60 border-purple-300 text-purple-950'
                                      : 'bg-white border-purple-200/70 text-purple-900 hover:bg-purple-50'
                                  }`}
                                >
                                  <div className="mt-0.5 flex-shrink-0">
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-purple-700" />
                                    ) : (
                                      <Square className="w-4 h-4 text-purple-400" />
                                    )}
                                  </div>
                                  <span className={`flex-1 leading-snug ${isChecked ? 'line-through text-purple-700 font-medium' : 'font-medium'}`}>
                                    {checkItem}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upcoming Tomorrow Lab Test Preparation Alert (if test is tomorrow) */}
            {popoverDayInfo.dayLabs.length === 0 && popoverDayInfo.tomorrowLabs.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-amber-950">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Upcoming Lab Test Tomorrow
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                        Tomorrow at {popoverDayInfo.tomorrowLabs[0]?.scheduledTime || '09:00 AM'}
                      </span>
                    </div>
                    <h5 className="font-extrabold text-amber-950 font-serif text-sm mt-0.5">
                      {popoverDayInfo.tomorrowLabs[0]?.name}
                    </h5>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Review pre-test instructions today so you are fully prepared for tomorrow morning.
                    </p>
                  </div>
                </div>

                {/* Tomorrow's Preparation Checklist */}
                {popoverDayInfo.tomorrowLabs[0]?.checklist?.length > 0 && (
                  <div className="pt-2 border-t border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-950">
                        <ListChecks className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold font-serif">
                          Necessary Before Tomorrow's Lab Test
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      {popoverDayInfo.tomorrowLabs[0].checklist.map((checkItem, idx) => {
                        const itemKey = `tomorrow-${popoverDayInfo.tomorrowLabs[0]._id || 'lab'}-${idx}`;
                        const isChecked = !!checkedChecklist[itemKey];

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleChecklistItem(itemKey)}
                            className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-start gap-2.5 border cursor-pointer ${
                              isChecked
                                ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                                : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50/50'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-700" />
                              ) : (
                                <Square className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <span className={`flex-1 leading-snug ${isChecked ? 'line-through text-amber-700 font-medium' : 'font-medium'}`}>
                              {checkItem}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Medication Timings Breakdown */}
            {popoverDayInfo.isMedDay ? (
              <div className="space-y-3">
                <div className="space-y-2.5">
                  {popoverDayInfo.scheduleSlots.map((slot) => {
                    const hasItems = slot.items.length > 0;
                    if (!hasItems) return null;

                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#E8E2D7]">
                          <span className="font-bold text-xs text-[#1C1917]">
                            {slot.title}
                          </span>
                          <span className="text-[10px] font-bold text-[#CC785C] bg-white px-2 py-0.5 rounded-md border border-[#E8E2D7]">
                            {slot.time}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {slot.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[#1C1917] font-serif">
                                  {item.name}
                                </span>
                                <span className="text-[11px] font-bold text-[#0D9488]">
                                  {item.dose}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#CC785C] font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#CC785C] flex-shrink-0" />
                                <span>{item.timing} • {item.food}</span>
                              </p>
                              <p className="text-[10px] text-[#78716C]">{item.instructions}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Directive Note */}
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Take medications with plenty of water and follow meal guidelines.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-[#FAF8F5] border border-dashed border-[#E8E2D7] rounded-2xl space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-[#059669] mx-auto" />
                <h5 className="text-xs font-bold text-[#1C1917]">No Prescribed Medications on this Date</h5>
                <p className="text-[11px] text-[#78716C]">
                  This date is outside the active {maxDurationDays}-day post-discharge prescription course.
                </p>
              </div>
            )}

            {/* Footer Close Button */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setActivePopoverDateStr(null)}
                className="px-4 py-2 bg-[#CC785C] hover:bg-[#B6664C] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Close Day Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
