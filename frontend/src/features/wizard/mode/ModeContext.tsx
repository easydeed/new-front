import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * ✅ PHASE 24-C: MODERN WIZARD ONLY
 * 
 * ModeContext simplified to always return 'modern' mode.
 * Classic mode has been DELETED!
 * 
 * API kept compatible for existing code, but mode is always 'modern'.
 */

export type WizardMode = 'modern'; // Classic removed!

type ModeContextType = {
  mode: WizardMode;
  setMode: (m: WizardMode) => void; // No-op, kept for API compatibility
  storageKey: string;
  hydrated: boolean;
};

const ModeContext = createContext<ModeContextType | null>(null);

export function WizardModeProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Always 'modern' mode, always use modern storage key
  const value: ModeContextType = {
    mode: 'modern',
    setMode: () => { /* No-op - mode is always 'modern' */ },
    storageKey: 'deedWizardDraft_modern',
    hydrated
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useWizardMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
