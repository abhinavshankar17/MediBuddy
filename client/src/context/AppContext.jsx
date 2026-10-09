import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser as saveCurrentUser, logoutUser as clearUserSession } from '../services/authService';

import i18n from '../i18n';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const saved = localStorage.getItem('medi_buddy_language');
    if (saved && ['en', 'hi', 'ta'].includes(saved)) return saved;
    const user = getCurrentUser();
    return user?.language || i18n.language || 'en';
  });
  const [portalRole, setPortalRole] = useState(() => {
    if (currentUser?.role === 'nurse' || currentUser?.role === 'clinician') return 'nurse';
    if (currentUser?.role === 'caregiver') return 'caregiver';
    return 'patient';
  });
  const [activePatientId, setActivePatientId] = useState(() => {
    if (currentUser?.role === 'caregiver' && currentUser?.patientIds?.length > 0) {
      return currentUser.patientIds[0];
    }
    return currentUser?.patientId || 'P001';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Synchronize language when i18n changes
  useEffect(() => {
    const handleLangChange = (lng) => {
      setCurrentLanguage(lng);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  const changeLanguage = async (newLang) => {
    if (!['en', 'hi', 'ta'].includes(newLang)) return;
    setCurrentLanguage(newLang);
    await i18n.changeLanguage(newLang);
    try {
      localStorage.setItem('medi_buddy_language', newLang);
    } catch (e) {}

    if (currentUser) {
      const updatedUser = { ...currentUser, language: newLang };
      setCurrentUser(updatedUser);
      saveCurrentUser(updatedUser);

      // Backend sync for authenticated patient / caregiver
      const targetId = updatedUser.patientId || activePatientId;
      if (targetId) {
        try {
          await fetch(`/api/patients/${targetId}/language`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: newLang })
          });
        } catch (err) {
          // silent fallback
        }
      }
    }
  };

  // Update activePatientId and portalRole when currentUser changes
  const loginUser = (user) => {
    saveCurrentUser(user);
    setCurrentUser(user);
    setIsMobileMenuOpen(false);

    if (user?.language && ['en', 'hi', 'ta'].includes(user.language)) {
      changeLanguage(user.language);
    }

    if (user.role === 'nurse' || user.role === 'clinician') {
      setPortalRole('nurse');
      setActivePatientId(user.assignedPatients ? user.assignedPatients[0] : 'P001');
    } else if (user.role === 'caregiver') {
      setPortalRole('caregiver');
      setActivePatientId(user.patientIds ? user.patientIds[0] : (user.patientId || 'P001'));
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
      language: currentLanguage || 'ta'
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
    currentLanguage,
    changeLanguage,
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
