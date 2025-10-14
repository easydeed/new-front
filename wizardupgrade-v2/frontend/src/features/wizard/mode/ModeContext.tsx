'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
export type WizardMode = 'modern' | 'classic';
type Ctx = { mode: WizardMode; setMode: (m: WizardMode) => void; };
const WizardModeContext = createContext<Ctx | null>(null);

function resolveInitial(): WizardMode {
  if (typeof window === 'undefined') return (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as WizardMode) || 'classic';
  const urlMode = new URLSearchParams(window.location.search).get('mode') as WizardMode | null;
  const stored = localStorage.getItem('wizard_mode') as WizardMode | null;
  return urlMode || stored || (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as WizardMode) || 'classic';
}

export function WizardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WizardMode>(resolveInitial());
  useEffect(() => { localStorage.setItem('wizard_mode', mode); }, [mode]);
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <WizardModeContext.Provider value={value}>{children}</WizardModeContext.Provider>;
}

export function useWizardMode(): Ctx {
  const ctx = useContext(WizardModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
