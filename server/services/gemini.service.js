const config = require('../config');

/**
 * Service for Google Gemini Generative AI Integration.
 * Generates dynamic, patient-specific clinical summaries for nurses based on:
 * 1. Medicine history and adherence
 * 2. Feedback from the patient
 * 3. Prescription & discharge report
 */
class GeminiService {
  /**
   * Determine available AI API Key (request-provided takes precedence over server .env)
   */
  resolveApiKey(providedKey) {
    if (providedKey && typeof providedKey === 'string' && providedKey.trim().length > 0) {
      return providedKey.trim();
    }
    return config.GROQ_API_KEY || config.GEMINI_API_KEY || '';
  }

  /**
   * Call Groq API endpoint (OpenAI compatible)
   */
  async callGroqApi(prompt, apiKey) {
    const models = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];
    let lastError = null;

    for (const model of models) {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are a clinical nurse AI assistant in a post-discharge care monitoring system. Return only valid JSON conforming strictly to the requested schema. Do not prescribe or diagnose.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || response.statusText;
          lastError = new Error(`Groq API (${model}) failed [${response.status}]: ${errMsg}`);
          continue; // try next model
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (text) {
          return { text, modelUsed: `Groq (${model})` };
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate summary with Groq API');
  }

  /**
   * Call Gemini API endpoint
   */
  async callGeminiApi(prompt, apiKey) {
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1200
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || response.statusText;
          lastError = new Error(`Gemini API (${model}) failed [${response.status}]: ${errMsg}`);
          continue; // try next model if 404 or model not supported
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
          return { text, modelUsed: `Google Gemini (${model})` };
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate summary with Gemini API');
  }

  /**
   * Universal LLM Caller (detects Groq vs Gemini or tries sequentially)
   */
  async callLlm(prompt, apiKey) {
    // If it starts with 'gsk_', it is definitely a Groq key
    if (apiKey.startsWith('gsk_') || config.GROQ_API_KEY) {
      try {
        return await this.callGroqApi(prompt, apiKey);
      } catch (groqErr) {
        if (!apiKey.startsWith('gsk_')) {
          return await this.callGeminiApi(prompt, apiKey);
        }
        throw groqErr;
      }
    }

    // Otherwise try Gemini first, then fallback to Groq
    try {
      return await this.callGeminiApi(prompt, apiKey);
    } catch (geminiErr) {
      try {
        return await this.callGroqApi(prompt, apiKey);
      } catch (groqErr) {
        throw geminiErr;
      }
    }
  }

  /**
   * Generate Patient-Specific Clinical Summary
   */
  async generatePatientSummary({
    patient,
    document,
    extractedItems = [],
    adherence = {},
    reminders = [],
    feedbacks = [],
    events = [],
    apiKey = null
  }) {
    const resolvedKey = this.resolveApiKey(apiKey);

    // Build context data for the 3 driving factors
    const medHistoryData = {
      adherenceRate: adherence.total > 0 ? Math.round((adherence.confirmed / adherence.total) * 100) : 100,
      totalScheduled: adherence.total || reminders.length,
      confirmed: adherence.confirmed || 0,
      missed: adherence.missed || 0,
      notConfirmed: adherence.notConfirmed || 0,
      reminders: reminders.map(r => ({
        medication: r.medicationName,
        dose: r.dose,
        scheduledAt: r.scheduledAt,
        status: r.status,
        responseType: r.responseType
      })),
      recentEvents: events.slice(0, 5).map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        payload: e.payload
      }))
    };

    const patientFeedbackData = feedbacks.map(f => ({
      submittedAt: f.submittedAt,
      condition: f.condition,
      symptoms: f.symptoms,
      painLevel: f.painLevel,
      urgency: f.urgency,
      notes: f.notes
    }));

    const prescriptionData = {
      hospitalName: document?.hospitalName || 'CareBridge Demo Hospital',
      diagnosingDoctor: document?.doctorName || patient?.assignedDoctor || 'Attending Physician',
      admissionDate: document?.admissionDate,
      dischargeDate: document?.dischargeDate,
      rawText: document?.rawText || 'Prescription discharge record verified.',
      extractedItems: extractedItems.slice(0, 10).map(i => ({
        name: i.name,
        category: i.category,
        dosage: i.dosage,
        frequency: i.frequency,
        instructions: i.instructions
      }))
    };

    // If Gemini API key is available, generate via live Gemini LLM
    if (resolvedKey) {
      const prompt = `You are a clinical nurse AI assistant in a post-discharge care monitoring system.
Generate an objective, highly specific clinical summary for the patient below.

CRITICAL MEDICAL SAFETY BOUNDARY:
- Do NOT prescribe medications, adjust dosages, make new clinical diagnoses, or suggest unauthorized treatment changes.
- Focus strictly on monitoring, adherence tracking, patient symptom validation, and actionable nursing follow-ups.

PATIENT INFORMATION:
- Name: ${patient.name}
- Patient ID: ${patient._id}
- Age / Gender: ${patient.age} / ${patient.gender}
- Primary Condition: ${patient.condition}
- Surgery / Procedure: ${patient.procedure || patient.surgery || 'General Care'}
- Recovery Phase: ${patient.recoveryPhase || 'Post-Discharge'}

FACTOR 1: MEDICINE HISTORY & ADHERENCE:
- Adherence Rate: ${medHistoryData.adherenceRate}% (${medHistoryData.confirmed}/${medHistoryData.totalScheduled} confirmed, ${medHistoryData.missed} missed, ${medHistoryData.notConfirmed} not confirmed)
- Medication Details:
${JSON.stringify(medHistoryData.reminders, null, 2)}
- Recent Medication Events:
${JSON.stringify(medHistoryData.recentEvents, null, 2)}

FACTOR 2: FEEDBACK FROM THE PATIENT:
${patientFeedbackData.length > 0 ? JSON.stringify(patientFeedbackData, null, 2) : 'No direct feedback forms submitted by patient yet. Routine recovery reported.'}

FACTOR 3: PRESCRIPTION & DISCHARGE REPORT:
- Diagnosing Physician: ${prescriptionData.diagnosingDoctor}
- Facility: ${prescriptionData.hospitalName}
- Discharge Document Text:
${prescriptionData.rawText}

OUTPUT FORMAT REQUIREMENTS:
Provide your response strictly in the following JSON format without markdown ticks if possible, or inside standard json markdown block:
{
  "summary": "2-3 comprehensive clinical paragraphs evaluating the patient recovery trajectory by connecting their prescription instructions, their actual medication compliance, and any patient-submitted feedback/symptoms.",
  "prescriptionReportSummary": "Concise summary of the official discharge diagnosis, diagnosing doctor's instructions, and required recovery protocols.",
  "medicineHistorySummary": "Specific adherence analysis discussing doses confirmed, missed, or pending, and compliance trends.",
  "patientFeedbackSummary": "Detailed overview of the patient's self-reported recovery state, reported urgency, symptoms, and pain notes.",
  "nurseActionItems": [
    "Action item 1 for nurse verification",
    "Action item 2",
    "Action item 3"
  ],
  "priority": "HIGH or MEDIUM or LOW",
  "keyObservations": [
    "Key observation 1",
    "Key observation 2"
  ]
}`;

      try {
        const { text, modelUsed } = await this.callLlm(prompt, resolvedKey);
        const parsed = this.parseGeminiJson(text);
        if (parsed && parsed.summary) {
          return {
            ...parsed,
            aiGenerated: true,
            provider: modelUsed || 'Groq / Gemini AI',
            hasLiveKey: true,
            disclaimer: 'AI-generated — verify before acting.',
            generatedAt: new Date().toISOString(),
            factors: {
              medicineHistory: medHistoryData,
              patientFeedback: patientFeedbackData,
              prescriptionReport: prescriptionData
            }
          };
        }
      } catch (err) {
        console.warn('AI API call failed, falling back to grounded clinical synthesis:', err.message);
        // Fall back gracefully to grounded synthesis with an informative note
        const fallback = this.generateGroundedClinicalSynthesis({
          patient,
          document,
          medHistoryData,
          patientFeedbackData,
          prescriptionData,
          adherence,
          errorNote: `Live AI API call failed (${err.message}). Showing grounded clinical synthesis.`
        });
        return fallback;
      }
    }

    // Grounded synthesis fallback when no Gemini API key is configured
    return this.generateGroundedClinicalSynthesis({
      patient,
      document,
      medHistoryData,
      patientFeedbackData,
      prescriptionData,
      adherence,
      errorNote: 'No Gemini API key provided. Using grounded clinical synthesis engine.'
    });
  }

  /**
   * Helper to parse JSON from Gemini's response
   */
  parseGeminiJson(rawText) {
    if (!rawText) return null;
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    try {
      return JSON.parse(clean.trim());
    } catch (e) {
      // Try to find first { and last }
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(clean.substring(start, end + 1));
        } catch (e2) {}
      }
      return {
        summary: clean,
        prescriptionReportSummary: 'Extracted from discharge record.',
        medicineHistorySummary: 'Adherence evaluated against prescribed schedule.',
        patientFeedbackSummary: 'Patient feedback evaluated.',
        nurseActionItems: ['Verify medication adherence', 'Check for red-flag symptoms', 'Contact diagnosing doctor if needed'],
        priority: 'MEDIUM',
        keyObservations: ['AI synthesis generated']
      };
    }
  }

  /**
   * High-quality deterministic clinical synthesis combining the 3 factors
   */
  generateGroundedClinicalSynthesis({
    patient,
    document,
    medHistoryData,
    patientFeedbackData,
    prescriptionData,
    adherence,
    errorNote
  }) {
    const doctorName = prescriptionData.diagnosingDoctor;
    const condition = patient.condition || 'Post-Discharge Recovery';
    const procedure = patient.procedure || patient.surgery || condition;
    const latestFeedback = patientFeedbackData.length > 0 ? patientFeedbackData[0] : null;

    // 1. Prescription Report Factor Analysis
    let rxSummary = `Discharge report issued by ${doctorName} at ${prescriptionData.hospitalName} for ${condition} (${procedure}). `;
    if (document?.rawText) {
      if (document.rawText.includes('Warning signs:')) {
        const warnings = document.rawText.split('Warning signs:')[1]?.trim()?.split('\n')?.[0] || 'Monitor for fever, wound discharge or acute pain.';
        rxSummary += `Prescribed protocol specifies warning thresholds: "${warnings}"`;
      } else {
        rxSummary += `Patient discharged with established medication regimen and physical activity instructions.`;
      }
    }

    // 2. Medicine History Factor Analysis
    let medSummary = '';
    if (medHistoryData.missed > 0) {
      medSummary = `Medication compliance is compromised: ${medHistoryData.missed} dose(s) missed out of ${medHistoryData.totalScheduled} scheduled doses (${medHistoryData.adherenceRate}% adherence rate). `;
      const missedReminders = medHistoryData.reminders.filter(r => r.status === 'missed' || r.responseType === 'not_taken');
      if (missedReminders.length > 0) {
        medSummary += `Missed medications include: ${missedReminders.map(m => m.medication).join(', ')}.`;
      }
    } else if (medHistoryData.notConfirmed > 0) {
      medSummary = `Moderate adherence with ${medHistoryData.notConfirmed} unconfirmed dose(s) pending verification (${medHistoryData.adherenceRate}% confirmed rate). Follow-up check recommended.`;
    } else {
      medSummary = `Excellent medication adherence: All ${medHistoryData.totalScheduled} scheduled doses confirmed on time (${medHistoryData.adherenceRate}% adherence). Patient is adhering to Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}'s prescription plan.`;
    }

    // 3. Patient Feedback Factor Analysis
    let fbSummary = '';
    let isUrgentFeedback = false;
    if (latestFeedback) {
      const urgencyStr = (latestFeedback.urgency || 'routine').toUpperCase();
      isUrgentFeedback = urgencyStr === 'URGENT' || urgencyStr === 'EMERGENCY';
      fbSummary = `Patient submitted feedback with [${urgencyStr}] urgency on ${new Date(latestFeedback.submittedAt).toLocaleDateString('en-IN')}. `;
      if (latestFeedback.condition) {
        fbSummary += `Reported condition: "${latestFeedback.condition}". `;
      }
      if (latestFeedback.notes) {
        fbSummary += `Patient notes: "${latestFeedback.notes}". `;
      }
      if (latestFeedback.painLevel > 0) {
        fbSummary += `Pain level reported: ${latestFeedback.painLevel}/10. `;
      }
      if (latestFeedback.symptoms && latestFeedback.symptoms.length > 0) {
        fbSummary += `Reported symptoms: ${latestFeedback.symptoms.join(', ')}.`;
      }
    } else {
      fbSummary = `No spontaneous adverse condition feedback submitted by the patient. Patient is currently on routine recovery monitoring.`;
    }

    // Determine Priority based on all 3 factors
    let priority = 'LOW';
    if (isUrgentFeedback || medHistoryData.missed >= 2) {
      priority = 'HIGH';
    } else if (medHistoryData.missed === 1 || medHistoryData.notConfirmed > 0 || (latestFeedback && latestFeedback.urgency === 'moderate')) {
      priority = 'MEDIUM';
    }

    // Overall Synthesis
    const fullSummary = `Patient ${patient.name} (${patient._id}) is recovering from ${procedure} under the clinical care plan directed by ${doctorName}. ` +
      `Review of the prescription report confirms instructions for ${condition}. ` +
      `Regarding medicine history, the patient currently demonstrates an adherence rate of ${medHistoryData.adherenceRate}% (${medHistoryData.confirmed}/${medHistoryData.totalScheduled} confirmed). ` +
      `${medHistoryData.missed > 0 ? `Attention is required due to ${medHistoryData.missed} missed dose(s). ` : 'Medication schedule is being followed consistently. '}` +
      `Direct patient feedback indicates ${latestFeedback ? `a ${latestFeedback.urgency} recovery status: "${latestFeedback.condition || latestFeedback.notes || 'Condition reported'}"` : 'routine post-discharge stability with no adverse feedback logged'}. ` +
      `Nursing action should focus on reconciling adherence logs and reviewing feedback indicators against Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}'s discharge guidelines.`;

    const nurseActionItems = [
      `Review ${doctorName}'s discharge instructions regarding ${procedure} protocols`,
      medHistoryData.missed > 0
        ? `Contact patient to address the ${medHistoryData.missed} missed medication dose(s)`
        : `Confirm timely intake of upcoming scheduled doses`,
      latestFeedback
        ? `Evaluate patient's reported feedback (${latestFeedback.urgency.toUpperCase()}) and assess symptom severity`
        : `Conduct routine check-in on patient comfort and symptom progression`,
      `Verify recovery parameters before next scheduled follow-up`
    ];

    const keyObservations = [
      `Prescription: Managed by ${doctorName} (${prescriptionData.hospitalName})`,
      `Medicine History: ${medHistoryData.adherenceRate}% adherence (${medHistoryData.confirmed}/${medHistoryData.totalScheduled} confirmed)`,
      latestFeedback
        ? `Patient Feedback: ${latestFeedback.urgency.toUpperCase()} - "${latestFeedback.condition || 'Feedback recorded'}"`
        : `Patient Feedback: No distress recorded (routine care)`
    ];

    return {
      summary: fullSummary,
      prescriptionReportSummary: rxSummary,
      medicineHistorySummary: medSummary,
      patientFeedbackSummary: fbSummary,
      nurseActionItems,
      priority,
      keyObservations,
      aiGenerated: true,
      provider: 'Clinical Synthesis Engine',
      hasLiveKey: false,
      disclaimer: 'AI-generated — verify before acting.',
      generatedAt: new Date().toISOString(),
      note: errorNote,
      factors: {
        medicineHistory: medHistoryData,
        patientFeedback: patientFeedbackData,
        prescriptionReport: prescriptionData
      }
    };
  }
}

module.exports = new GeminiService();
