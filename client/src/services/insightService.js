import patientInsightsData from '../../../data/mock/patientInsights.json';
import eventsData from '../../../data/mock/events.json';

/**
 * Service adapter for Patient Insight & Evidence Grounding.
 */
export async function getPatientInsight(patientId = 'P001') {
  try {
    const res = await fetch(`/api/patients/${patientId}/insights`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend endpoint offline, fallback to mock dataset
  }

  const insight = patientInsightsData.find((pi) => pi.patientId === patientId);
  return insight || patientInsightsData[0];
}

export async function getEvidenceEvents(evidenceEventIds = []) {
  if (!evidenceEventIds || evidenceEventIds.length === 0) return [];
  
  return eventsData.filter((evt) => evidenceEventIds.includes(evt._id));
}
