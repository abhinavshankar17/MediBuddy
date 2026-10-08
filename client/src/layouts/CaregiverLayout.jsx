import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function CaregiverLayout() {
  const { currentUser, setPortalRole } = useApp();

  useEffect(() => {
    setPortalRole('caregiver');
  }, [setPortalRole]);

  return (
    <div className="caregiver-portal-wrapper">
      <Outlet />
    </div>
  );
}
