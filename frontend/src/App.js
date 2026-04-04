import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { recordNavigationPath } from '@/utils/goBack';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthCallback from '@/pages/AuthCallback';
import RoleSelection from '@/pages/RoleSelection';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Gyms from '@/pages/Gyms';
import GymDetail from '@/pages/GymDetail';
import Trainers from '@/pages/Trainers';
import TrainerDetail from '@/pages/TrainerDetail';
import Contact from '@/pages/Contact';
import UserDashboard from '@/pages/UserDashboard';
import BookingDetail from '@/pages/BookingDetail';
import GymOwnerDashboard from '@/pages/GymOwnerDashboard';
import TrainerDashboard from '@/pages/TrainerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';
import '@/App.css';

function AppRouter() {
  const location = useLocation();

  useEffect(() => {
    recordNavigationPath(location.pathname);
  }, [location.pathname]);

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/gyms" element={<Gyms />} />
      <Route path="/gyms/:id" element={<GymDetail />} />
      <Route path="/trainers" element={<Trainers />} />
      <Route path="/trainers/:id" element={<TrainerDetail />} />
      <Route path="/contact" element={<Contact />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      <Route path="/booking/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
      <Route path="/gym-owner/dashboard" element={<ProtectedRoute roles={['gym_owner']}><GymOwnerDashboard /></ProtectedRoute>} />
      <Route path="/trainer/dashboard" element={<ProtectedRoute roles={['trainer']}><TrainerDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
