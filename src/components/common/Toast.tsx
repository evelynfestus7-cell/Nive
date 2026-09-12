import React, { createContext, useContext, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ToastContextType {
  showToast: (text: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{
              background: t.type === 'error' ? 'rgba(239, 68, 68, 0.92)' :
                          t.type === 'success' ? 'rgba(34, 197, 94, 0.92)' :
                          'rgba(24, 24, 27, 0.95)',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '24px',
              fontSize: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'toastFadeIn 0.25s ease'
            }}
          >
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
