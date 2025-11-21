import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center animate-fade-in">
          <div className="mb-6 animate-pulse">
            <img 
              src="/images/blcm-logo.png" 
              alt="BLCM Logo" 
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain mx-auto"
            />
          </div>
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-200 border-t-red-600 mb-4"></div>
          <p className="text-gray-600 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Access Denied</div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

