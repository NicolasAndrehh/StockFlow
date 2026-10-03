import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../components/features/Auth/AuthContext';

export function RequireLocationSelected() {
  const { user, activeLocation } = useAuth();

  // Solo el Administrator pasa por el selector; Cashier/Waiter ya traen sede fija
  if (user?.role === 'Administrator' && !activeLocation) {
    return <Navigate to="/select-location" replace />;
  }

  return <Outlet />;
}