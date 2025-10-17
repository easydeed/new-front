import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WizardMode = 'classic' | 'modern';

type ModeContextType = {
  mode: WizardMode;
  setMode: (m: WizardMode) => void;
  storageKey: string;
  hydrated: boolean;
};

const ModeContext = createContext<ModeContextType | null>(null);

function resolveInitialMode(): WizardMode {
  if (typeof window === 'undefined') return 'classic';
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  if (urlMode === 'modern' || urlMode === 'classic') return urlMode as WizardMode;
  return (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as WizardMode) || 'classic';
}

export function WizardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WizardMode>(resolveInitialMode());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = localStorage.getItem('wizard_mode');
      if (stored === 'modern' || stored === 'classic') setMode(stored as WizardMode);
    } catch {}
  }, []);

  const storageKey = mode === 'modern' ? 'deedWizardDraft_modern' : 'deedWizardDraft_classic';

  const value = useMemo(
    () => ({ mode, setMode, storageKey, hydrated }),
    [mode, storageKey, hydrated]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useWizardMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
