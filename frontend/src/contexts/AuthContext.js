import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/config';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  migrateTokensFromLocalStorage,
  getStoredToken,
  setStoredToken,
  clearAuthTokens,
} from '@/utils/tokenStorage';

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
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${API}/auth/refresh`, {
        refresh_token: refreshToken
      });
      const newAccessToken = response.data.access_token;
      setStoredToken(ACCESS_TOKEN_KEY, newAccessToken);
      setAxiosAuthHeader(newAccessToken);
      return newAccessToken;
    } catch (error) {
      clearAuthTokens();
      setAxiosAuthHeader(null);
      return null;
    }
  }, [setAxiosAuthHeader]);

  const checkAuth = useCallback(async () => {
    migrateTokensFromLocalStorage();
    const token = getStoredToken(ACCESS_TOKEN_KEY);
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
    setStoredToken(ACCESS_TOKEN_KEY, accessToken);
    setStoredToken(REFRESH_TOKEN_KEY, refreshToken);
    setAxiosAuthHeader(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await axios.post(`${API}/auth/logout`, { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthTokens();
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
