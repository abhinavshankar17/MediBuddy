// Lightweight application state store registry
export const store = {
  getPatientData: (id) => ({ id: id || 'P001', name: 'John Doe' }),
  getNurseData: (id) => ({ id: id || 'N001', name: 'Nurse Sarah Jenkins' })
};
