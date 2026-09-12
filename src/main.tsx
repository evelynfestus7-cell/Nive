import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ReaderProvider } from './context/ReaderContext';
import { ToastProvider } from './components/common/Toast';
import { App } from './App';

// Import all existing CSS files to preserve 100% of UI design and styles
import '../css/global.css';
import '../css/index.css';
import '../css/home.css';
import '../css/library.css';
import '../css/library-ui.css';
import '../css/reader.css';
import '../css/search.css';
import '../css/social.css';
import '../css/store.css';
import '../css/profile.css';
import '../css/settings.css';
import '../css/story.css';
import '../css/story-editor.css';
import '../css/admin.css';
import '../css/onboarding.css';

// Global Error Boundary to prevent white screen or infinite loading
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Nive] Uncaught app error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#050505',
          color: '#ffffff',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ff3333', marginBottom: '12px' }}>
            Nive - Reload App
          </h1>
          <p style={{ color: '#aaa', fontSize: '14px', maxWidth: '460px', marginBottom: '24px' }}>
            {this.state.error?.message || 'A temporary loading issue occurred. Click below to refresh.'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #d50000, #ff3333)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Reset Cache & Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Unregister any stale ServiceWorker caching old localhost files
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

// Router configuration
const Router = typeof window !== 'undefined' && window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <Router>
          <AuthProvider>
            <UserProvider>
              <ReaderProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </ReaderProvider>
            </UserProvider>
          </AuthProvider>
        </Router>
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
}
