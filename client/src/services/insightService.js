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
