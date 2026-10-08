import patientsData from '../../../data/mock/patients.json';
import documentsData from '../../../data/mock/documents.json';
import extractedItemsData from '../../../data/mock/extractedItems.json';
import medicationRemindersData from '../../../data/mock/medicationReminders.json';
import tasksData from '../../../data/mock/tasks.json';
import dayColorsData from '../../../data/mock/dayColors.json';
import quizSessionsData from '../../../data/mock/quizSessions.json';


/**
 * Service adapter for Patient Dashboard data.
 * Designed to easily switch between mock JSON files and real REST endpoints.
 */

export async function getAllPatients() {
  try {
    const res = await fetch('/api/patients');
    if (res.ok) {
      const json = await res.json();
      const list = json.data !== undefined ? json.data : json;
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    // offline fallback
  }
  return patientsData;
}

export async function getPatientById(patientId = 'P001') {
  let backendPatient = null;
  try {
    const res = await fetch(`/api/patients/${patientId}`);
    if (res.ok) {
      const json = await res.json();
      backendPatient = json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  const patient = backendPatient || patientsData.find((p) => p._id === patientId) || patientsData[0];
  
  // Calculate recovery day
  let recoveryDayNumber = 3;
  if (patient.dischargeDate) {
    const discharge = new Date(patient.dischargeDate);
    const today = new Date('2026-10-08'); // Mock project current date
    const diffDays = Math.max(1, Math.floor((today - discharge) / (1000 * 60 * 60 * 24)) + 1);
    recoveryDayNumber = diffDays;
  }

  // Language mapper
  const languageNames = {
    en: 'English',
    ta: 'Tamil (தமிழ்)',
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)'
  };

  return {
    ...patient,
    languageName: languageNames[patient.language] || patient.language,
    recoveryDay: `Day ${recoveryDayNumber}`,
    recoveryDayNumber
  };
}

export async function getPatientTodayOverview(patientId = 'P001') {
  // Medications overview
  const medReminders = medicationRemindersData.filter((m) => m.patientId === patientId);
  const medTotal = medReminders.length;
  const medCompleted = medReminders.filter((m) => m.status === 'completed').length;
  const nextMedication = medReminders.find((m) => m.status === 'scheduled' || m.status === 'pending') || medReminders[0];

  // Tasks overview
  const tasks = tasksData.filter((t) => t.patientId === patientId);
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;
  const tasksPending = tasks.filter((t) => t.status === 'pending' || t.status === 'overdue').length;

  // Quiz overview
  const quizSession = quizSessionsData.find((q) => q.patientId === patientId);
  const quizStatus = quizSession ? quizSession.status : 'not_started';
  const quizScore = quizSession && quizSession.score !== undefined ? quizSession.score : null;

  // Extracted items follow-up & important instructions
  const patientItems = extractedItemsData.filter((item) => item.patientId === patientId);
  const followUpItem = patientItems.find((item) => item.type === 'follow_up');
  const restrictionItem = patientItems.find((item) => item.type === 'restriction');
  const warningItem = patientItems.find((item) => item.type === 'warning_sign');

  return {
    medications: {
      total: medTotal,
      completed: medCompleted,
      next: nextMedication
    },
    tasks: {
      total: tasksTotal,
      completed: tasksCompleted,
      pending: tasksPending
    },
    quiz: {
      status: quizStatus,
      score: quizScore
    },
    followUp: followUpItem ? {
      name: followUpItem.name || 'Clinical Follow-up',
      timing: followUpItem.timing || 'In 1 week',
      sourceSentence: followUpItem.sourceSentence
    } : null,
    importantInstruction: restrictionItem || warningItem || {
      name: 'General Restriction',
      sourceSentence: 'Follow prescribed activity levels and report unexpected fever or severe pain.'
    }
  };
}

export async function getPatientRecoveryProgress(patientId = 'P001') {
  const dayColors = dayColorsData.filter((dc) => dc.patientId === patientId);
  const latestColorRecord = dayColors[dayColors.length - 1] || {
    color: 'GREEN',
    score: 85,
    reasons: ['Tasks on track']
  };

  return {
    recentDays: dayColors,
    latestStatus: latestColorRecord.color,
    score: latestColorRecord.score,
    reasons: latestColorRecord.reasons
  };
}

export async function getPatientDischargeInstructions(patientId = 'P001') {
  let patientItems = null;
  try {
    const res = await fetch(`/api/patients/${patientId}/instructions`);
    if (res.ok) {
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      if (Array.isArray(payload) && payload.length > 0) {
        patientItems = payload;
      } else if (payload && Array.isArray(payload.instructions) && payload.instructions.length > 0) {
        patientItems = payload.instructions;
      }
    }
  } catch (err) {
    // offline fallback
  }

  if (!patientItems) {
    patientItems = extractedItemsData.filter((item) => item.patientId === patientId);
  }

  const grouped = {
    medications: patientItems.filter((i) => i.type === 'medication'),
    labTests: patientItems.filter((i) => i.type === 'lab_test' || i.type === 'investigation'),
    activity: patientItems.filter((i) => i.type === 'activity' || i.type === 'exercise'),
    restrictions: patientItems.filter((i) => i.type === 'restriction'),
    diet: patientItems.filter((i) => i.type === 'diet'),
    woundCare: patientItems.filter((i) => i.type === 'wound_care'),
    followUp: patientItems.filter((i) => i.type === 'follow_up'),
    warningSigns: patientItems.filter((i) => i.type === 'warning_sign')
  };

  return grouped;
}

/**
  * Gather comprehensive clinical prescription data for patient and PDF generation
  * Multi-source aggregator across extractedItems, medicationReminders, tasks, and document text.
  * @param {string} patientId 
  */
export async function getPatientPrescriptionData(patientId = 'P001') {
  const patient = await getPatientById(patientId);

  // 1. Fetch discharge document from API or mock
  let doc = null;
  try {
    const res = await fetch(`/api/documents/patient/${patientId}`);
    if (res.ok) {
      const json = await res.json();
      doc = json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // fallback
  }
  if (!doc) {
    doc = documentsData.find((d) => d.patientId === patientId) || documentsData[0];
  }

  // 2. Fetch uploaded prescription PDFs from backend if available
  let uploadedDocs = [];
  try {
    const docRes = await fetch(`/api/documents?patientId=${patientId}`);
    if (docRes.ok) {
      const docJson = await docRes.json();
      const list = docJson.data !== undefined ? docJson.data : docJson;
      if (Array.isArray(list)) uploadedDocs = list;
    }
  } catch (err) {
    // fallback
  }

  // 3. Fetch structured instructions
  const instructions = await getPatientDischargeInstructions(patientId);

  // 4. Fetch all reminders for this patient
  const reminders = medicationRemindersData.filter((m) => m.patientId === patientId);

  // 5. Build Complete, Deduplicated, Multi-Source Medication Directory
  const medMap = new Map();

  // (a) From Extracted Items (both approved and raw)
  const patientExtracted = extractedItemsData.filter((item) => item.patientId === patientId && item.type === 'medication');
  patientExtracted.forEach((item) => {
    const key = (item.name || '').toLowerCase().trim();
    if (!key) return;
    medMap.set(key, {
      _id: item._id,
      name: item.name,
      dose: item.dose || 'Standard Dose',
      frequency: item.frequency || 'As directed',
      foodRelation: item.foodRelation || 'With water',
      duration: item.duration || '5 days',
      sourceSentence: item.sourceSentence || `Take ${item.name} as directed.`,
      form: 'Oral Tablet',
      route: 'Oral',
      scheduledTimes: []
    });
  });

  // (b) From Reminders (enrich timing hours & catch unextracted active medications)
  reminders.forEach((r) => {
    const key = (r.medicationName || '').toLowerCase().trim();
    if (!key) return;
    const timeStr = r.scheduledAt
      ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    if (medMap.has(key)) {
      const existing = medMap.get(key);
      if (r.dose && (!existing.dose || existing.dose === 'Standard Dose')) {
        existing.dose = r.dose;
      }
      if (timeStr && !existing.scheduledTimes.includes(timeStr)) {
        existing.scheduledTimes.push(timeStr);
      }
    } else {
      medMap.set(key, {
        _id: r._id,
        name: r.medicationName,
        dose: r.dose || 'Standard Dose',
        frequency: 'Daily scheduled',
        foodRelation: 'As advised by physician',
        duration: 'Course duration as prescribed',
        sourceSentence: `Scheduled medication: ${r.medicationName} ${r.dose || ''}`,
        form: 'Oral Tablet',
        route: 'Oral',
        scheduledTimes: timeStr ? [timeStr] : []
      });
    }
  });

  // (c) From Discharge Document rawText (capture any secondary medications mentioned)
  if (doc && doc.rawText) {
    const medSection = doc.rawText.match(/Medications:\s*([^.\n]+(?:\.[^.\n]+)*)/i);
    if (medSection && medSection[1]) {
      const sentences = medSection[1].split(/\.\s*/).filter((s) => s.trim().length > 0);
      sentences.forEach((s) => {
        const lower = s.toLowerCase();
        if (
          lower.includes('fever medicine') &&
          !medMap.has('fever medicine') &&
          !medMap.has('paracetamol')
        ) {
          medMap.set('fever medicine', {
            _id: `DOC_MED_${patientId}_1`,
            name: 'Prescribed Fever Medicine (Antipyretic)',
            dose: 'As needed',
            frequency: 'PRN (As needed)',
            foodRelation: 'After meals',
            duration: 'For fever / pain relief',
            sourceSentence: `${s.trim()}.`,
            form: 'Oral Tablet',
            route: 'Oral',
            scheduledTimes: []
          });
        }
      });
    }
  }

  const allCompiledMedications = Array.from(medMap.values());

  // Collect Lab Tests
  const labTests = instructions.labTests && instructions.labTests.length > 0
    ? instructions.labTests
    : extractedItemsData.filter((i) => i.patientId === patientId && (i.type === 'lab_test' || i.type === 'investigation'));

  return {
    patient,
    document: doc,
    uploadedDocuments: uploadedDocs,
    medications: allCompiledMedications,
    labTests: labTests || [],
    activity: instructions.activity || [],
    restrictions: instructions.restrictions || [],
    diet: instructions.diet || [],
    woundCare: instructions.woundCare || [],
    followUp: instructions.followUp || [],
    warningSigns: instructions.warningSigns || [],
    reminders
  };
}



