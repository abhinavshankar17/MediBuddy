import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser as saveCurrentUser, logoutUser as clearUserSession } from '../services/authService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [portalRole, setPortalRole] = useState(() => (currentUser?.role === 'nurse' || currentUser?.role === 'clinician' ? 'nurse' : 'patient'));
  const [activePatientId, setActivePatientId] = useState(() => currentUser?.patientId || 'P001');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update activePatientId and portalRole when currentUser changes
  const loginUser = (user) => {
    saveCurrentUser(user);
    setCurrentUser(user);
    setIsMobileMenuOpen(false);
    if (user.role === 'nurse' || user.role === 'clinician') {
      setPortalRole('nurse');
      setActivePatientId(user.assignedPatients ? user.assignedPatients[0] : 'P001');
    } else {
      setPortalRole('patient');
      setActivePatientId(user.patientId || 'P001');
    }
  };

  const logout = () => {
    clearUserSession();
    setIsMobileMenuOpen(false);
    const defaultUser = {
      _id: 'P001',
      name: 'Meena Krishnan',
      email: 'patient1@carebridge.demo',
      role: 'patient',
      patientId: 'P001',
      language: 'ta'
    };
    setCurrentUser(defaultUser);
    setPortalRole('patient');
    setActivePatientId('P001');
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const value = {
    currentUser,
    loginUser,
    logout,
    portalRole,
    setPortalRole,
    activePatientId,
    setActivePatientId,
    searchQuery,
    setSearchQuery,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu
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
