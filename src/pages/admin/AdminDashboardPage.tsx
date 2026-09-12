import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStories,
  getUserList,
  getStoreSettings,
  saveStoreSettings,
  getBankTransferRequests,
  approveBankTransferRequest,
  rejectBankTransferRequest
} from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { StoreSettings, BankTransferRequest } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, stories: 0, chapters: 0, pendingTransfers: 0 });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    bankName: 'Kuda Microfinance Bank',
    accountNumber: '2019482910',
    accountName: 'Nive Interactive Fiction Ltd',
    instructions: 'Include your Transaction Reference in the transfer remark. Upload your receipt and send via WhatsApp for instant credit.',
    currencySymbol: '₦',
    whatsappNumber: '2348123456789',
    paystackPublicKey: 'pk_test_8484a0d9b4be463f82987151e36c28f95c55be0c',
    enableBankTransfer: true,
    enablePaystack: true,
    exchangeRateNgn: 1000
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Bank Transfer Requests
  const [transfers, setTransfers] = useState<BankTransferRequest[]>([]);
  const [transferFilter, setTransferFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAdminLogout = async () => {
    try {
      await logout();
      showToast('Admin logged out successfully', 'info');
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const loadData = async () => {
    const [stories, users, settings, transferList] = await Promise.all([
      getStories(),
      getUserList(),
      getStoreSettings(),
      getBankTransferRequests()
    ]);

    const pendingCount = transferList.filter(t => t.status === 'pending').length;

    setStats({
      stories: stories.length,
      users: users.length,
      chapters: stories.reduce((acc, s) => acc + (s.totalChapters || 1), 0),
      pendingTransfers: pendingCount
    });

    if (settings) setStoreSettings(settings);
    setTransfers(transferList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBankSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveStoreSettings(storeSettings);
      showToast('Store, Bank, WhatsApp & Paystack settings updated live!', 'success');
    } catch (e: any) {
      showToast('Failed to update store settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveTransfer = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await approveBankTransferRequest(id);
      if (res.success) {
        showToast(`Approved! +${res.coinsAdded} coins credited to ${res.userEmail}`, 'success');
        await loadData();
      } else {
        showToast('Transfer request not found', 'error');
      }
    } catch (e: any) {
      showToast('Error approving transfer', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransfer = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this transfer request?')) return;
    setProcessingId(id);
    try {
      await rejectBankTransferRequest(id);
      showToast('Transfer marked as rejected', 'info');
      await loadData();
    } catch {
      showToast('Error rejecting transfer', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (transferFilter !== 'all' && t.status !== transferFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-page-wrapper container" style={{ padding: '24px 16px 100px', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>Nive Admin Control Center</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Live control room for stories, bank payments, WhatsApp verification, and readers</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn ghost"
            onClick={() => navigate('/home')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Exit to App Home
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
            <span>Log Out Admin</span>
          </button>
        </div>
      </header>

      {/* QUICK STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#E50914', margin: 0 }}>{stats.users}</h2>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Registered Readers</p>
        </div>
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#D4AF37', margin: 0 }}>{stats.stories}</h2>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Live Stories in DB</p>
        </div>
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e', margin: 0 }}>{stats.chapters}</h2>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Published Chapters</p>
        </div>
        <div style={{ background: '#111', borderRadius: '16px', border: stats.pendingTransfers > 0 ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.06)', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fbbf24', margin: 0 }}>{stats.pendingTransfers}</h2>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Pending Transfers</p>
        </div>
      </div>

      {/* SECTION 1: BANK TRANSFERS & RECEIPT APPROVALS */}
      <div style={{ background: '#111', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '28px' }}>receipt_long</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Bank Transfer Receipts & Approvals ({transfers.length})
              </h2>
              <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                Verify customer payment screenshots and credit coins directly to reader balances with 1 click.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px' }}>
              {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTransferFilter(f)}
                  style={{
                    background: transferFilter === f ? '#E50914' : 'transparent',
                    color: transferFilter === f ? '#fff' : '#aaa',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f} {f === 'pending' && stats.pendingTransfers > 0 ? `(${stats.pendingTransfers})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SEARCH BOX */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by Transaction Ref (NIVE-TX-...), Email, or Username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '13px'
            }}
          />
        </div>

        {/* TRANSFERS LIST */}
        {filteredTransfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#666', fontSize: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            No {transferFilter !== 'all' ? transferFilter : ''} bank transfer requests found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTransfers.map(t => (
              <div
                key={t.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: t.status === 'pending' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* RECEIPT PREVIEW THUMBNAIL */}
                  {t.proofImage ? (
                    <div
                      onClick={() => setPreviewReceiptUrl(t.proofImage || null)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                      title="Click to view full receipt"
                    >
                      <img
                        src={t.proofImage}
                        alt="Receipt"
                        style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}
                      />
                      <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '14px', borderRadius: '4px', padding: '1px' }}>
                        zoom_in
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: '#666' }}>
                      <span className="material-symbols-outlined">receipt</span>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '14px', letterSpacing: '0.5px' }}>{t.id}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: t.status === 'approved' ? 'rgba(34,197,94,0.2)' : t.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                        color: t.status === 'approved' ? '#22c55e' : t.status === 'rejected' ? '#ef4444' : '#fbbf24'
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#fff', marginTop: '3px' }}>
                      <strong>{t.username}</strong> ({t.userEmail})
                    </div>

                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      Package: <span style={{ color: '#06b6d4', fontWeight: 600 }}>{t.title} (+{t.coins} Coins)</span> • Amount: <strong style={{ color: '#fff' }}>{t.amount}</strong> • {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {t.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveTransfer(t.id)}
                        disabled={processingId === t.id}
                        className="btn"
                        style={{
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: '#fff',
                          fontWeight: 800,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        <span>{processingId === t.id ? 'Crediting...' : `Approve & Add ${t.coins} Coins`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectTransfer(t.id)}
                        disabled={processingId === t.id}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {t.status === 'approved' && (
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                      <span>Coins Credited ({new Date(t.approvedAt || t.createdAt).toLocaleDateString()})</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULLSCREEN RECEIPT MODAL */}
      {previewReceiptUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img
              src={previewReceiptUrl}
              alt="Payment Screenshot"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setPreviewReceiptUrl(null)}
                style={{ padding: '8px 24px', borderRadius: '8px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGEMENT MODULES */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
        Content & User Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        <div
          onClick={() => navigate('/admin/stories/new')}
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, #111 100%)',
            border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#E50914', fontSize: '32px' }}>add_circle</span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '10px 0 4px' }}>Create New Story</h3>
          <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Write or AI-parse interactive chapters, choices & cover art.</p>
        </div>

        <div
          onClick={() => navigate('/admin/stories')}
          style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#06b6d4', fontSize: '32px' }}>menu_book</span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '10px 0 4px' }}>Manage Stories ({stats.stories})</h3>
          <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Edit seeded stories, chapters, pricing, branches, and banner featured status.</p>
        </div>

        <div
          onClick={() => navigate('/admin/users')}
          style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '32px' }}>group</span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '10px 0 4px' }}>Manage Users ({stats.users})</h3>
          <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>View registered readers, gift/adjust coins, and manage user roles.</p>
        </div>
      </div>

      {/* LIVE STORE, WHATSAPP & PAYSTACK SETTINGS (CONTROL ROOM) */}
      <div style={{ background: '#111', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ color: '#22c55e', fontSize: '28px' }}>account_balance</span>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Live Store, Bank Transfer & Paystack Settings
            </h2>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
              Changes made here immediately update the bank details, WhatsApp support destination, and Paystack API gateway shown in reader checkout.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBankSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Bank Name</label>
              <input
                type="text"
                value={storeSettings.bankName}
                onChange={e => setStoreSettings({ ...storeSettings, bankName: e.target.value })}
                required
                placeholder="e.g. Kuda Microfinance Bank / Zenith Bank"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Account Number</label>
              <input
                type="text"
                value={storeSettings.accountNumber}
                onChange={e => setStoreSettings({ ...storeSettings, accountNumber: e.target.value })}
                required
                placeholder="e.g. 2019482910"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Account Name</label>
              <input
                type="text"
                value={storeSettings.accountName}
                onChange={e => setStoreSettings({ ...storeSettings, accountName: e.target.value })}
                required
                placeholder="e.g. Nive Interactive Fiction Ltd"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>WhatsApp Support Number (with Country Code)</label>
              <input
                type="text"
                value={storeSettings.whatsappNumber || ''}
                onChange={e => setStoreSettings({ ...storeSettings, whatsappNumber: e.target.value })}
                required
                placeholder="e.g. 2348123456789"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(34,197,94,0.3)', color: '#fff', marginTop: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#888', marginTop: '4px', display: 'block' }}>
                When readers click "Send to WhatsApp", messages and proof will open directly to this number.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#06b6d4' }}>Paystack Public API Key (Sandbox or Live)</label>
              <input
                type="text"
                value={storeSettings.paystackPublicKey || ''}
                onChange={e => setStoreSettings({ ...storeSettings, paystackPublicKey: e.target.value })}
                required
                placeholder="pk_test_... or pk_live_..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(6,182,212,0.3)', color: '#fff', marginTop: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#888', marginTop: '4px', display: 'block' }}>
                Supports Paystack sandbox (`pk_test_...`) and production (`pk_live_...`).
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Payment Instructions for Readers</label>
            <textarea
              rows={2}
              value={storeSettings.instructions}
              onChange={e => setStoreSettings({ ...storeSettings, instructions: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
            />
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
              color: '#000',
              fontWeight: 800,
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            {savingSettings ? 'Saving Settings...' : 'Save Live Store & Gateway Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};
