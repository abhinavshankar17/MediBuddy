const dataStore = require('./dataStore');
const adherenceService = require('./adherence.service');

/**
 * Service for Nurse Dashboard APIs (Feature 8)
 */
const nurseService = {
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
  }
};

module.exports = nurseService;
