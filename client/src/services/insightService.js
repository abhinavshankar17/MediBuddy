import patientInsightsData from '../../../data/mock/patientInsights.json';
import eventsData from '../../../data/mock/events.json';

/**
 * Service adapter for Patient Insight & Evidence Grounding.
 */
export async function getPatientInsight(patientId = 'P001') {
  try {
    const res = await fetch(`/api/patients/${patientId}/insight`);
    if (res.ok) {
      const json = await res.json();
      const result = json.data || json;
      return Array.isArray(result) ? result[0] : result;
    }
  } catch (err) {
    // Backend endpoint offline, fallback to mock dataset
  }

  const insight = patientInsightsData.find((pi) => pi.patientId === patientId);
  return insight || patientInsightsData[0];
}

export async function getEvidenceEvents(evidenceEventIds = []) {
  if (!evidenceEventIds || evidenceEventIds.length === 0) return [];

  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const json = await res.json();
      const events = json.data || json;
      if (Array.isArray(events) && events.length > 0) {
        return events.filter((evt) => evidenceEventIds.includes(evt._id));
      }
    }
  } catch (err) {
    // Backend offline, fallback to mock dataset
  }

  return eventsData.filter((evt) => evidenceEventIds.includes(evt._id));
}

/**
 * Fetch encouragement messages and care notes sent by family / caregiver
 */
export async function getPatientEncouragements(patientId = 'P001') {
  let remoteList = [];
  try {
    const res = await fetch(`/api/patients/${patientId}/encouragement`);
    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      if (Array.isArray(data)) remoteList = data;
    }
  } catch (err) {}

  let localList = [];
  try {
    const raw = localStorage.getItem(`medi_buddy_patient_encouragements_${patientId}`);
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  const map = new Map();
  remoteList.forEach((e) => map.set(e._id, e));
  localList.forEach((e) => {
    if (map.has(e._id)) {
      map.set(e._id, { ...map.get(e._id), ...e });
    } else {
      map.set(e._id, e);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0)
  );
}
