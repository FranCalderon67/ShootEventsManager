import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import EventsList from './pages/EventsList';
import EventDetail from './pages/EventDetail';
import AdminPanel from './pages/AdminPanel';
import AdminEventForm from './pages/AdminEventForm';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner"></span></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/events" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <div className="app-container">
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner"></span></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/events" replace /> : <Login />} />
      <Route path="/events" element={
        <ProtectedRoute>
          <Layout><EventsList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/events/:id" element={
        <ProtectedRoute>
          <Layout><EventDetail /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <Layout><AdminPanel /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/events/new" element={
        <ProtectedRoute adminOnly>
          <Layout><AdminEventForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/events/:id/edit" element={
        <ProtectedRoute adminOnly>
          <Layout><AdminEventForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to={user ? '/events' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
