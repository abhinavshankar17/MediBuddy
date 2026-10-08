import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function NurseLayout() {
  const { currentUser, setPortalRole } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    setPortalRole('nurse');
    // If logged in user is a patient, redirect them to patient portal
    if (currentUser?.role === 'patient') {
      navigate('/patient', { replace: true });
    }
  }, [currentUser, navigate, setPortalRole]);

  return (
    <div className="nurse-portal-wrapper">
      <Outlet />
    </div>
  );
}
