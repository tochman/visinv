import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
