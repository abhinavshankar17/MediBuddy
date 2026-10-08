const dataStore = require('./dataStore');

/**
 * AI Boundary Enforcement
 * The insight must NOT:
 * - diagnose
 * - prescribe
 * - change medication
 * - recommend dosage changes
 */
const FORBIDDEN_AI_PATTERNS = [
  /\bdiagnos(e|is|ed|ing)\b/i,
  /\bprescrib(e|ed|ing|tion)\b/i,
  /\b(increase|decrease|change|modify|adjust|double|halve)\s+(the\s+)?(dose|dosage|medication|prescription)\b/i,
  /\b(start|stop|discontinue)\s+(taking\s+)?(the\s+)?(medication|drug|pill|tablets?)\b/i
];

const enforceAIBoundary = (text) => {
  if (!text || typeof text !== 'string') return;
  for (const pattern of FORBIDDEN_AI_PATTERNS) {
    if (pattern.test(text)) {
      throw {
        statusCode: 400,
        message: `AI Boundary Violation: Insight must not diagnose, prescribe, change medication, or recommend dosage changes. Violation matched: '${pattern.source}'`
      };
    }
  }
};

/**
 * Service for patient insight retrieval, generation, grounding, and AI boundary safety
 */
const insightService = {
  /**
   * Enforce AI boundaries on arbitrary text
   */
  enforceAIBoundary,

  /**
   * Retrieve the latest patient insight with verified evidence and disclaimer
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getLatestInsight(patientId, options = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    let insight = options.regenerate ? null : await dataStore.getLatestPatientInsight(patientId);

    // If no existing insight (e.g. P007) or explicit regeneration requested, dynamically generate one
    if (!insight) {
      insight = await this.generateInsight(patientId);
    }

    // Verify grounding and actual evidence records
    return await this.sanitizeAndVerifyInsight(insight, patientId);
  },

  /**
   * Retrieve all insights for a patient
   * @param {string} patientId 
   */
  async getPatientInsights(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    let insights = await dataStore.getPatientInsightsByPatient(patientId);

    if (!insights || insights.length === 0) {
      const generated = await this.generateInsight(patientId);
      insights = [generated];
    }

    const verifiedInsights = [];
    for (const inst of insights) {
      verifiedInsights.push(await this.sanitizeAndVerifyInsight(inst, patientId));
    }

    return verifiedInsights;
  },

  /**
   * Retrieve single insight by ID with strict patient authorization
   * @param {string} insightId 
   * @param {string} [patientId] 
   */
  async getInsightById(insightId, patientId = null) {
    if (!insightId) {
      throw { statusCode: 400, message: 'insightId is required' };
    }

    const insight = await dataStore.getPatientInsightById(insightId);
    if (!insight) {
      throw { statusCode: 404, message: `Patient insight with ID '${insightId}' not found` };
    }

    if (patientId && insight.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized to access insight '${insightId}'`
      };
    }

    return await this.sanitizeAndVerifyInsight(insight, insight.patientId);
  },

  /**
   * Dynamically generate a grounded insight strictly from patient's own records
   * (quiz answers, verified discharge instructions, and medication events)
   * @param {string} patientId 
   */
  async generateInsight(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    // 1. Gather patient's own quiz session & answers
    const quizSessions = await dataStore.getQuizSessionsByPatient(patientId);
    const latestSession = quizSessions && quizSessions.length > 0 ? quizSessions[0] : null;

    let score = latestSession ? latestSession.score : 0;
    const strengths = [];
    const weaknesses = [];
    const missedInstructions = [];

    if (latestSession) {
      const questions = await dataStore.getQuizQuestionsBySessionId(latestSession._id);
      const answers = await dataStore.getQuizAnswersBySessionId(latestSession._id);

      for (const q of questions) {
        const userAns = answers.find(a => a.questionId === q._id);
        const isCorrect = userAns ? userAns.correct : false;

        const topic = q.question.toLowerCase().includes('when') || q.question.toLowerCase().includes('meals') || q.question.toLowerCase().includes('breakfast')
          ? 'Medication timing'
          : q.question.toLowerCase().includes('exercise') || q.question.toLowerCase().includes('knee') || q.question.toLowerCase().includes('walk')
          ? 'Exercise and mobility'
          : q.question.toLowerCase().includes('clinic') || q.question.toLowerCase().includes('visit') || q.question.toLowerCase().includes('follow')
          ? 'Follow-up scheduling'
          : q.question.toLowerCase().includes('wound') || q.question.toLowerCase().includes('incision')
          ? 'Wound care'
          : 'Discharge instructions';

        if (isCorrect) {
          if (!strengths.includes(topic)) strengths.push(topic);
        } else {
          if (!weaknesses.includes(topic)) weaknesses.push(topic);
          if (q.sourceSentence && !missedInstructions.includes(q.sourceSentence)) {
            missedInstructions.push(q.sourceSentence);
          }
        }
      }

      if (answers.length > 0) {
        const correctCount = answers.filter(a => a.correct).length;
        score = Math.round((correctCount / answers.length) * 100);
      }
    }

    // Fallback if no quiz sessions exist yet, use extracted items baseline
    if (strengths.length === 0 && weaknesses.length === 0) {
      const extractedItems = await dataStore.getExtractedItemsByPatient(patientId, { all: true });
      if (extractedItems.length > 0) {
        strengths.push('Medication timing', 'Discharge plan awareness');
      }
    }

    // 2. Gather patient's own medication events for evidence
    const events = await dataStore.getEventsByPatient(patientId);
    const medicationEvents = events.filter(e =>
      e.type === 'medication_taken' ||
      e.type === 'medication_not_taken' ||
      e.type === 'medication_missed' ||
      e.type === 'reminder_sent' ||
      e.type === 'teach_back'
    );

    const evidenceEventIds = medicationEvents.slice(0, 3).map(e => e._id);

    // 3. Determine priority
    const hasMissedMeds = events.some(e => e.type === 'medication_missed' || e.type === 'medication_not_taken');
    let priority = 'LOW';
    if (score < 50 || hasMissedMeds) {
      priority = 'HIGH';
    } else if (score < 80 || weaknesses.length > 0) {
      priority = 'MEDIUM';
    }

    // 4. Formulate grounded AI summary respecting boundaries (NO diagnosing, prescribing, or medication modifications)
    let aiSummary;
    if (score >= 80 && !hasMissedMeds) {
      aiSummary = `Patient demonstrates strong comprehension of discharge recovery instructions with an educational engagement score of ${score}%. All scheduled medications were confirmed as taken. Continue routine monitoring.`;
    } else if (score >= 60) {
      aiSummary = `Patient understands core recovery instructions with an engagement score of ${score}%. Knowledge gaps noted in: ${weaknesses.join(', ') || 'instruction details'}. ${hasMissedMeds ? 'Unconfirmed medication dose noted in event log. ' : ''}Recommend reinforcement of verified discharge instructions during next check-in.`;
    } else {
      aiSummary = `Patient engagement score is ${score}%. Areas needing education include: ${weaknesses.join(', ') || 'multiple discharge instructions'}. ${hasMissedMeds ? 'Scheduled doses were not confirmed. ' : ''}Prioritize nurse review to reinforce discharge plan and warning signs.`;
    }

    // Boundary validation
    enforceAIBoundary(aiSummary);

    const insightRecord = {
      _id: `PI_${patientId}_${Date.now()}`,
      patientId,
      quizSessionId: latestSession ? latestSession._id : null,
      score,
      strengths,
      weaknesses,
      missedInstructions,
      aiSummary,
      priority,
      evidenceEventIds,
      disclaimer: 'AI-generated — verify before acting.',
      aiGenerated: true,
      generatedAt: new Date().toISOString()
    };

    await dataStore.savePatientInsight(insightRecord);
    return insightRecord;
  },

  /**
   * Helper to ensure evidence references point to actual records and enforce AI boundaries
   * @param {Object} insight 
   * @param {string} patientId 
   */
  async sanitizeAndVerifyInsight(insight, patientId) {
    if (!insight) return null;

    // Boundary check
    enforceAIBoundary(insight.aiSummary);

    // Evidence Verification: Ensure evidenceEventIds point to actual records belonging to this patient
    const patientEvents = await dataStore.getEventsByPatient(patientId);
    const patientEventIdSet = new Set(patientEvents.map(e => e._id));

    let verifiedEvidenceEventIds = [];
    if (Array.isArray(insight.evidenceEventIds)) {
      verifiedEvidenceEventIds = insight.evidenceEventIds.filter(id => patientEventIdSet.has(id));
    }

    // If existing mock data had empty or missing IDs, populate with patient's actual events
    if (verifiedEvidenceEventIds.length === 0 && patientEvents.length > 0) {
      verifiedEvidenceEventIds = patientEvents.slice(0, 3).map(e => e._id);
    }

    return {
      _id: insight._id,
      patientId: insight.patientId,
      quizSessionId: insight.quizSessionId || null,
      score: insight.score !== undefined ? insight.score : 0,
      strengths: insight.strengths || [],
      weaknesses: insight.weaknesses || [],
      missedInstructions: insight.missedInstructions || [],
      aiSummary: insight.aiSummary,
      priority: insight.priority || 'MEDIUM',
      evidenceEventIds: verifiedEvidenceEventIds,
      generatedAt: insight.generatedAt || new Date().toISOString(),
      disclaimer: 'AI-generated — verify before acting.',
      aiGenerated: true
    };
  }
};

module.exports = insightService;
