import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function NurseLayout() {
  const { setPortalRole } = useApp();

  useEffect(() => {
    setPortalRole('nurse');
  }, [setPortalRole]);

  return (
    <div className="nurse-portal-wrapper">
      <Outlet />
    </div>
  );
}
