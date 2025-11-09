import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import api from '../utils/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const isInitialMount = useRef(true);
  const isLoggingIn = useRef(false);

  const fetchUser = useCallback(async () => {
    // Skip fetchUser if we're in the middle of a login to prevent race conditions
    if (isLoggingIn.current) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch user on initial mount or when token changes from external source
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (token) {
        fetchUser();
      } else {
        setLoading(false);
      }
    } else if (token && !isLoggingIn.current) {
      // Token changed but we're not logging in, so fetch user
      fetchUser();
    }
  }, [token, fetchUser]);

  const login = async (email, password) => {
    try {
      isLoggingIn.current = true;
      setLoading(true);
      
      const response = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      // Set token and user atomically to prevent race conditions
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setLoading(false);
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      throw error;
    } finally {
      // Reset login flag after a short delay to allow state to settle
      setTimeout(() => {
        isLoggingIn.current = false;
      }, 100);
    }
  };

  const register = async (userData) => {
    try {
      isLoggingIn.current = true;
      setLoading(true);
      
      const response = await api.post('/api/auth/register', userData);
      const { token: newToken, user: newUser } = response.data;
      
      // Set token and user atomically to prevent race conditions
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      setLoading(false);
      
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      setLoading(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      throw error;
    } finally {
      // Reset login flag after a short delay to allow state to settle
      setTimeout(() => {
        isLoggingIn.current = false;
      }, 100);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

