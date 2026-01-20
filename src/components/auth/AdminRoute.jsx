import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { appConfig } from '../../config/constants';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (user?.email !== appConfig.adminEmail) {
    return <Navigate to="/" replace />;
  }

  return children;
}
