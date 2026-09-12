import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthGuard, AdminGuard } from './components/common/AuthGuard';
import { useAuth } from './context/AuthContext';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';

import { HomePage } from './pages/main/HomePage';
import { LibraryPage } from './pages/main/LibraryPage';
import { SearchPage } from './pages/main/SearchPage';
import { SocialPage } from './pages/main/SocialPage';
import { StorePage } from './pages/main/StorePage';
import { ProfilePage } from './pages/main/ProfilePage';
import { SettingsPage } from './pages/main/SettingsPage';

import { StoryDetailPage } from './pages/story/StoryDetailPage';
import { ReaderPage } from './pages/story/ReaderPage';
import { StoryExperiencePage } from './pages/story/StoryExperiencePage';

import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ManageStoriesPage } from './pages/admin/ManageStoriesPage';
import { StoryEditorPage } from './pages/admin/StoryEditorPage';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';

import { TermsPage, PrivacyPage, NotFoundPage } from './pages/other/StaticPages';
import { PwaInstallBanner } from './components/common/PwaInstallBanner';

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3px solid rgba(255, 107, 53, 0.2)',
          borderTopColor: '#ff6b35',
          borderRadius: '50%',
          animation: 'niveSpin 0.8s linear infinite'
        }} />
        <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading NIVE...</p>
        <style>{`
          @keyframes niveSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <PwaInstallBanner />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={currentUser ? "/home" : "/login"} replace />} />

        {/* Auth Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Main Pages with Persistent Header and Bottom Nav */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Story & Interactive Reader Views */}
        <Route path="/story/:id" element={<StoryDetailPage />} />
        <Route path="/story/:id/experience" element={<StoryExperiencePage />} />
        <Route path="/reader/:storyId/:chapterId" element={<ReaderPage />} />

        {/* Admin Suite Routes */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/stories" element={<ManageStoriesPage />} />
          <Route path="/admin/stories/new" element={<StoryEditorPage />} />
          <Route path="/admin/stories/edit/:id" element={<StoryEditorPage />} />
          <Route path="/admin/users" element={<ManageUsersPage />} />
        </Route>

        {/* Static Info Pages */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};
