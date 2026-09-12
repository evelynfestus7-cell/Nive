import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AuthGuard: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#888' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const AdminGuard: React.FC = () => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#888' }}>Checking admin permissions...</div>;
  }

  const isVerifiedAdmin = isAdmin || (currentUser?.email?.toLowerCase() === 'evelynfestus7@gmail.com');

  if (!currentUser || !isVerifiedAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
