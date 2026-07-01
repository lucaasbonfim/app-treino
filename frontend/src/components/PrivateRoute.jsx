import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export default function PrivateRoute() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

