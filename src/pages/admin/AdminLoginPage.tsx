import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { formatAuthError } from '../../services/firebase';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('evelynfestus7@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (email.trim().toLowerCase() !== 'evelynfestus7@gmail.com') {
        showToast('Unauthorized: This email is not registered as an administrator.', 'error');
        setLoading(false);
        return;
      }

      await login(email.trim(), password);
      showToast('Admin Logged in successfully!', 'success');
      navigate('/admin');
    } catch (err: any) {
      showToast(formatAuthError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#111', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '24px', padding: '36px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '14px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>admin_panel_settings</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>Nive Admin Console</h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '6px' }}>
            Restricted to authorized system administrators
          </p>
        </div>

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccc', marginBottom: '6px' }}>
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', height: '48px', padding: '0 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccc', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', height: '48px', padding: '0 44px 0 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #d50000, #ef4444)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
              marginTop: '8px'
            }}
          >
            {loading ? 'Verifying Credentials...' : 'Sign In as Administrator'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <span
            onClick={() => navigate('/home')}
            style={{ color: '#888', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Return to App
          </span>
        </div>
      </div>
    </div>
  );
};
