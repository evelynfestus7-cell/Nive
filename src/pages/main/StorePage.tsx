import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { 
  getStoreSettings, 
  submitBankTransferRequest, 
  getBankTransferRequests 
} from '../../services/database';
import { StoreSettings, BankTransferRequest } from '../../types';

interface StoreItem {
  id: string;
  title: string;
  coins: number;
  price: string;
  priceNgn: number;
  desc: string;
  popular?: boolean;
}

const COIN_PACKS: StoreItem[] = [
  { id: 'coins_50', title: 'Pouch of Coins', coins: 50, price: '0.99', priceNgn: 500, desc: 'Unlock a few exciting chapters and choices' },
  { id: 'coins_150', title: 'Chest of Coins', coins: 150, price: '2.49', priceNgn: 1500, desc: 'Most popular! Read through multiple full stories', popular: true },
  { id: 'coins_400', title: 'Hoard of Coins', coins: 400, price: '4.99', priceNgn: 3000, desc: 'Generous pack for avid readers and decision-makers' },
  { id: 'coins_1000', title: 'Treasury of Coins', coins: 1000, price: '9.99', priceNgn: 7000, desc: 'Ultimate reserve for complete story universes' }
];

export const StorePage: React.FC = () => {
  const { user } = useUser();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [activeChannel, setActiveChannel] = useState<'bank' | 'paystack'>('bank');
  const [processing, setProcessing] = useState(false);
  const [txRef, setTxRef] = useState<string>('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [myTransfers, setMyTransfers] = useState<BankTransferRequest[]>([]);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    getStoreSettings().then(setStoreSettings);
    loadMyTransfers();
  }, [currentUser]);

  const loadMyTransfers = async () => {
    if (!currentUser) return;
    try {
      const all = await getBankTransferRequests();
      const userList = all.filter(r => r.userId === currentUser.uid || r.userEmail === currentUser.email);
      setMyTransfers(userList);
    } catch {}
  };

  const handleOpenModal = (item: StoreItem) => {
    const generatedRef = 'NIVE-TX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setTxRef(generatedRef);
    setProofImage(null);
    setSelectedItem(item);
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'success');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Receipt file size is too large (max 5MB)', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofImage(event.target?.result as string);
        showToast('Receipt attached successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Submit Bank Transfer & Open WhatsApp
  const handleBankTransferWithWhatsApp = async () => {
    if (!selectedItem) return;
    setProcessing(true);

    const priceDisplay = storeSettings.currencySymbol === '₦' 
      ? `₦${selectedItem.priceNgn.toLocaleString()}` 
      : `$${selectedItem.price}`;

    const newRequest: BankTransferRequest = {
      id: txRef,
      userId: currentUser?.uid || user.id || 'anonymous',
      userEmail: currentUser?.email || user.email || '',
      username: user.username || currentUser?.displayName || 'Reader',
      packageId: selectedItem.id,
      title: selectedItem.title,
      coins: selectedItem.coins,
      amount: priceDisplay,
      currency: storeSettings.currencySymbol,
      paymentMethod: 'bank_transfer',
      proofImage: proofImage || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await submitBankTransferRequest(newRequest);
      await loadMyTransfers();

      // Clean WhatsApp Number
      const cleanPhone = (storeSettings.whatsappNumber || '2348123456789').replace(/[^0-9]/g, '');

      // Format clean readable message
      const msg = [
        `👋 *Hello NIVE Support*, I just made a bank transfer payment!`,
        ``,
        `📌 *Transaction Ref:* ${txRef}`,
        `👤 *Account Email:* ${newRequest.userEmail}`,
        `👤 *Username:* ${newRequest.username}`,
        `🪙 *Package:* ${selectedItem.title} (${selectedItem.coins} Coins)`,
        `💰 *Amount:* ${priceDisplay}`,
        `🏦 *Bank:* ${storeSettings.bankName}`,
        `📅 *Date:* ${new Date().toLocaleString()}`,
        ``,
        proofImage ? `📎 *I have attached my receipt screenshot in this chat.*` : `📎 *Attaching receipt screenshot now...*`,
        ``,
        `Please confirm and credit my coins. Thank you!`
      ].join('\n');

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');

      showToast(`Transfer submitted! Ref: ${txRef}. WhatsApp opened.`, 'success');
      setSelectedItem(null);
    } catch (e: any) {
      showToast('Error submitting bank transfer', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Submit Bank Transfer Directly (without immediate WhatsApp)
  const handleBankTransferDirectSubmit = async () => {
    if (!selectedItem) return;
    if (!proofImage) {
      showToast('Please attach a screenshot of your payment receipt before submitting.', 'warning');
      return;
    }
    setProcessing(true);

    const priceDisplay = storeSettings.currencySymbol === '₦' 
      ? `₦${selectedItem.priceNgn.toLocaleString()}` 
      : `$${selectedItem.price}`;

    const newRequest: BankTransferRequest = {
      id: txRef,
      userId: currentUser?.uid || user.id || 'anonymous',
      userEmail: currentUser?.email || user.email || '',
      username: user.username || currentUser?.displayName || 'Reader',
      packageId: selectedItem.id,
      title: selectedItem.title,
      coins: selectedItem.coins,
      amount: priceDisplay,
      currency: storeSettings.currencySymbol,
      paymentMethod: 'bank_transfer',
      proofImage: proofImage,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await submitBankTransferRequest(newRequest);
      await loadMyTransfers();
      showToast(`Receipt submitted! Your Ref is ${txRef}. An admin will verify and credit your coins shortly.`, 'success');
      setSelectedItem(null);
    } catch {
      showToast('Failed to submit receipt', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 3. Paystack Online Payment Integration
  const handlePaystackPayment = () => {
    if (!selectedItem) return;
    setProcessing(true);

    const email = currentUser?.email || user.email || 'reader@nive.app';
    const amountInKobo = (selectedItem.priceNgn || 1000) * 100;
    const key = storeSettings.paystackPublicKey || 'pk_test_8484a0d9b4be463f82987151e36c28f95c55be0c';

    // Ensure Paystack popup script is loaded
    const loadScript = (callback: () => void) => {
      if ((window as any).PaystackPop) {
        callback();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => callback();
      script.onerror = () => {
        showToast('Failed to load Paystack payment gateway', 'error');
        setProcessing(false);
      };
      document.body.appendChild(script);
    };

    loadScript(() => {
      try {
        const handler = (window as any).PaystackPop.setup({
          key,
          email,
          amount: amountInKobo,
          currency: 'NGN',
          ref: txRef,
          metadata: {
            custom_fields: [
              { display_name: 'Username', variable_name: 'username', value: user.username || 'Reader' },
              { display_name: 'Coins', variable_name: 'coins', value: selectedItem.coins }
            ]
          },
          callback: async (response: any) => {
            setProcessing(false);
            const reference = response.reference || txRef;
            if (response.status === 'success' || response.reference) {
              // SECURITY: Never auto-credit coins on the client side.
              // Submit a pending verification request — admin must approve before coins are credited.
              const priceDisplay = `₦${selectedItem.priceNgn?.toLocaleString() || selectedItem.price}`;
              const pendingRequest: BankTransferRequest = {
                id: reference,
                userId: currentUser?.uid || user.id || 'anonymous',
                userEmail: currentUser?.email || user.email || '',
                username: user.username || currentUser?.displayName || 'Reader',
                packageId: selectedItem.id,
                title: `${selectedItem.title} (Paystack)`,
                coins: selectedItem.coins,
                amount: priceDisplay,
                currency: '₦',
                status: 'pending',
                createdAt: new Date().toISOString()
              };
              try {
                await submitBankTransferRequest(pendingRequest);
                await loadMyTransfers();
              } catch {
                console.warn('[Nive] Could not save Paystack pending request');
              }
              showToast(
                `✅ Paystack payment received! Ref: ${reference}. Your ${selectedItem.coins} coins will be credited after admin verification (usually within minutes).`,
                'success'
              );
              setSelectedItem(null);
            }
          },
          onClose: () => {
            setProcessing(false);
            showToast('Payment window closed', 'info');
          }
        });
        handler.openIframe();
      } catch (err: any) {
        console.error('Paystack error:', err);
        showToast('Unable to open Paystack popup', 'error');
        setProcessing(false);
      }
    });
  };

  return (
    <div className="store-page-wrapper container" style={{ padding: '20px 16px 100px', maxWidth: '840px', margin: '0 auto' }}>
      {/* HEADER CARD */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(6,182,212,0.1) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(168,85,247,0.3)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', color: '#E50914', fontWeight: 700, textTransform: 'uppercase' }}>
            Nive Store & Currency
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0 4px', color: '#fff' }}>
            Coin Store & VIP Pass
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
            Unlock branching chapters, make exclusive plot choices, and support authors.
          </p>
        </div>

        <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.4)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '11px', color: '#888', fontWeight: 700 }}>YOUR COIN BALANCE</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>
            🪙 {user.coins || 0}
          </div>
        </div>
      </div>

      {/* VIP PASS BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(216,180,254,0.3)',
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '24px' }}>workspace_premium</span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>Nive VIP Monthly Pass</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#d8b4fe', margin: 0, maxWidth: '460px' }}>
            Read all locked chapters for free, earn double XP on choices, and receive 500 bonus coins monthly.
          </p>
        </div>

        <button
          className="btn"
          onClick={() => handleOpenModal({ id: 'premium_sub', title: 'Nive VIP Monthly Pass', coins: 500, price: '6.99', priceNgn: 5000, desc: 'Unlimited reading access & double XP' })}
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000', fontWeight: 800, padding: '12px 24px', borderRadius: '12px' }}
        >
          {user.premium ? '✓ VIP Active' : (storeSettings.currencySymbol === '₦' ? '₦5,000 / month' : '$6.99 / month')}
        </button>
      </div>

      {/* COIN PACKAGES GRID */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          Purchase Coin Bundles
        </h2>

        {myTransfers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTransferHistory(!showTransferHistory)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#d8b4fe',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
            <span>My Transfers ({myTransfers.length})</span>
          </button>
        )}
      </div>

      {/* TRANSFER HISTORY ACCORDION */}
      {showTransferHistory && (
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Your Recent Bank Transfers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myTransfers.map(tr => (
              <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{tr.title} ({tr.coins} Coins)</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Ref: <span style={{ color: '#fbbf24' }}>{tr.id}</span> • {new Date(tr.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: tr.status === 'approved' ? 'rgba(34,197,94,0.2)' : tr.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                    color: tr.status === 'approved' ? '#22c55e' : tr.status === 'rejected' ? '#ef4444' : '#fbbf24'
                  }}>
                    {tr.status === 'approved' ? '✓ Credited' : tr.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {COIN_PACKS.map(pack => {
          const displayPrice = storeSettings.currencySymbol === '₦' 
            ? `₦${pack.priceNgn.toLocaleString()}` 
            : `$${pack.price}`;

          return (
            <div
              key={pack.id}
              style={{
                background: '#111',
                borderRadius: '16px',
                border: pack.popular ? '2px solid #E50914' : '1px solid rgba(255,255,255,0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                textAlign: 'center'
              }}
            >
              {pack.popular && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: 'linear-gradient(135deg, #E50914, #b20710)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(229, 9, 20, 0.4)'
                  }}
                >
                  POPULAR
                </span>
              )}

              <div>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🪙</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
                  {pack.coins} Coins
                </h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px', minHeight: '36px', lineHeight: 1.4 }}>
                  {pack.desc}
                </p>
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => handleOpenModal(pack)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: pack.popular ? 'linear-gradient(135deg, #E50914, #b20710)' : 'rgba(255,255,255,0.08)',
                  fontWeight: 700,
                  boxShadow: pack.popular ? '0 4px 14px rgba(229, 9, 20, 0.4)' : 'none'
                }}
              >
                {displayPrice}
              </button>
            </div>
          );
        })}
      </div>

      {/* CHECKOUT / PAYMENT MODAL */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#18181b',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.15)',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Checkout: {selectedItem.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* SUMMARY TICKET */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{selectedItem.title}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>🪙 {selectedItem.coins} Coins credited to {currentUser?.email || user.email}</div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>
                {storeSettings.currencySymbol === '₦' ? `₦${selectedItem.priceNgn.toLocaleString()}` : `$${selectedItem.price}`}
              </div>
            </div>

            {/* PAYMENT METHOD TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setActiveChannel('bank')}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  borderRadius: '10px',
                  background: activeChannel === 'bank' ? '#E50914' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: activeChannel === 'bank' ? '0 4px 12px rgba(229, 9, 20, 0.3)' : 'none'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_balance</span>
                <span>Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChannel('paystack')}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  borderRadius: '10px',
                  background: activeChannel === 'paystack' ? '#E50914' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: activeChannel === 'paystack' ? '0 4px 12px rgba(229, 9, 20, 0.3)' : 'none'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>credit_card</span>
                <span>Paystack / Card</span>
              </button>
            </div>

            {/* CHANNEL 1: BANK TRANSFER & WHATSAPP PROOF */}
            {activeChannel === 'bank' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: 800, marginBottom: '10px' }}>
                    1. Official Bank Account
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#888' }}>Bank Name:</span>
                    <strong style={{ color: '#fff' }}>{storeSettings.bankName}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#888' }}>Account Number:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: '#fbbf24', fontSize: '16px', letterSpacing: '0.5px' }}>{storeSettings.accountNumber}</strong>
                      <button
                        type="button"
                        onClick={() => handleCopyText(storeSettings.accountNumber, 'Account number')}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: '#888' }}>Account Name:</span>
                    <strong style={{ color: '#fff' }}>{storeSettings.accountName}</strong>
                  </div>

                  {/* UNIQUE TRANSACTION REFERENCE IDENTIFIER */}
                  <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px dashed #fbbf24', padding: '10px 12px', borderRadius: '8px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Your Unique Transaction Ref</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{txRef}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(txRef, 'Transaction Reference')}
                      style={{ background: '#fbbf24', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Copy Ref
                    </button>
                  </div>
                </div>

                {/* PROOF OF PAYMENT UPLOADER */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                    2. Upload Proof of Payment (Screenshot / Receipt)
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  {proofImage ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                      <img src={proofImage} alt="Receipt Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>✓ Receipt Screenshot Attached</span>
                        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>Ready to send to support</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProofImage(null)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        color: '#ccc',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
                      <span>Attach Payment Screenshot / Receipt</span>
                    </button>
                  )}
                </div>

                {/* PRIMARY ACTION: SEND VIA WHATSAPP */}
                <button
                  type="button"
                  onClick={handleBankTransferWithWhatsApp}
                  disabled={processing}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(34,197,94,0.3)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84-1.56 1.56-3.64 2.4-5.82 2.4-1.46 0-2.88-.38-4.14-1.11l-.3-.18-3.07.81.82-2.99-.19-.31A8.2 8.2 0 013.8 11.91c0-4.54 3.7-8.24 8.25-8.24m4.53 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.12.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z"/>
                  </svg>
                  <span>{processing ? 'Processing...' : 'Send Receipt to WhatsApp'}</span>
                </button>

                {/* SECONDARY ACTION: DIRECT SUBMIT */}
                <button
                  type="button"
                  onClick={handleBankTransferDirectSubmit}
                  disabled={processing}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#aaa',
                    padding: '10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Or Submit Receipt to Admin Dashboard Directly
                </button>
              </div>
            )}

            {/* CHANNEL 2: PAYSTACK ONLINE GATEWAY */}
            {activeChannel === 'paystack' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#06b6d4', fontWeight: 700, marginBottom: '4px' }}>
                    ⚡ Instant Automatic Coin Credit
                  </div>
                  <p style={{ fontSize: '12px', color: '#ccc', margin: 0, lineHeight: 1.4 }}>
                    Pay securely using your Debit Card, USSD, Apple Pay, or Bank Transfer via Paystack. Your payment is credited after admin verification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePaystackPayment}
                  disabled={processing}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '15px',
                    boxShadow: '0 6px 20px rgba(6,182,212,0.3)'
                  }}
                >
                  {processing ? 'Launching Paystack...' : `Pay ${storeSettings.currencySymbol === '₦' ? `₦${selectedItem.priceNgn.toLocaleString()}` : `$${selectedItem.price}`} with Paystack`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
