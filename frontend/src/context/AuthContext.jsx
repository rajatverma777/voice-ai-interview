import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on first load
  useEffect(() => {
    const token  = localStorage.getItem('vai_token');
    const stored = localStorage.getItem('vai_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        // Verify token is still valid in the background
        getMe()
          .then(u => {
            setUser(u);
            localStorage.setItem('vai_user', JSON.stringify(u));
          })
          .catch(() => {
            localStorage.removeItem('vai_token');
            localStorage.removeItem('vai_user');
            setUser(null);
          });
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password });
    localStorage.setItem('vai_token', data.access_token);
    localStorage.setItem('vai_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await registerUser({ username, email, password });
    localStorage.setItem('vai_token', data.access_token);
    localStorage.setItem('vai_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch {}
    localStorage.removeItem('vai_token');
    localStorage.removeItem('vai_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
