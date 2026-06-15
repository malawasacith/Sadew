/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientLogin } from './pages/ClientLogin';
import { Shop } from './pages/Shop';
import { GemDetails } from './pages/GemDetails';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { useStoreSettings } from './hooks/useStoreSettings';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const unlocked = localStorage.getItem('storeUnlocked') === 'true';
  const adminUnlocked = localStorage.getItem('adminUnlocked') === 'true';

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (requireAdmin) {
    if (!adminUnlocked && !isAdmin) return <Navigate to="/admin/login" />;
    return <>{children}</>;
  }

  // Not admin required (Shop access)
  if (!unlocked && !adminUnlocked && !isAdmin) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function GlobalSettings() {
  useStoreSettings();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalSettings />
      <Router>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          } />
          <Route path="/gem/:id" element={
            <ProtectedRoute>
              <GemDetails />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
