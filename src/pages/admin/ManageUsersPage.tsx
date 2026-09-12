import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserList, updateUserRecord } from '../../services/database';
import { useToast } from '../../components/common/Toast';
import { UserProfile } from '../../types';

export const ManageUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadUsers = () => {
    getUserList().then(list => {
      setUsers(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleToggle = async (u: UserProfile) => {
    const newRole = u.role === 'admin' ? 'reader' : 'admin';
    await updateUserRecord(u.id || '', { role: newRole });
    showToast(`Updated ${u.username} role to ${newRole}`, 'success');
    loadUsers();
  };

  const handleAdjustCoins = async (u: UserProfile, delta: number) => {
    const newCoins = Math.max(0, (u.coins || 0) + delta);
    await updateUserRecord(u.id || '', { coins: newCoins });
    showToast(`Adjusted coins for ${u.username}`, 'info');
    loadUsers();
  };

  const filtered = users.filter(
    u => !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '30px 16px', maxWidth: '1000px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/admin')}
        style={{ background: 'transparent', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '16px' }}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        <span>Dashboard</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>Manage Users</h1>
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 14px',
            borderRadius: '8px',
            color: '#fff',
            minWidth: '260px'
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>Loading users...</div>
      ) : (
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '14px 16px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Role</th>
                <th style={{ padding: '14px 16px' }}>Coins</th>
                <th style={{ padding: '14px 16px' }}>Level</th>
                <th style={{ padding: '14px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{u.username || 'Reader'}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: u.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                        color: u.role === 'admin' ? '#ef4444' : '#aaa',
                        fontWeight: 600
                      }}
                    >
                      {u.role || 'reader'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#fbbf24', fontWeight: 600 }}>
                    🪙 {u.coins || 0}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#aaa' }}>
                    Lvl {u.level || 1}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAdjustCoins(u, 50)}
                        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        +50 🪙
                      </button>
                      <button
                        onClick={() => handleRoleToggle(u)}
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No users found.</div>
          )}
        </div>
      )}
    </div>
  );
};
