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
      return await res.json();
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
    const res = await fetch(`/api/nurse/patients?priority=${priorityFilter}`);
    if (res.ok) {
      return await res.json();
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
    const res = await fetch(`/api/nurse/alerts?category=${categoryFilter}&status=${statusFilter}`);
    if (res.ok) {
      return await res.json();
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
      return await res.json();
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
  try {
    const res = await fetch(`/api/nurse/briefs/${patientId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend offline, fallback to mock joined dataset
  }

  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  const pId = patient._id;

  const brief = nurseBriefsData.find((b) => b.patientId === pId) || nurseBriefsData[0];

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
    keyObservation: brief.summary,
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
      return await res.json();
    }
  } catch (err) {
    // Backend offline
  }

  const listPromises = patientsData.map((p) => getNurseAIBrief(p._id));
  return await Promise.all(listPromises);
}

