import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PatientLayout() {
  const { setPortalRole } = useApp();

  useEffect(() => {
    setPortalRole('patient');
  }, [setPortalRole]);

  return (
    <div className="patient-portal-wrapper">
      <Outlet />
    </div>
  );
}
