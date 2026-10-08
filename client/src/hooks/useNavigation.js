import { useLocation, useNavigate } from 'react-router-dom';

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isPatientRoute = location.pathname.startsWith('/patient');
  const isNurseRoute = location.pathname.startsWith('/nurse');

  return {
    pathname: location.pathname,
    navigate,
    isPatientRoute,
    isNurseRoute
  };
}
