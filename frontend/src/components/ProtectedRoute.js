import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );

  useEffect(() => {
    if (location.state?.user) return;
    
    if (!loading) {
      setIsAuthenticated(!!user);
    }
  }, [user, loading, location.state]);

  if (isAuthenticated === null || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const dashboardMap = {
    user: '/dashboard',
    gym_owner: '/gym-owner/dashboard',
    trainer: '/trainer/dashboard',
    admin: '/admin'
  };

  // Keep /dashboard as the consumer dashboard only.
  if (roles.length === 0 && location.pathname === '/dashboard' && user?.role && user.role !== 'user') {
    return <Navigate to={dashboardMap[user.role] || '/dashboard'} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to={dashboardMap[user?.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
