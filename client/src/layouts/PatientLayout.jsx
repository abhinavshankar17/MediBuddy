import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PatientLayout() {
  const { currentUser, setPortalRole } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    setPortalRole('patient');
    // If logged in user is a nurse/clinician, keep them in nurse portal
    if (currentUser?.role === 'nurse' || currentUser?.role === 'clinician') {
      navigate('/nurse', { replace: true });
    }
  }, [currentUser, navigate, setPortalRole]);

  return (
    <div className="patient-portal-wrapper">
      <Outlet />
    </div>
  );
}
