import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [portalRole, setPortalRole] = useState('patient'); // 'patient' | 'nurse'
  const [activePatientId, setActivePatientId] = useState('P001');
  const [activeNurseId, setActiveNurseId] = useState('N001');
  const [searchQuery, setSearchQuery] = useState('');

  const value = {
    portalRole,
    setPortalRole,
    activePatientId,
    setActivePatientId,
    activeNurseId,
    setActiveNurseId,
    searchQuery,
    setSearchQuery
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
