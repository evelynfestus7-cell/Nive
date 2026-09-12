import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { formatAuthError } from '../../services/firebase';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, loginWithGoogle, loginWithApple, currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If user is already authenticated (e.g. Returned from Google OAuth redirect)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email?.toLowerCase() === 'evelynfestus7@gmail.com') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('Logged in successfully!', 'success');
      if (email.trim().toLowerCase() === 'evelynfestus7@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      showToast(formatAuthError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast('Signed in with Google!', 'success');
      navigate('/home');
    } catch (err: any) {
      showToast(formatAuthError(err), 'error');
    }
  };

  const handleAppleLogin = async () => {
    try {
      await loginWithApple();
      showToast('Signed in with Apple!', 'success');
      navigate('/home');
    } catch (err: any) {
      showToast(formatAuthError(err), 'error');
    }
  };

  const handleGuestLogin = () => {
    showToast('Continuing as Guest', 'info');
    navigate('/home');
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-glow"></div>

      <div className="login-container">
        {/* LEFT / HERO SECTION */}
        <div className="hero-section">
          <div className="logo-area">
            <img src="assets/logos/logo.png" alt="NIVE Logo" className="logo" />
            <p className="tagline">CHOOSE • PLAY • DISCOVER</p>
          </div>

          <div className="hero-image">
            <img src="assets/backgrounds/reader.png" alt="Nive Reader" />
          </div>
        </div>

        {/* RIGHT / AUTH CARD */}
        <div className="login-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zm0 8.7L4.7 7 12 3.3 19.3 7 12 10.7zM4 11.5v5.8l8 4.4 8-4.4v-5.8l-8 4.4-8-4.4z" />
            </svg>
          </div>

          <h1>Welcome Back</h1>
          <p className="subtitle">Sign in to continue your interactive story journey</p>

          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="emailInput">Email Address</label>
              <input
                id="emailInput"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="passwordInput">Password</label>
              <div className="input-wrapper">
                <input
                  id="passwordInput"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  id="togglePassword"
                  className="toggle-pw"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-extras">
              <label className="remember-me">
                <input type="checkbox" id="rememberMe" defaultChecked />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="login-btn submit-btn" id="loginSubmitBtn" disabled={loading}>
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              {loading ? (
                <div className="btn-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="social-buttons social-buttons-labeled">
            <button className="social-btn social-btn-full" id="googleLoginBtn" type="button" onClick={handleGoogleLogin} aria-label="Continue with Google">
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              <span className="social-btn-text">Continue with Google</span>
            </button>

            <button className="social-btn social-btn-full" id="appleLoginBtn" type="button" onClick={handleAppleLogin} aria-label="Continue with Apple">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.02-.49 2.63-1.24z"/>
              </svg>
              <span className="social-btn-text">Continue with Apple</span>
            </button>

            <button className="social-btn social-btn-full" id="guestLoginBtn" type="button" onClick={handleGuestLogin} aria-label="Continue as Guest">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>person</span>
              <span className="social-btn-text">Continue as Guest</span>
            </button>
          </div>

          <div className="signup">
            Don't have an account?{' '}
            <Link to="/signup" id="signupBtn">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      <footer>
        <div className="socials" aria-label="Social media links">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24"><path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" /></svg>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
        </div>
        <p>© 2026 NIVE. All rights reserved.</p>
      </footer>
    </div>
  );
};
