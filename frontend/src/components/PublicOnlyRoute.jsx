import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export default function PublicOnlyRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/workouts" replace /> : <Outlet />;
}

