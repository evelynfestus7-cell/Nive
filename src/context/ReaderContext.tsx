import React, { createContext, useContext, useEffect, useState } from 'react';
import { ReaderSettings } from '../types';

const SETTINGS_KEY = 'nive_reader_settings';

const defaultSettings: ReaderSettings = {
  theme: 'dark',
  fontSize: 18,
  lineSpacing: 1.8,
  fontFamily: 'serif',
  brightness: 100,
  mode: 'scroll'
};

interface ReaderContextType {
  settings: ReaderSettings;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Automatically sync theme class to document.body and document.documentElement globally
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-sepia');
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-sepia');

    if (settings.theme === 'light') {
      document.body.classList.add('theme-light');
      document.documentElement.classList.add('theme-light');
    } else if (settings.theme === 'sepia') {
      document.body.classList.add('theme-sepia');
      document.documentElement.classList.add('theme-sepia');
    } else {
      document.body.classList.add('theme-dark');
      document.documentElement.classList.add('theme-dark');
    }
  }, [settings.theme]);

  const updateSettings = (partial: Partial<ReaderSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  };

  return (
    <ReaderContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) throw new Error('useReader must be used within a ReaderProvider');
  return context;
};
