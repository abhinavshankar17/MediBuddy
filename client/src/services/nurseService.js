import patientsData from '../../../data/mock/patients.json';
import medicationRemindersData from '../../../data/mock/medicationReminders.json';
import quizSessionsData from '../../../data/mock/quizSessions.json';
import patientInsightsData from '../../../data/mock/patientInsights.json';
import escalationsData from '../../../data/mock/escalations.json';
import nurseBriefsData from '../../../data/mock/nurseBriefs.json';
import eventsData from '../../../data/mock/events.json';

/**
 * Service adapter for Nurse Dashboard & Clinical Management.
 */
export async function getNurseCohortOverview() {
  try {
    const res = await fetch('/api/nurse/dashboard-overview');
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // Backend endpoint offline, fallback to mock calculation
  }

  const totalPatients = patientsData.length;
  const activeEscalations = escalationsData.filter((e) => e.status !== 'RESOLVED').length;

  let totalConfirmedMeds = 0;
  let totalMeds = 0;
  medicationRemindersData.forEach((m) => {
    totalMeds += 1;
    if (m.status === 'taken' || m.responseType === 'taken') {
      totalConfirmedMeds += 1;
    }
  });
  const medAdherenceRate = Math.round((totalConfirmedMeds / Math.max(1, totalMeds)) * 100);

  let totalQuizScore = 0;
  let completedQuizzes = 0;
  quizSessionsData.forEach((qs) => {
    if (qs.score !== null && qs.score !== undefined) {
      totalQuizScore += qs.score;
      completedQuizzes += 1;
    }
  });
  const avgQuizScore = Math.round(totalQuizScore / Math.max(1, completedQuizzes));

  return {
    totalPatients,
    activeEscalations,
    medAdherenceRate,
    avgQuizScore
  };
}

export async function getNursePatientList(priorityFilter = 'ALL', searchQuery = '') {
  try {
    const queryParam = priorityFilter !== 'ALL' ? `?priority=${priorityFilter}` : '';
    const res = await fetch(`/api/nurse/patients${queryParam}`);
    if (res.ok) {
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      const rawList = Array.isArray(payload) ? payload : (payload.patients || []);
      if (rawList.length > 0) {
        let mapped = rawList.map((item) => {
          if (item._id && item.name && item.medicationOverview) return item;
          const p = item.patient || item;
          const medAdh = item.medicationAdherence || {};
          const quizPerf = item.quizPerformance || {};
          const latestEvt = item.latestRelevantEvents && item.latestRelevantEvents.length > 0 ? item.latestRelevantEvents[0] : null;
          const latestEventText = latestEvt
            ? `${latestEvt._id}: ${latestEvt.type.replace('_', ' ')} (${new Date(latestEvt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
            : 'No recent events';
          return {
            _id: p._id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            recoveryContext: `${p.condition || ''} • ${p.procedure || p.surgery || ''}`.trim().replace(/^•|•$/g, ''),
            medicationOverview: {
              confirmed: medAdh.confirmed || 0,
              notConfirmed: medAdh.notConfirmed || 0,
              missed: medAdh.missed || 0
            },
            quizOverview: {
              scoreDisplay: quizPerf.correct !== undefined ? `${quizPerf.correct} / ${quizPerf.total || 5}` : 'N/A',
              percentage: quizPerf.score ?? 80,
              knowledgeGaps: item.knowledgeGaps || []
            },
            priority: item.priority || 'LOW',
            flags: item.flags || [],
            latestEvent: latestEventText
          };
        });

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          mapped = mapped.filter((p) =>
            p.name.toLowerCase().includes(q) || p._id.toLowerCase().includes(q) || p.recoveryContext.toLowerCase().includes(q)
          );
        }
        return mapped;
      }
    }
  } catch (err) {
    // Backend offline, fallback to joined dataset
  }

  const list = patientsData.map((patient) => {
    const pId = patient._id;

    // Meds breakdown strictly filtered by patientId
    const pReminders = medicationRemindersData.filter((m) => m.patientId === pId);
    const confirmedCount = pReminders.filter((m) => m.status === 'taken' || m.responseType === 'taken').length;
    const missedCount = pReminders.filter((m) => m.status === 'missed' || m.responseType === 'not_taken').length;
    const notConfirmedCount = Math.max(0, pReminders.length - confirmedCount - missedCount);

    // Quiz score strictly filtered by patientId
    const pQuiz = quizSessionsData.find((qs) => qs.patientId === pId);
    const correctCount = pQuiz && pQuiz.score !== null ? Math.round((pQuiz.score / 100) * 5) : 4;
    const quizDisplay = `${correctCount} / 5`;

    // Insights & Gaps
    const pInsight = patientInsightsData.find((pi) => pi.patientId === pId);
    const knowledgeGaps = pInsight ? pInsight.weaknesses : [];
    const priority = pInsight ? pInsight.priority : (pId === 'P005' || pId === 'P003' ? 'HIGH' : 'LOW');

    // Nurse brief flags
    const pBrief = nurseBriefsData.find((nb) => nb.patientId === pId);
    const flags = pBrief ? pBrief.flags : ['routine monitoring'];

    // Latest relevant event
    const pEvents = eventsData.filter((e) => e.patientId === pId);
    const latestEvt = pEvents[pEvents.length - 1];
    const latestEventText = latestEvt
      ? `${latestEvt._id}: ${latestEvt.type.replace('_', ' ')} (${new Date(latestEvt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      : 'No recent events';

    return {
      _id: pId,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      recoveryContext: `${patient.condition} • ${patient.procedure}`,
      medicationOverview: {
        confirmed: confirmedCount,
        notConfirmed: notConfirmedCount,
        missed: missedCount
      },
      quizOverview: {
        scoreDisplay: quizDisplay,
        percentage: pQuiz ? pQuiz.score : 80,
        knowledgeGaps
      },
      priority,
      flags,
      latestEvent: latestEventText
    };
  });

  let filtered = list;
  if (priorityFilter !== 'ALL') {
    filtered = filtered.filter((p) => p.priority === priorityFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(q) || p._id.toLowerCase().includes(q) || p.recoveryContext.toLowerCase().includes(q)
    );
  }

  return filtered;
}

export async function getNurseAlerts(categoryFilter = 'ALL', statusFilter = 'ALL') {
  try {
    const params = new URLSearchParams();
    if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/nurse/alerts${queryString}`);
    if (res.ok) {
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      const rawAlerts = Array.isArray(payload) ? payload : (payload.escalations || payload.alerts || []);
      if (rawAlerts.length > 0) {
        return rawAlerts.map((esc) => {
          const categoryLabels = {
            missed_medication: 'Missed Medication',
            repeated_missed_medication: 'Repeated Missed Medication',
            low_quiz_score: 'Low Quiz Score',
            knowledge_gap: 'Knowledge Gap',
            medication_question: 'Medication Question',
            warning_sign: 'Warning Sign Alert',
            missing_information: 'Missing Information',
            overdue_task: 'Overdue Task'
          };
          const formattedCategory = categoryLabels[esc.category] || (esc.category || '').replace(/_/g, ' ').toUpperCase();
          const timestampStr = esc.timestamp || '2026-10-08T10:00:00+05:30';
          const p = esc.patient || patientsData.find((pt) => pt._id === esc.patientId);
          return {
            _id: esc._id,
            patientId: esc.patientId,
            patientName: esc.patientName || (p ? p.name : esc.patientId),
            patientAge: esc.patientAge || (p ? p.age : null),
            patientGender: esc.patientGender || (p ? p.gender : null),
            recoveryContext: esc.recoveryContext || (p ? `${p.condition} • ${p.procedure}` : 'Post-Discharge Recovery'),
            category: esc.category,
            formattedCategory,
            severity: esc.severity || esc.priority || 'MEDIUM',
            priority: esc.priority || esc.severity || 'MEDIUM',
            reason: esc.reason || esc.description || '',
            evidence: esc.evidence || [],
            relatedMedication: esc.relatedMedication || null,
            relatedEvent: esc.relatedEvent || esc.relatedEventId || null,
            timestamp: timestampStr,
            formattedTimestamp: new Date(timestampStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            status: esc.status || 'OPEN',
            assignedTo: esc.assignedTo || 'Unassigned',
            resolvedBy: esc.resolvedBy || null,
            resolution: esc.resolution || null
          };
        });
      }
    }
  } catch (err) {
    // Fallback alerts from mock dataset
  }

  const list = escalationsData.map((esc) => {
    const p = patientsData.find((pt) => pt._id === esc.patientId);
    
    // Category label formatter
    const categoryLabels = {
      missed_medication: 'Missed Medication',
      repeated_missed_medication: 'Repeated Missed Medication',
      low_quiz_score: 'Low Quiz Score',
      knowledge_gap: 'Knowledge Gap',
      medication_question: 'Medication Question',
      warning_sign: 'Warning Sign Alert',
      missing_information: 'Missing Information',
      overdue_task: 'Overdue Task'
    };

    const formattedCategory = categoryLabels[esc.category] || esc.category.replace(/_/g, ' ').toUpperCase();
    const timestampStr = esc.timestamp || '2026-10-08T10:00:00+05:30';

    return {
      _id: esc._id,
      patientId: esc.patientId,
      patientName: p ? p.name : esc.patientId,
      patientAge: p ? p.age : null,
      patientGender: p ? p.gender : null,
      recoveryContext: p ? `${p.condition} • ${p.procedure}` : 'Post-Discharge Recovery',
      category: esc.category,
      formattedCategory,
      severity: esc.severity, // EXACT backend severity: HIGH, MEDIUM, LOW - NEVER INVENTED
      priority: esc.severity, // preserve priority if supplied
      reason: esc.reason,
      evidence: esc.evidence || [],
      relatedMedication: esc.relatedMedication || null,
      relatedEvent: esc.relatedEvent || null,
      timestamp: timestampStr,
      formattedTimestamp: new Date(timestampStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      status: esc.status || 'OPEN',
      assignedTo: esc.assignedTo || 'Unassigned',
      resolvedBy: esc.resolvedBy || null,
      resolution: esc.resolution || null
    };
  });

  let filtered = list;
  if (categoryFilter !== 'ALL') {
    filtered = filtered.filter((e) => e.category === categoryFilter);
  }
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((e) => e.status === statusFilter);
  }

  return filtered;
}

export async function resolveNurseEscalation(escalationId, resolutionNotes = 'Verified and addressed by nurse.') {
  try {
    const res = await fetch(`/api/escalations/${escalationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolvedBy: 'N001',
        resolution: resolutionNotes
      })
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // fallback
  }

  const esc = escalationsData.find((e) => e._id === escalationId);
  if (esc) {
    esc.status = 'RESOLVED';
    esc.resolvedBy = 'N001';
    esc.resolution = resolutionNotes;
  }
  return esc;
}

/**
 * Detailed Nurse Patient Record API with strict patientId isolation
 */
export async function getNursePatientDetail(patientId = 'P001') {
  try {
    const res = await fetch(`/api/nurse/patients/${patientId}`);
    if (res.ok) {
      const json = await res.json();
      const detail = json.data !== undefined ? json.data : json;
      if (detail && (detail.patient || detail._id)) {
        const p = detail.patient || detail;
        const languages = { en: 'English', ta: 'Tamil (தமிழ்)', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)' };
        const languageName = languages[p.language] || p.language;

        let recoveryDay = 'Day 3';
        if (p.dischargeDate) {
          const discharge = new Date(p.dischargeDate);
          const today = new Date('2026-10-08');
          const diff = Math.max(1, Math.floor((today - discharge) / (1000 * 60 * 60 * 24)) + 1);
          recoveryDay = `Day ${diff}`;
        }

        const patientReminders = detail.reminders || medicationRemindersData.filter((m) => m.patientId === patientId);
        const medicationTable = patientReminders.map((rem) => {
          const scheduledTime = rem.scheduledAt
            ? new Date(rem.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '08:00';

          let statusDisplay = 'Not confirmed';
          let statusBadgeType = 'pending';

          if (rem.status === 'taken' || rem.responseType === 'taken') {
            statusDisplay = 'Confirmed';
            statusBadgeType = 'completed';
          } else if (rem.status === 'missed' || rem.responseType === 'not_taken') {
            statusDisplay = 'Not taken';
            statusBadgeType = 'missed';
          } else if (rem.status === 'overdue' || rem.responseType === 'no_response') {
            statusDisplay = 'Not confirmed';
            statusBadgeType = 'pending';
          } else if (rem.status === 'reminded') {
            statusDisplay = 'Reminded';
            statusBadgeType = 'info';
          } else {
            statusDisplay = 'Scheduled';
            statusBadgeType = 'info';
          }

          return {
            _id: rem._id,
            medication: `${rem.medicationName || 'Prescribed Med'} ${rem.dose || ''}`.trim(),
            scheduled: scheduledTime,
            statusDisplay,
            statusBadgeType,
            respondedAt: rem.respondedAt ? new Date(rem.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            supportingEventId: rem.supportingEventId || (rem.status === 'taken' ? 'E101' : null)
          };
        });

        const medicationEventTypes = [
          'reminder_sent',
          'reminder_opened',
          'medication_taken',
          'medication_not_taken',
          'medication_missed',
          'task_completed',
          'task_skipped'
        ];

        const rawEvents = detail.latestRelevantEvents || eventsData.filter((e) => e.patientId === patientId);
        const patientEvents = rawEvents
          .filter((e) => medicationEventTypes.includes(e.type))
          .map((evt) => ({
            _id: evt._id,
            type: evt.type,
            displayType: evt.type.replace('_', ' ').toUpperCase(),
            timestamp: new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            rawTimestamp: evt.timestamp,
            actor: evt.actor || patientId,
            payload: evt.payload || {}
          }));

        return {
          patient: {
            ...p,
            languageName,
            recoveryDay,
            priority: detail.priority || (patientId === 'P005' || patientId === 'P003' ? 'HIGH' : 'LOW'),
            recoveryContext: `${p.condition || ''} • ${p.procedure || p.surgery || ''}`.trim().replace(/^•|•$/g, '')
          },
          medicationTable,
          patientEvents,
          ...detail
        };
      }
    }
  } catch (err) {
    // Backend offline, fallback to strict mock isolation
  }

  // 1. Patient Record
  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  const pId = patient._id;

  // Language mapping
  const languages = { en: 'English', ta: 'Tamil (தமிழ்)', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)' };
  const languageName = languages[patient.language] || patient.language;

  // Recovery Day
  let recoveryDay = 'Day 3';
  if (patient.dischargeDate) {
    const discharge = new Date(patient.dischargeDate);
    const today = new Date('2026-10-08');
    const diff = Math.max(1, Math.floor((today - discharge) / (1000 * 60 * 60 * 24)) + 1);
    recoveryDay = `Day ${diff}`;
  }

  // Insight & Priority
  const insight = patientInsightsData.find((pi) => pi.patientId === pId);
  const priority = insight ? insight.priority : (pId === 'P005' || pId === 'P003' ? 'HIGH' : 'LOW');

  // 2. Medication Adherence Table (STRICTLY FILTERED BY pId)
  const patientReminders = medicationRemindersData.filter((m) => m.patientId === pId);
  
  const medicationTable = patientReminders.map((rem) => {
    const scheduledTime = rem.scheduledAt
      ? new Date(rem.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '08:00';

    // SEMANTIC RULE:
    // If no response -> "Not confirmed" (NEVER automatically display "Not taken")
    // If explicitly responseType === 'taken' -> "Confirmed"
    // If explicitly responseType === 'not_taken' or status === 'missed' -> "Not taken"
    let statusDisplay = 'Not confirmed';
    let statusBadgeType = 'pending';

    if (rem.status === 'taken' || rem.responseType === 'taken') {
      statusDisplay = 'Confirmed';
      statusBadgeType = 'completed';
    } else if (rem.status === 'missed' || rem.responseType === 'not_taken') {
      statusDisplay = 'Not taken';
      statusBadgeType = 'missed';
    } else if (rem.status === 'overdue' || rem.responseType === 'no_response') {
      statusDisplay = 'Not confirmed';
      statusBadgeType = 'pending';
    } else if (rem.status === 'reminded') {
      statusDisplay = 'Reminded';
      statusBadgeType = 'info';
    } else {
      statusDisplay = 'Scheduled';
      statusBadgeType = 'info';
    }

    // Find supporting event ID for evidence inspection
    const matchingEvt = eventsData.find((e) => e.patientId === pId && e.reminderId === rem._id);

    return {
      _id: rem._id,
      medication: `${rem.medicationName || 'Prescribed Med'} ${rem.dose || ''}`.trim(),
      scheduled: scheduledTime,
      statusDisplay,
      statusBadgeType,
      respondedAt: rem.respondedAt ? new Date(rem.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      supportingEventId: matchingEvt ? matchingEvt._id : (rem.status === 'taken' ? 'E101' : null)
    };
  });

  // 3. Relevant Medication Event History (STRICTLY FILTERED BY pId)
  const medicationEventTypes = [
    'reminder_sent',
    'reminder_opened',
    'medication_taken',
    'medication_not_taken',
    'medication_missed',
    'task_completed',
    'task_skipped'
  ];

  const patientEvents = eventsData
    .filter((e) => e.patientId === pId && medicationEventTypes.includes(e.type))
    .map((evt) => ({
      _id: evt._id,
      type: evt.type,
      displayType: evt.type.replace('_', ' ').toUpperCase(),
      timestamp: new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      rawTimestamp: evt.timestamp,
      actor: evt.actor || pId,
      payload: evt.payload || {}
    }));

  return {
    patient: {
      ...patient,
      languageName,
      recoveryDay,
      priority,
      recoveryContext: `${patient.condition} • ${patient.procedure}`
    },
    medicationTable,
    patientEvents
  };
}

/**
 * Service function to retrieve AI Patient Summary for a single patient
 */
export async function getNurseAIBrief(patientId = 'P001') {
  let backendBrief = null;
  try {
    const res = await fetch(`/api/nurse/briefs/${patientId}`);
    if (res.ok) {
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      if (payload && (payload.patientId || payload._id)) {
        backendBrief = payload;
      }
    }
  } catch (err) {
    // Backend offline, fallback to mock joined dataset
  }

  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  const pId = patient._id;

  const brief = backendBrief || nurseBriefsData.find((b) => b.patientId === pId) || nurseBriefsData[0];

  // Resolve evidence events
  const evidenceIds = brief.evidenceEventIds || [];
  const evidenceEvents = eventsData
    .filter((e) => evidenceIds.includes(e._id) || (e.patientId === pId && ['medication_taken', 'medication_missed', 'quiz_completed'].includes(e.type)))
    .slice(0, 6)
    .map((evt) => {
      let category = 'Relevant Event';
      if (evt.type.includes('medication')) category = 'Medication Event';
      else if (evt.type.includes('quiz') || evt.type.includes('teach_back')) category = 'Quiz Question / Answer';
      else if (evt.type.includes('instruction') || evt.type.includes('task')) category = 'Source Discharge Instruction';

      return {
        _id: evt._id,
        category,
        type: evt.type,
        timestamp: new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        actor: evt.actor || pId,
        payload: evt.payload || {}
      };
    });

  // Medication adherence calculation
  const pReminders = medicationRemindersData.filter((m) => m.patientId === pId);
  const confirmedMeds = pReminders.filter((m) => m.status === 'taken' || m.responseType === 'taken').length;
  const totalMeds = pReminders.length || 3;

  const medAdherenceDisplay = brief.medicationAdherence
    ? `${brief.medicationAdherence.confirmed} / ${brief.medicationAdherence.total} confirmed`
    : `${confirmedMeds} / ${totalMeds} confirmed`;

  // Quiz display calculation
  const pQuiz = quizSessionsData.find((qs) => qs.patientId === pId);
  const quizCorrect = brief.quizPerformance
    ? brief.quizPerformance.correct
    : (pQuiz && pQuiz.score ? Math.round((pQuiz.score / 100) * 5) : 4);
  const quizTotal = brief.quizPerformance ? brief.quizPerformance.total : 5;
  const quizDisplay = `${quizCorrect} / ${quizTotal}`;

  // Questions for nurse
  const questionsForNurse = brief.questionsForNurse || brief.questions || [
    `Confirm whether ${patient.name} understands when to take the prescribed medication.`,
    `Reinforce post-discharge recovery guidelines.`
  ];

  // Knowledge gaps
  const pInsight = patientInsightsData.find((pi) => pi.patientId === pId);
  const knowledgeGaps = brief.knowledgeGaps && brief.knowledgeGaps.length > 0
    ? brief.knowledgeGaps
    : (pInsight ? pInsight.weaknesses : ['Medication timing']);

  return {
    _id: brief._id,
    patientId: pId,
    patientName: patient.name,
    patientAge: patient.age,
    patientGender: patient.gender,
    recoveryContext: `${patient.condition} • ${patient.procedure}`,
    priority: brief.priority || (pId === 'P005' || pId === 'P003' ? 'HIGH' : 'LOW'),
    medicationAdherenceDisplay: medAdherenceDisplay,
    quizDisplay: quizDisplay,
    knowledgeGaps: knowledgeGaps,
    keyObservation: brief.aiSummary || brief.summary,
    questionsForNurse: questionsForNurse,
    recommendedFollowUp: brief.recommendedFollowUp || brief.recommendedAction || 'Routine nurse review.',
    evidenceEvents: evidenceEvents,
    aiGenerated: true,
    generatedAt: brief.generatedAt || '2026-10-08T13:10:00+05:30'
  };
}

/**
 * Service function to retrieve all AI summaries for the cohort list
 */
export async function getNurseAIBriefsList() {
  try {
    const res = await fetch('/api/nurse/briefs');
    if (res.ok) {
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      const briefs = Array.isArray(payload) ? payload : (payload.briefs || []);
      if (briefs.length > 0) {
        return Promise.all(briefs.map((b) => getNurseAIBrief(b.patientId)));
      }
    }
  } catch (err) {
    // Backend offline
  }

  const listPromises = patientsData.map((p) => getNurseAIBrief(p._id));
  return await Promise.all(listPromises);
}

/**
 * Service function for cohort-wide Medication Adherence analytics
 */
export async function getMedicationAdherenceCohort() {
  let totalDosages = 0;
  let totalConfirmed = 0;
  let totalNotConfirmed = 0;
  let totalMissed = 0;

  const patientRows = patientsData.map((patient) => {
    const pId = patient._id;
    const reminders = medicationRemindersData.filter((m) => m.patientId === pId);

    const medsList = reminders.map((r) => {
      let statusDisplay = 'Not confirmed';
      let badgeType = 'pending';

      if (r.status === 'taken' || r.responseType === 'taken') {
        statusDisplay = 'Confirmed';
        badgeType = 'completed';
      } else if (r.status === 'missed' || r.responseType === 'not_taken') {
        statusDisplay = 'Missed';
        badgeType = 'missed';
      } else if (r.status === 'overdue' || r.responseType === 'no_response') {
        statusDisplay = 'Not confirmed';
        badgeType = 'pending';
      } else {
        statusDisplay = 'Scheduled';
        badgeType = 'info';
      }

      return {
        _id: r._id,
        name: r.medicationName || 'Prescribed Med',
        dose: r.dose || '',
        scheduledAt: r.scheduledAt ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00',
        statusDisplay,
        badgeType
      };
    });

    const confirmed = medsList.filter((m) => m.statusDisplay === 'Confirmed').length;
    const missed = medsList.filter((m) => m.statusDisplay === 'Missed').length;
    const notConfirmed = medsList.filter((m) => m.statusDisplay === 'Not confirmed' || m.statusDisplay === 'Scheduled').length;
    const total = medsList.length;

    totalDosages += total;
    totalConfirmed += confirmed;
    totalNotConfirmed += notConfirmed;
    totalMissed += missed;

    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 100;

    const insight = patientInsightsData.find((pi) => pi.patientId === pId);
    const priority = insight ? insight.priority : (pId === 'P005' || pId === 'P003' ? 'HIGH' : 'LOW');

    return {
      patientId: pId,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender,
      recoveryContext: `${patient.condition} • ${patient.procedure}`,
      priority,
      medications: medsList,
      confirmedCount: confirmed,
      notConfirmedCount: notConfirmed,
      missedCount: missed,
      totalCount: total,
      adherenceRate: rate
    };
  });

  const overallRate = totalDosages > 0 ? Math.round((totalConfirmed / totalDosages) * 100) : 85;

  return {
    summary: {
      overallComplianceRate: overallRate,
      totalDosages,
      totalConfirmed,
      totalNotConfirmed,
      totalMissed
    },
    patientRows
  };
}

/**
 * Service function for cohort-wide Quiz analytics & Knowledge Gaps
 */
export async function getQuizAnalyticsCohort() {
  const patientScores = patientsData.map((patient) => {
    const pId = patient._id;
    const session = quizSessionsData.find((qs) => qs.patientId === pId);
    const insight = patientInsightsData.find((pi) => pi.patientId === pId);
    const brief = nurseBriefsData.find((nb) => nb.patientId === pId);

    const isCompleted = session && session.status === 'COMPLETED' && session.score !== null;
    const score = isCompleted ? session.score : (brief?.quizPerformance?.score ?? 80);
    const correctCount = Math.round((score / 100) * 5);

    const strengths = insight ? insight.strengths : ['Follow-up awareness'];
    const weaknesses = brief?.knowledgeGaps?.length ? brief.knowledgeGaps : (insight?.weaknesses || []);

    const priority = brief ? brief.priority : (pId === 'P005' || pId === 'P003' ? 'HIGH' : 'LOW');

    return {
      patientId: pId,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender,
      recoveryContext: `${patient.condition} • ${patient.procedure}`,
      priority,
      status: isCompleted ? 'COMPLETED' : 'INCOMPLETE',
      score,
      correctCount,
      totalQuestions: 5,
      strengths,
      weaknesses,
      completedAt: session?.completedAt ? new Date(session.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Today, 10:30 AM'
    };
  });

  const completedCount = patientScores.filter((p) => p.status === 'COMPLETED').length;
  const totalCount = patientScores.length;
  const avgScore = Math.round(patientScores.reduce((acc, curr) => acc + curr.score, 0) / Math.max(1, totalCount));

  // Collect all unique knowledge gaps
  const gapCounts = {};
  patientScores.forEach((p) => {
    p.weaknesses.forEach((w) => {
      gapCounts[w] = (gapCounts[w] || 0) + 1;
    });
  });

  const topGaps = Object.entries(gapCounts)
    .map(([gap, count]) => ({ gap, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      completedCount,
      totalCount,
      avgScore,
      topGaps
    },
    patientScores
  };
}

/**
 * Upload a real Prescription PDF file to the backend
 * @param {FormData} formData 
 */
export async function uploadPrescriptionPdf(formData) {
  const res = await fetch('/api/nurse/prescriptions/upload', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to upload prescription PDF');
  }

  return json.data !== undefined ? json.data : json;
}

/**
 * Fetch uploaded prescriptions or documents
 * @param {string} [patientId]
 */
export async function getPrescriptionList(patientId = null) {
  try {
    const url = patientId ? `/api/nurse/prescriptions?patientId=${patientId}` : '/api/nurse/prescriptions';
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    console.warn('Prescriptions fetch fallback:', err.message);
  }
  return [];
}

/**
 * Fetch multi-factor AI Clinical Summary for a patient
 * @param {string} patientId 
 * @param {string} [apiKey] Optional Gemini API Key
 */
export async function getNurseAISummary(patientId = 'P001', apiKey = '') {
  try {
    const headers = {};
    if (apiKey) headers['x-gemini-api-key'] = apiKey;

    const res = await fetch(`/api/nurse/patients/${patientId}/ai-summary`, { headers });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    console.warn('getNurseAISummary fetch fallback:', err.message);
  }

  // Fallback to brief synthesis
  return await getNurseAIBrief(patientId);
}

/**
 * Generate fresh multi-factor AI Clinical Summary powered by Gemini API
 * @param {string} patientId 
 * @param {string} [apiKey] Optional Gemini API Key
 */
export async function generateNurseAISummary(patientId = 'P001', apiKey = '') {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-gemini-api-key'] = apiKey;

    const res = await fetch(`/api/nurse/patients/${patientId}/ai-summary/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiKey: apiKey || undefined })
    });

    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || `Failed with status ${res.status}`);
  } catch (err) {
    console.error('generateNurseAISummary failed:', err);
    throw err;
  }
}




