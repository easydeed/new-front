
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WizardMode = 'classic' | 'modern';

type Ctx = {
  mode: WizardMode;
  setMode: (m: WizardMode) => void;
  hydrated: boolean;
};

const ModeContext = createContext<Ctx | null>(null);

function resolveInitialMode(): WizardMode {
  if (typeof window === 'undefined') return 'classic';
  const url = new URL(window.location.href);
  const urlMode = url.searchParams.get('mode') as WizardMode | null;
  if (urlMode === 'modern' || urlMode === 'classic') return urlMode;
  const envDefault = process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT === 'modern' ? 'modern' : 'classic';
  return envDefault;
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

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem('wizard_mode', mode); } catch {}
    // keep URL param in sync without navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    }
  }, [mode, hydrated]);

  const value = useMemo(() => ({ mode, setMode, hydrated }), [mode, hydrated]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useWizardMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
