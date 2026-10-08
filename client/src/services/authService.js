import usersData from '../../../data/mock/users.json';
import patientsData from '../../../data/mock/patients.json';

const STORAGE_KEY = 'medi_buddy_auth_user';

/**
 * Auth Service supporting 1-click persona quick login and session management
 */
export async function getAllDemoUsers() {
  return usersData.map((u) => {
    let detail = '';
    if (u.role === 'patient') {
      const p = patientsData.find((pt) => pt._id === u.patientId);
      detail = p ? `${p.condition} (${p.procedure})` : 'Post-discharge patient';
    } else if (u.role === 'nurse') {
      detail = `${u.department || 'Clinical Nursing'} • ${u.assignedPatients ? u.assignedPatients.length : 4} Patients`;
    } else if (u.role === 'clinician') {
      detail = `${u.specialization || 'Attending Physician'}`;
    } else if (u.role === 'caregiver') {
      detail = `Caregiver for ${u.patientIds ? u.patientIds.join(', ') : 'Family'}`;
    }

    return {
      ...u,
      detail
    };
  });
}

export function getCurrentUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse saved user session:', e);
  }
  // Default fallback user (P001 - Meena Krishnan)
  return {
    _id: 'P001',
    name: 'Meena Krishnan',
    email: 'patient1@carebridge.demo',
    role: 'patient',
    patientId: 'P001',
    language: 'ta'
  };
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user session:', e);
  }
  return user;
}

export function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user session:', e);
  }
}
