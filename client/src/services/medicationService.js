import medicationRemindersData from '../../../data/mock/medicationReminders.json';
import extractedItemsData from '../../../data/mock/extractedItems.json';

// In-memory state store for active session changes
let localReminders = JSON.parse(JSON.stringify(medicationRemindersData));

/**
 * Fetch medication reminders for a patient with joined extractedItem details
 */
export async function getMedicationReminders(patientId = 'P001') {
  try {
    const res = await fetch(`/api/patients/${patientId}/medication-reminders`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    // Backend endpoint offline, fallback to structured mock data
  }

  const patientReminders = localReminders.filter((m) => m.patientId === patientId);

  return patientReminders.map((reminder) => {
    const extracted = extractedItemsData.find((item) => item._id === reminder.extractedItemId) || {};

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
      status: reminder.status || 'scheduled', // 'scheduled' | 'reminded' | 'taken' | 'missed' | 'overdue'
      responseType: reminder.responseType || 'no_response',
      respondedAt: reminder.respondedAt || null,
      createdAt: reminder.createdAt
    };
  });
}

/**
 * Confirm medication taken via API endpoint
 * Consumes: POST /api/medication-reminders/:id/confirm
 */
export async function confirmMedicationTaken(reminderId) {
  const payload = {
    responseType: 'taken',
    respondedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/medication-reminders/${reminderId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const responseData = await res.json();
      return { success: true, data: responseData };
    }
  } catch (err) {
    console.warn(`[medicationService] Backend endpoint /api/medication-reminders/${reminderId}/confirm offline. Updating memory state.`);
  }

  // Simulate network processing delay for UI loading validation
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Local fallback update
  const reminderIndex = localReminders.findIndex((m) => m._id === reminderId);
  if (reminderIndex !== -1) {
    localReminders[reminderIndex] = {
      ...localReminders[reminderIndex],
      status: 'taken',
      responseType: 'taken',
      respondedAt: payload.respondedAt
    };
  }

  return {
    success: true,
    data: {
      _id: reminderId,
      status: 'taken',
      responseType: 'taken',
      respondedAt: payload.respondedAt
    }
  };
}
