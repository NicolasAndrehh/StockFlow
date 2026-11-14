import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../components/features/Auth/AuthContext';

const OPERATIONAL_PATHS = ['/inventory', '/tables', '/orders'];

export function RequireLocationSelected() {
  const { user, activeLocation } = useAuth();
  const location = useLocation();

  // Si el Administrador aún no ha seleccionado sede, lo envío al selector antes de operar (HU-06)
  if (user?.role === 'Administrator' && !activeLocation) {
    const isOperationalRoute =
      location.pathname === '/' ||
      OPERATIONAL_PATHS.some((path) => location.pathname.startsWith(path));

    if (isOperationalRoute) {
      return <Navigate to="/select-location" replace />;
    }
  }

  return <Outlet />;
}
