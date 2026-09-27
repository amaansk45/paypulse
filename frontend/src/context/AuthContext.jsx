import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('paypulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!localStorage.getItem('paypulse_access_token');
  const isAdmin = user?.role === 'ADMIN';

  // Load current user profile upon mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('paypulse_access_token');
    if (token) {
      api.get('/api/profile/')
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setUser(res.data.data);
            localStorage.setItem('paypulse_user', JSON.stringify(res.data.data));
          }
        })
        .catch(() => {
          // Token might be invalid or expired; interceptor will handle
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login/', { username, password });
    if (res.data?.success) {
      const { user: userData, tokens } = res.data.data;
      localStorage.setItem('paypulse_access_token', tokens.access);
      localStorage.setItem('paypulse_refresh_token', tokens.refresh);
      localStorage.setItem('paypulse_user', JSON.stringify(userData));
      setUser(userData);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed.');
  };

  const register = async (registerData) => {
    const res = await api.post('/api/auth/register/', registerData);
    if (res.data?.success) {
      const { user: userData, tokens } = res.data.data;
      localStorage.setItem('paypulse_access_token', tokens.access);
      localStorage.setItem('paypulse_refresh_token', tokens.refresh);
      localStorage.setItem('paypulse_user', JSON.stringify(userData));
      setUser(userData);
      return res.data;
    }
    throw new Error(res.data?.message || 'Registration failed.');
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('paypulse_refresh_token');
      if (refresh) {
        await api.post('/api/auth/logout/', { refresh });
      }
    } catch (e) {
      // Proceed with local logout regardless
    } finally {
      localStorage.removeItem('paypulse_access_token');
      localStorage.removeItem('paypulse_refresh_token');
      localStorage.removeItem('paypulse_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/api/profile/');
      if (res.data?.success && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('paypulse_user', JSON.stringify(res.data.data));
        return res.data.data;
      }
    } catch (e) {
      console.error("Failed to refresh user profile", e);
    }
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('paypulse_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
