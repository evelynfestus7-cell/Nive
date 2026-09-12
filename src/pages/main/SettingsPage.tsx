import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useReader } from '../../context/ReaderContext';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../components/common/Toast';
import { isSupabaseConfigured } from '../../services/supabase';

export const SettingsPage: React.FC = () => {
  const { logout, isAdmin, currentUser } = useAuth();
  const { settings, updateSettings, resetSettings } = useReader();
  const { user } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [narrationRate, setNarrationRate] = useState(0.95);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nive_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Reading data exported!', 'success');
  };

  const handleClearCache = () => {
    localStorage.removeItem('nive_recent_searches');
    localStorage.removeItem('nive_chapter_comments');
    localStorage.removeItem('nive_custom_stories');
    showToast('Local cache & search history cleared!', 'success');
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logged out of Nive', 'info');
    navigate('/login');
  };

  return (
    <div className="settings-page-wrapper container" style={{ padding: '24px 16px 100px', maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0 }}>
          Settings & Preferences
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', color: '#aaa' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSupabaseConfigured() ? '#22c55e' : '#eab308' }}></span>
          <span>{isSupabaseConfigured() ? 'Supabase Cloud Active' : 'Offline / Local Sync'}</span>
        </div>
      </div>

      {/* ADMIN CONSOLE SHORTCUT - Only visible to authenticated Admin */}
      {isAdmin && (
        <div
          onClick={() => navigate('/admin')}
          style={{
            background: 'linear-gradient(135deg, rgba(213,0,0,0.25) 0%, rgba(168,85,247,0.2) 100%)',
            border: '1px solid rgba(213,0,0,0.4)',
            borderRadius: '16px',
            padding: '18px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(213,0,0,0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="material-symbols-outlined" style={{ color: '#ff3333', fontSize: '28px' }}>admin_panel_settings</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Admin Control Center</div>
              <div style={{ fontSize: '13px', color: '#ccc' }}>Create stories, manage chapters, users & coins</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#fff' }}>arrow_forward</span>
        </div>
      )}

      {/* ACCOUNT SUMMARY */}
      <section style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#d50000' }}>account_circle</span>
          <span>Account & Profile</span>
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{user?.username || currentUser?.email || 'Reader'}</div>
            <div style={{ fontSize: '13px', color: '#888' }}>{currentUser?.email || 'Guest Account'}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/profile')}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
            >
              View Profile
            </button>
          </div>
        </div>
      </section>

      {/* READING & DISPLAY DEFAULTS */}
      <section style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>auto_stories</span>
          <span>Reader & Reading Defaults</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Reader Theme */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#ddd' }}>Default Reading Theme</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['dark', 'sepia', 'light'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateSettings({ theme: t })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: settings.theme === t ? '#d50000' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#ddd' }}>Font Family</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['serif', 'sans-serif'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => updateSettings({ fontFamily: f })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: settings.fontFamily === f ? '#d50000' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {f === 'serif' ? 'Bookish Serif' : 'Clean Sans'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Adjuster */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#ddd' }}>Font Size ({settings.fontSize}px)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 2) })}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIO & NARRATION */}
      <section style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>record_voice_over</span>
          <span>Audio & Voice Narration</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#ddd' }}>Sound Effects & Haptics</div>
              <div style={{ fontSize: '12px', color: '#777' }}>Play subtle sounds on choice selection</div>
            </div>
            <button
              onClick={() => {
                setSoundEffects(!soundEffects);
                showToast(soundEffects ? 'Sound effects muted' : 'Sound effects enabled', 'info');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: soundEffects ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {soundEffects ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#ddd' }}>Speech Speed ({narrationRate}x)</span>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={narrationRate}
              onChange={e => setNarrationRate(parseFloat(e.target.value))}
              style={{ accentColor: '#3b82f6', width: '140px' }}
            />
          </div>
        </div>
      </section>

      {/* STORAGE, BACKUP & CACHE */}
      <section style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#10b981' }}>sd_card</span>
          <span>Data, Backup & Storage</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={handleExportData}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span>Export Reading Backup JSON</span>
            <span className="material-symbols-outlined">download</span>
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span>Clear App Cache & History</span>
            <span className="material-symbols-outlined">cleaning_services</span>
          </button>
        </div>
      </section>

      {/* LEGAL & APP INFO */}
      <section style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
          About Nive
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
            <span>Version</span>
            <span>1.0.0 (Build 2026.1)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
            <span>Framework</span>
            <span>React 18 + Vite + Capacitor</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <span onClick={() => navigate('/terms')} style={{ color: '#d50000', cursor: 'pointer', fontWeight: 600 }}>Terms of Service</span>
            <span onClick={() => navigate('/privacy')} style={{ color: '#d50000', cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</span>
          </div>
        </div>
      </section>

      {/* LOGOUT BUTTON */}
      <button
        type="button"
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span className="material-symbols-outlined">logout</span>
        <span>Sign Out of Nive</span>
      </button>
    </div>
  );
};
