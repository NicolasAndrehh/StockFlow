import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/features/Auth/AuthContext';

export function HomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'Administrator') return <Navigate to="/products" replace />;

  return <Navigate to="/unauthorized" replace />;
}