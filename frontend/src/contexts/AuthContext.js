import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAxiosAuthHeader = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${API}/auth/refresh`, {
        refresh_token: refreshToken
      });
      const newAccessToken = response.data.access_token;
      localStorage.setItem('access_token', newAccessToken);
      setAxiosAuthHeader(newAccessToken);
      return newAccessToken;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAxiosAuthHeader(null);
      return null;
    }
  }, [setAxiosAuthHeader]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setAxiosAuthHeader(token);
    try {
      const response = await axios.get(`${API}/auth/me`, { timeout: 12000 });
      setUser(response.data);
    } catch (error) {
      const renewed = await refreshAccessToken();
      if (!renewed) {
        setUser(null);
      } else {
        try {
          const response = await axios.get(`${API}/auth/me`, { timeout: 12000 });
          setUser(response.data);
        } catch (_e) {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken, setAxiosAuthHeader]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { timeout: 20000 });
    const { access_token: accessToken, refresh_token: refreshToken, user: userData } = response.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setAxiosAuthHeader(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await axios.post(`${API}/auth/logout`, { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAxiosAuthHeader(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
