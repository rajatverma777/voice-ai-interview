import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import InterviewPage from './pages/InterviewPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';

import BackgroundParticles from './components/BackgroundParticles';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-text-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;

  return (
    <div className="min-h-screen bg-void dot-grid flex flex-col relative overflow-hidden">
      <BackgroundParticles />
      <Navbar />
      <main className="flex-1 z-10 relative" style={{ isolation: 'isolate' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/auth"
            element={isAuthenticated ? <Navigate to="/interview" replace /> : <AuthPage />}
          />
          <Route
            path="/interview"
            element={<ProtectedRoute><InterviewPage /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
