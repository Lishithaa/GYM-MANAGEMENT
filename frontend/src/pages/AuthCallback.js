import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);

      if (!sessionIdMatch) {
        navigate('/login');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        setUser(response.data.user);
        navigate('/dashboard', { state: { user: response.data.user }, replace: true });
      } catch (error) {
        console.error('Session exchange failed:', error);
        navigate('/login');
      }
    };

    processSession();
  }, [navigate, setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Authenticating...</div>
    </div>
  );
};

export default AuthCallback;
