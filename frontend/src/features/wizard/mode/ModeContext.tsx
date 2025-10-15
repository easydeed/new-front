'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage } from '@/shared/safe-storage/safeStorage'; // Phase15: safe storage wrapper
export type WizardMode = 'modern' | 'classic';
type Ctx = { mode: WizardMode; setMode: (m: WizardMode) => void; };
const WizardModeContext = createContext<Ctx | null>(null);

/**
 * Phase 15 Hydration Fix: Resolve initial mode WITHOUT accessing localStorage during SSR/hydration.
 * localStorage is only checked AFTER hydration in useEffect.
 */
function resolveInitialMode(): WizardMode {
  // Always return default during SSR and initial client render (prevents hydration mismatch)
  if (typeof window === 'undefined') return (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as WizardMode) || 'classic';
  
  // On client, check URL first (highest priority)
  const urlMode = new URLSearchParams(window.location.search).get('mode') as WizardMode | null;
  if (urlMode) return urlMode;
  
  // Fall back to env var (do NOT check localStorage yet - causes hydration mismatch)
  return (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as WizardMode) || 'classic';
}

export function WizardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WizardMode>(resolveInitialMode());
  const [hydrated, setHydrated] = useState(false);
  
  // After hydration, check localStorage and update mode if needed
  useEffect(() => {
    setHydrated(true);
    
    // Check if URL has explicit mode (highest priority)
    const urlMode = new URLSearchParams(window.location.search).get('mode') as WizardMode | null;
    if (urlMode) {
      setMode(urlMode);
      return;
    }
    
    // Otherwise, check localStorage
    const stored = safeStorage.get('wizard_mode') as WizardMode | null;
    if (stored) {
      setMode(stored);
    }
  }, []);
  
  // Save mode to localStorage when it changes (only after hydration)
  useEffect(() => {
    if (hydrated) {
      safeStorage.set('wizard_mode', mode);
    }
  }, [mode, hydrated]);
  
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <WizardModeContext.Provider value={value}>{children}</WizardModeContext.Provider>;
}

export function useWizardMode(): Ctx {
  const ctx = useContext(WizardModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
