import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      showToast('Password reset link sent to your email!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-glow"></div>

      <div className="login-container">
        <div className="hero-section">
          <div className="logo-area">
            <img src="assets/logos/logo.png" alt="NIVE Logo" className="logo" />
            <p className="tagline">CHOOSE • PLAY • DISCOVER</p>
          </div>

          <div className="hero-image">
            <img src="assets/backgrounds/reader.png" alt="Nive Reader" />
          </div>
        </div>

        <div className="login-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>

          <h1>Reset Password</h1>
          <p className="subtitle">Enter your email and we'll send you a password recovery link</p>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#22c55e', marginBottom: '16px' }}>Check your inbox for the reset link.</p>
              <Link to="/login" className="login-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form id="forgotPasswordForm" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="emailInput">Email Address</label>
                <input
                  id="emailInput"
                  type="email"
                  placeholder="Enter your registered email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn" id="submitBtn" disabled={loading}>
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              </button>
            </form>
          )}

          <div className="signup" style={{ marginTop: '20px' }}>
            Remembered your password?{' '}
            <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
