const dataStore = require('./dataStore');
const adherenceService = require('./adherence.service');

/**
 * AI Safety Boundary Enforcement
 * The nurse summary must NOT:
 * - diagnose
 * - prescribe
 * - recommend dosage changes
 * - recommend treatment plans
 */
const FORBIDDEN_NURSE_AI_PATTERNS = [
  /\bdiagnos(e|is|ed|ing)\b/i,
  /\bprescrib(e|ed|ing|tion)\b/i,
  /\b(increase|decrease|change|modify|adjust|double|halve)\s+(the\s+)?(dose|dosage|medication|prescription)\b/i,
  /\b(start|stop|discontinue)\s+(taking\s+)?(the\s+)?(medication|drug|pill|tablets?)\b/i,
  /\btreatment\s+plan\b/i,
  /\b(emergency\s+classification|code\s+blue|critical\s+care|icu\s+admission|life-threatening)\b/i
];

const enforceNurseAISafety = (text) => {
  if (!text || typeof text !== 'string') return;
  for (const pattern of FORBIDDEN_NURSE_AI_PATTERNS) {
    if (pattern.test(text)) {
      throw {
        statusCode: 400,
        message: `AI Safety Violation: Nurse summary must not contain diagnosis, prescription, dosage changes, or treatment plans. Violation matched: '${pattern.source}'`
      };
    }
  }
};

/**
 * Service for Nurse Dashboard APIs and Nurse AI Summary (Features 8 & 9)
 */
const nurseService = {
  enforceNurseAISafety,
  /**
   * Retrieve aggregate nurse dashboard for all patients with strict isolation
   * @param {Object} [filters] { priority, caregiverId, recoveryPhase, search }
   */
  async getNurseDashboard(filters = {}) {
    const patients = await dataStore.listPatients();

    let filteredPatients = [...patients];

    if (filters.caregiverId) {
      filteredPatients = filteredPatients.filter(p => p.caregiverId === filters.caregiverId);
    }

    if (filters.recoveryPhase) {
      filteredPatients = filteredPatients.filter(
        p => (p.recoveryPhase || '').toLowerCase() === filters.recoveryPhase.toLowerCase()
      );
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filteredPatients = filteredPatients.filter(
        p => (p.name && p.name.toLowerCase().includes(q)) ||
             (p._id && p._id.toLowerCase().includes(q)) ||
             (p.surgery && p.surgery.toLowerCase().includes(q)) ||
             (p.room && p.room.toLowerCase().includes(q))
      );
    }

    const dashboardCards = [];

    for (const patient of filteredPatients) {
      const patientId = patient._id;
      const card = await this.buildPatientDashboardCard(patientId, patient);
      dashboardCards.push(card);
    }

    // Filter by priority if requested
    let result = dashboardCards;
    if (filters.priority) {
      result = result.filter(
        c => (c.priority || '').toUpperCase() === filters.priority.toUpperCase()
      );
    }

    // Sort: HIGH priority first, then MEDIUM, then LOW
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    result.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

    return {
      totalPatients: result.length,
      highPriorityCount: result.filter(p => p.priority === 'HIGH').length,
      mediumPriorityCount: result.filter(p => p.priority === 'MEDIUM').length,
      lowPriorityCount: result.filter(p => p.priority === 'LOW').length,
      patients: result
    };
  },

  /**
   * Retrieve aggregate cohort overview for nurse dashboard cards
   */
  async getCohortOverview() {
    const patients = await dataStore.listPatients();
    const reminders = await dataStore.getReminders();
    const quizSessions = await dataStore.getQuizSessions();
    const escalations = await dataStore.listEscalations();

    const totalPatients = patients.length;
    const activeEscalations = escalations.filter(e => e.status !== 'RESOLVED').length;

    let confirmedMeds = 0;
    reminders.forEach(r => {
      if (r.status === 'taken' || r.responseType === 'taken') confirmedMeds++;
    });
    const medAdherenceRate = Math.round((confirmedMeds / Math.max(1, reminders.length)) * 100);

    let totalScore = 0;
    let completedQuizzes = 0;
    quizSessions.forEach(qs => {
      if (typeof qs.score === 'number') {
        totalScore += qs.score;
        completedQuizzes++;
      }
    });
    const avgQuizScore = Math.round(totalScore / Math.max(1, completedQuizzes));

    return {
      totalPatients,
      activeEscalations,
      medAdherenceRate,
      avgQuizScore
    };
  },

  /**
   * Retrieve detailed nurse dashboard view for a single patient
   * @param {string} patientId 
   */
  async getPatientDetail(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const card = await this.buildPatientDashboardCard(patientId, patient);
    const brief = await dataStore.getNurseBriefByPatient(patientId);
    const insight = await dataStore.getLatestPatientInsight(patientId);
    const reminders = await dataStore.getRemindersByPatient(patientId);
    const tasks = await dataStore.getTasksByPatient(patientId);

    return {
      ...card,
      questionsForNurse: brief && Array.isArray(brief.questionsForNurse) ? brief.questionsForNurse : [],
      recommendedFollowUp: brief ? brief.recommendedFollowUp || 'Routine nurse review.' : 'Routine nurse review.',
      brief: brief || null,
      insight: insight || null,
      tasks: tasks.slice(0, 5),
      reminders: reminders.slice(0, 5)
    };
  },

  /**
   * Helper to construct a single patient dashboard summary card
   * Ensures STRICT patient data association without mixing patient data
   * @param {string} patientId 
   * @param {Object} [patientDoc] 
   */
  async buildPatientDashboardCard(patientId, patientDoc = null) {
    const patient = patientDoc || (await dataStore.getPatient(patientId));
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    // Load curated nurse brief if available
    const mockBrief = await dataStore.getNurseBriefByPatient(patientId);

    // 1. Medication Adherence (strictly isolated by patientId)
    let medicationAdherence;
    if (mockBrief && mockBrief.medicationAdherence) {
      medicationAdherence = {
        total: mockBrief.medicationAdherence.total,
        confirmed: mockBrief.medicationAdherence.confirmed,
        notConfirmed: mockBrief.medicationAdherence.notConfirmed,
        missed: mockBrief.medicationAdherence.missed
      };
    } else {
      const adherenceData = await adherenceService.calculateAdherence(patientId);
      medicationAdherence = {
        total: adherenceData.total,
        confirmed: adherenceData.confirmed,
        notConfirmed: adherenceData.notConfirmed,
        missed: adherenceData.missed
      };
    }

    // 2. Quiz Performance (strictly isolated by patientId)
    let quizPerformance = null;
    if (mockBrief && mockBrief.quizPerformance) {
      quizPerformance = {
        score: mockBrief.quizPerformance.score,
        correct: mockBrief.quizPerformance.correct,
        total: mockBrief.quizPerformance.total
      };
    } else {
      const quizSessions = await dataStore.getQuizSessionsByPatient(patientId);
      const latestQuizSession = quizSessions && quizSessions.length > 0 ? quizSessions[0] : null;

      if (latestQuizSession && latestQuizSession.status === 'completed') {
        quizPerformance = {
          score: latestQuizSession.score,
          correct: latestQuizSession.correctAnswers,
          total: latestQuizSession.totalQuestions || 5
        };
      } else if (latestQuizSession) {
        const answers = await dataStore.getQuizAnswersBySessionId(latestQuizSession._id);
        quizPerformance = {
          score: latestQuizSession.score || Math.round((answers.filter(a => a.correct).length / 5) * 100),
          correct: answers.filter(a => a.correct).length,
          total: 5
        };
      }
    }

    // 3. Knowledge Gaps (strictly isolated by patientId)
    let knowledgeGaps = [];
    if (mockBrief && Array.isArray(mockBrief.knowledgeGaps) && mockBrief.knowledgeGaps.length > 0) {
      knowledgeGaps = [...mockBrief.knowledgeGaps];
    } else {
      const insight = await dataStore.getLatestPatientInsight(patientId);
      if (insight && Array.isArray(insight.weaknesses)) {
        knowledgeGaps = [...insight.weaknesses];
      }
    }

    // 4. Flags (strictly isolated by patientId)
    let flags = [];
    if (mockBrief && Array.isArray(mockBrief.flags)) {
      flags = [...mockBrief.flags];
    } else {
      if (medicationAdherence.missed > 0) {
        flags.push('Missed medication');
      }
      if (medicationAdherence.notConfirmed > 0) {
        flags.push('Medication not confirmed');
      }
      if (quizPerformance && quizPerformance.score < 60) {
        flags.push('Low quiz score');
      }
      for (const gap of knowledgeGaps) {
        const gapFlag = `${gap} knowledge gap`;
        if (!flags.includes(gapFlag)) flags.push(gapFlag);
      }
    }

    // 5. Priority calculation
    let priority = 'LOW';
    if (mockBrief && mockBrief.priority) {
      priority = mockBrief.priority;
    } else if (medicationAdherence.missed > 0 || (quizPerformance && quizPerformance.score < 50)) {
      priority = 'HIGH';
    } else if (medicationAdherence.notConfirmed > 0 || knowledgeGaps.length > 0) {
      priority = 'MEDIUM';
    }

    // 6. Latest relevant events (strictly isolated by patientId: event.patientId === patientId)
    const patientEvents = await dataStore.getEventsByPatient(patientId);
    const sortedEvents = [...patientEvents].sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
    const latestRelevantEvents = sortedEvents.slice(0, 5).map(e => ({
      _id: e._id,
      patientId: e.patientId,
      type: e.type,
      timestamp: e.timestamp,
      payload: e.payload,
      actor: e.actor
    }));

    // Summary
    const summary = mockBrief && mockBrief.summary
      ? mockBrief.summary
      : `Patient ${patient.name} (${patientId}) in ${patient.recoveryPhase || 'recovery'}. Adherence: ${medicationAdherence.confirmed}/${medicationAdherence.total}. Quiz Score: ${quizPerformance ? quizPerformance.score + '%' : 'N/A'}.`;

    return {
      patient: {
        ...patient,
        condition: patient.condition,
        procedure: patient.procedure || patient.condition,
        surgery: patient.procedure || patient.condition || 'General Care'
      },
      medicationAdherence,
      quizPerformance,
      knowledgeGaps,
      flags,
      latestRelevantEvents,
      priority,
      summary
    };
  },

  /**
   * Retrieve Nurse AI Summary combining:
   * 1. Medication adherence
   * 2. Medication events
   * 3. Quiz performance
   * 4. Quiz answers
   * 5. Knowledge gaps
   * 6. Verified discharge instructions
   * 7. Relevant escalations
   *
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getNurseAISummary(patientId, options = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    // 1. Medication adherence
    const mockBrief = await dataStore.getNurseBriefByPatient(patientId);
    let medicationAdherence;
    if (mockBrief && mockBrief.medicationAdherence) {
      medicationAdherence = { ...mockBrief.medicationAdherence };
    } else {
      const adh = await adherenceService.calculateAdherence(patientId);
      medicationAdherence = {
        total: adh.total,
        confirmed: adh.confirmed,
        notConfirmed: adh.notConfirmed,
        missed: adh.missed
      };
    }

    // 2. Medication events
    const allEvents = await dataStore.getEventsByPatient(patientId);
    const medicationEvents = allEvents.filter(e =>
      e.type === 'medication_taken' ||
      e.type === 'medication_not_taken' ||
      e.type === 'medication_missed' ||
      e.type === 'reminder_sent' ||
      e.type === 'reminder_opened' ||
      e.type === 'teach_back'
    );

    // 3. Quiz performance & 4. Quiz answers
    let quizPerformance = mockBrief && mockBrief.quizPerformance ? { ...mockBrief.quizPerformance } : null;
    let quizAnswers = [];
    const quizSessions = await dataStore.getQuizSessionsByPatient(patientId);
    const latestQuizSession = quizSessions && quizSessions.length > 0 ? quizSessions[0] : null;

    if (latestQuizSession) {
      const questions = await dataStore.getQuizQuestionsBySessionId(latestQuizSession._id);
      const answers = await dataStore.getQuizAnswersBySessionId(latestQuizSession._id);

      if (!quizPerformance) {
        quizPerformance = {
          score: latestQuizSession.score || Math.round((answers.filter(a => a.correct).length / 5) * 100),
          correct: latestQuizSession.correctAnswers || answers.filter(a => a.correct).length,
          total: latestQuizSession.totalQuestions || 5
        };
      }

      quizAnswers = questions.map(q => {
        const userAns = answers.find(a => a.questionId === q._id);
        return {
          questionId: q._id,
          question: q.question,
          selectedAnswer: userAns ? userAns.selectedAnswer : null,
          correctAnswer: q.correctAnswer,
          correct: userAns ? userAns.correct : false,
          sourceItemId: q.sourceItemId,
          sourceSentence: q.sourceSentence
        };
      });
    }

    // 5. Knowledge gaps
    let knowledgeGaps = mockBrief && Array.isArray(mockBrief.knowledgeGaps)
      ? [...mockBrief.knowledgeGaps]
      : [];

    if (knowledgeGaps.length === 0 && quizAnswers.length > 0) {
      const incorrectQuestions = quizAnswers.filter(a => !a.correct);
      knowledgeGaps = incorrectQuestions.map(q => q.question.slice(0, 40));
    }

    // 6. Verified discharge instructions
    const extractedItems = await dataStore.getExtractedItemsByPatient(patientId, { verifiedOnly: true, all: true });

    // 7. Relevant escalations
    const escalations = await dataStore.getEscalationsByPatient(patientId);

    // Flags
    let flags = mockBrief && Array.isArray(mockBrief.flags)
      ? [...mockBrief.flags]
      : [];
    if (flags.length === 0) {
      if (medicationAdherence.missed > 0) flags.push('Missed medication');
      if (medicationAdherence.notConfirmed > 0) flags.push('Medication not confirmed');
      if (quizPerformance && quizPerformance.score < 60) flags.push('Low quiz score');
      if (knowledgeGaps.length > 0) flags.push(...knowledgeGaps.map(k => `${k} knowledge gap`));
      if (escalations.length > 0) flags.push(...escalations.map(e => e.category));
    }

    // Questions for nurse & recommended follow-up
    const questionsForNurse = mockBrief && Array.isArray(mockBrief.questionsForNurse)
      ? [...mockBrief.questionsForNurse]
      : (mockBrief && Array.isArray(mockBrief.questions) ? [...mockBrief.questions] : []);
    const recommendedFollowUp = mockBrief
      ? mockBrief.recommendedFollowUp || mockBrief.recommendedAction || 'Routine nurse review.'
      : 'Routine nurse review.';

    // Priority
    const priority = mockBrief && mockBrief.priority
      ? mockBrief.priority
      : (medicationAdherence.missed > 0 || (quizPerformance && quizPerformance.score < 50) ? 'HIGH' : 'MEDIUM');

    // AI Summary (Use existing synthetic nurse brief where available, or grounded synthesis)
    let aiSummary = mockBrief && mockBrief.summary ? mockBrief.summary : null;
    if (!aiSummary || options.forceGenerate) {
      const missedMedNote = medicationAdherence.missed > 0
        ? `Patient missed ${medicationAdherence.missed} scheduled dose(s). `
        : medicationAdherence.notConfirmed > 0
        ? `Patient has ${medicationAdherence.notConfirmed} unconfirmed medication dose(s). `
        : 'All scheduled medications were confirmed. ';

      const quizNote = quizPerformance
        ? `Scored ${quizPerformance.score}% on daily recovery quiz. `
        : 'Recovery quiz not completed. ';

      const gapNote = knowledgeGaps.length > 0
        ? `Knowledge gaps identified in: ${knowledgeGaps.join(', ')}. `
        : 'No knowledge gaps identified. ';

      const escNote = escalations.length > 0
        ? `Active escalation noted: ${escalations[0].reason}. `
        : '';

      aiSummary = `${missedMedNote}${quizNote}${gapNote}${escNote}Recommend nurse follow-up to reinforce verified discharge instructions.`;
    }

    // Safety check: Validate no diagnosis, prescription, dosage changes, or treatment plans
    enforceNurseAISafety(aiSummary);

    // Evidence Mapping: Every important claim traceable to actual data
    const evidenceMedEvents = medicationEvents.filter(e =>
      e.type === 'medication_not_taken' ||
      e.type === 'medication_missed' ||
      (e.payload && e.payload.responseType === 'no_response') ||
      e.type === 'medication_taken'
    );

    const evidenceQuizAnswers = quizAnswers.filter(a => !a.correct);

    const evidenceInstructions = extractedItems.filter(item =>
      knowledgeGaps.some(gap =>
        (item.name && gap.toLowerCase().includes(item.name.toLowerCase())) ||
        (item.type && gap.toLowerCase().includes(item.type.toLowerCase()))
      ) ||
      evidenceQuizAnswers.some(qa => qa.sourceItemId === item._id)
    );

    // Verify evidenceEventIds strictly belong to this patient
    const patientEventIdSet = new Set(allEvents.map(e => e._id));
    let evidenceEventIds = [];
    if (mockBrief && Array.isArray(mockBrief.evidenceEventIds)) {
      evidenceEventIds = mockBrief.evidenceEventIds.filter(id => patientEventIdSet.has(id));
    }
    if (evidenceEventIds.length === 0 && medicationEvents.length > 0) {
      evidenceEventIds = medicationEvents.slice(0, 3).map(e => e._id);
    }

    return {
      _id: mockBrief ? mockBrief._id : `NB_${patientId}_${Date.now()}`,
      patientId,
      priority,
      medicationAdherence,
      quizPerformance,
      flags,
      knowledgeGaps,
      questionsForNurse,
      recommendedFollowUp,
      aiSummary,
      summary: aiSummary,
      evidenceEventIds,
      evidence: {
        medicationEvents: evidenceMedEvents.slice(0, 5),
        quizAnswers: quizAnswers.slice(0, 5),
        verifiedInstructions: evidenceInstructions.slice(0, 5),
        escalations: escalations.slice(0, 5),
        traces: [
          ...evidenceMedEvents.slice(0, 3).map(e => ({
            claim: e.type === 'medication_missed' ? 'Medication missed' : (e.type === 'medication_not_taken' || (e.payload && e.payload.responseType === 'no_response') ? 'Medication not confirmed' : 'Medication confirmed'),
            sourceType: 'medication_event',
            sourceId: e._id,
            details: `Event ${e._id} (${e.type}) recorded at ${e.timestamp}`
          })),
          ...evidenceQuizAnswers.slice(0, 3).map(a => ({
            claim: `Knowledge gap: ${a.question ? a.question.slice(0, 50) : 'Quiz topic'}`,
            sourceType: 'quiz_answer',
            sourceId: a.questionId,
            sourceItemId: a.sourceItemId,
            sourceSentence: a.sourceSentence,
            selectedAnswer: a.selectedAnswer,
            correctAnswer: a.correctAnswer
          })),
          ...escalations.slice(0, 3).map(esc => ({
            claim: `Active escalation: ${esc.category}`,
            sourceType: 'escalation',
            sourceId: esc._id,
            details: esc.reason
          }))
        ]
      },
      aiGenerated: true,
      disclaimer: 'AI-generated — verify before acting.',
      generatedAt: mockBrief ? mockBrief.generatedAt || new Date().toISOString() : new Date().toISOString()
    };
  },

  /**
   * Synthesize fresh Nurse AI Summary for a patient
   * @param {string} patientId 
   */
  async generateNurseAISummary(patientId) {
    return await this.getNurseAISummary(patientId, { forceGenerate: true });
  }
};

module.exports = nurseService;
