import medicationRemindersData from '../../../data/mock/medicationReminders.json';
import extractedItemsData from '../../../data/mock/extractedItems.json';

const STORAGE_KEY = 'medibuddy_confirmed_reminders';

const getStoredStatuses = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveStoredStatus = (reminderId, statusData) => {
  try {
    const current = getStoredStatuses();
    current[reminderId] = statusData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {}
};

// In-memory state store for active session changes
let localReminders = JSON.parse(JSON.stringify(medicationRemindersData));

/**
 * Fetch medication reminders for a patient with joined extractedItem details
 */
export async function getMedicationReminders(patientId = 'P001') {
  const storedStatuses = getStoredStatuses();

  try {
    let res = await fetch(`/api/patients/${patientId}/reminders`);
    if (!res.ok) {
      res = await fetch(`/api/reminders?patientId=${patientId}`);
    }

    if (res.ok) {
      const json = await res.json();
      const list = json.data || json;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((reminder) => {
          const stored = storedStatuses[reminder._id];
          const isTaken = reminder.status === 'taken' || reminder.responseType === 'taken' || stored?.status === 'taken';

          return {
            _id: reminder._id,
            patientId: reminder.patientId,
            extractedItemId: reminder.extractedItemId,
            medicationName: reminder.medicationName || 'Prescribed Medication',
            dose: reminder.dose || 'As directed',
            scheduledAt: reminder.scheduledAt,
            timing: reminder.scheduledAt ? new Date(reminder.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled',
            frequency: reminder.instructionDetails?.frequency || 'Daily',
            foodRelation: reminder.instructionDetails?.foodRelation || 'With water',
            duration: reminder.instructionDetails?.duration || 'Full course',
            status: isTaken ? 'taken' : (reminder.status || 'scheduled'),
            responseType: isTaken ? 'taken' : (reminder.responseType || 'no_response'),
            respondedAt: reminder.respondedAt || stored?.respondedAt || null,
            confirmedFormattedTime: stored?.confirmedFormattedTime || (reminder.respondedAt ? new Date(reminder.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null),
            createdAt: reminder.createdAt
          };
        });
      }
    }
  } catch (err) {
    // Backend endpoint offline, fallback to structured mock data
  }

  const patientReminders = localReminders.filter((m) => m.patientId === patientId);

  return patientReminders.map((reminder) => {
    const extracted = extractedItemsData.find((item) => item._id === reminder.extractedItemId) || {};
    const stored = storedStatuses[reminder._id];
    const isTaken = reminder.status === 'taken' || reminder.responseType === 'taken' || stored?.status === 'taken';

    return {
      _id: reminder._id,
      patientId: reminder.patientId,
      extractedItemId: reminder.extractedItemId,
      medicationName: reminder.medicationName || extracted.name || 'Prescribed Medication',
      dose: reminder.dose || extracted.dose || 'As directed',
      scheduledAt: reminder.scheduledAt,
      timing: reminder.scheduledAt ? new Date(reminder.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled',
      frequency: extracted.frequency || 'Daily',
      foodRelation: extracted.foodRelation || 'With water',
      duration: extracted.duration || 'Full course',
      status: isTaken ? 'taken' : (reminder.status || 'scheduled'),
      responseType: isTaken ? 'taken' : (reminder.responseType || 'no_response'),
      respondedAt: reminder.respondedAt || stored?.respondedAt || null,
      confirmedFormattedTime: stored?.confirmedFormattedTime || null,
      createdAt: reminder.createdAt
    };
  });
}

/**
 * Confirm medication taken via API endpoint
 * Consumes: POST /api/reminders/:id/confirm or POST /api/patients/:patientId/reminders/:id/confirm
 */
export async function confirmMedicationTaken(reminderId, patientId = 'P001') {
  const now = new Date().toISOString();
  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const payload = {
    patientId,
    response: 'taken',
    responseType: 'taken',
    respondedAt: now
  };

  // Persist locally in browser immediately
  saveStoredStatus(reminderId, {
    status: 'taken',
    responseType: 'taken',
    respondedAt: now,
    confirmedFormattedTime: formattedTime
  });

  try {
    let res = await fetch(`/api/patients/${patientId}/reminders/${reminderId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      res = await fetch(`/api/reminders/${reminderId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      const responseData = await res.json();
      const updatedItem = responseData.data || responseData;

      // Also sync local memory cache
      const reminderIndex = localReminders.findIndex((m) => m._id === reminderId);
      if (reminderIndex !== -1) {
        localReminders[reminderIndex] = {
          ...localReminders[reminderIndex],
          status: 'taken',
          responseType: 'taken',
          respondedAt: now
        };
      }

      return { success: true, data: updatedItem };
    }
  } catch (err) {
    console.warn(`[medicationService] Backend endpoint /api/reminders/${reminderId}/confirm offline. Updated local storage.`);
  }

  // Local memory update
  const reminderIndex = localReminders.findIndex((m) => m._id === reminderId);
  if (reminderIndex !== -1) {
    localReminders[reminderIndex] = {
      ...localReminders[reminderIndex],
      status: 'taken',
      responseType: 'taken',
      respondedAt: now
    };
  }

  return {
    success: true,
    data: {
      _id: reminderId,
      patientId,
      status: 'taken',
      responseType: 'taken',
      respondedAt: now
    }
  };
}
