import patientsData from '../../../data/mock/patients.json';
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
  return patientsData;
}

export async function getPatientById(patientId = 'P001') {
  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  
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
  const patientItems = extractedItemsData.filter((item) => item.patientId === patientId);

  const grouped = {
    medications: patientItems.filter((i) => i.type === 'medication'),
    activity: patientItems.filter((i) => i.type === 'activity' || i.type === 'exercise'),
    restrictions: patientItems.filter((i) => i.type === 'restriction'),
    diet: patientItems.filter((i) => i.type === 'diet'),
    woundCare: patientItems.filter((i) => i.type === 'wound_care'),
    followUp: patientItems.filter((i) => i.type === 'follow_up'),
    warningSigns: patientItems.filter((i) => i.type === 'warning_sign')
  };

  return grouped;
}
