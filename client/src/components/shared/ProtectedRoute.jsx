import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuthContext } from '../../context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);
  const { loading } = useAuthContext();

  if (loading) return <Loader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (allowedRoles.includes('admin')) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
          <h1 className="text-9xl font-extrabold text-gray-200 tracking-tighter">404</h1>
          <h2 className="text-3xl font-bold font-heading mt-4 text-gray-800">Page not found</h2>
          <p className="text-gray-500 mt-2 text-center max-w-md">The page you are looking for doesn't exist or has been moved.</p>
          <a href="/" className="mt-8 bg-primary hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all">
            Return Home
          </a>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
