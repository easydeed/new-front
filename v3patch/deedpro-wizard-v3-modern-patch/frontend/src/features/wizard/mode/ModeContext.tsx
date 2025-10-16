
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type WizardMode = 'classic' | 'modern';
type Ctx = {
  mode: WizardMode;
  setMode: (m: WizardMode) => void;
  hydrated: boolean;
};

const ModeContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'wizard_mode';

function getInitialMode(defaultMode: WizardMode, initialFromUrl?: string | null): WizardMode {
  if (typeof window === 'undefined') return defaultMode;
  if (initialFromUrl === 'modern' || initialFromUrl === 'classic') return initialFromUrl as WizardMode;
  // Do not read localStorage during SSR/hydration path; return default
  return defaultMode;
}

export function WizardModeProvider({ children, initialMode }: { children: React.ReactNode; initialMode?: string | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultMode: WizardMode = (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT === 'modern' ? 'modern' : 'classic');
  const urlMode = (initialMode ?? (searchParams as any)?.get?.('mode')) as string | null;

  const [hydrated, setHydrated] = useState(false);
  const [mode, setModeState] = useState<WizardMode>(getInitialMode(defaultMode, urlMode));

  // Hydration gate then adopt stored preference
  useEffect(() => {
    setHydrated(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!urlMode && stored && (stored === 'modern' || stored === 'classic')) {
        setModeState(stored as WizardMode);
      }
    } catch {}
  }, [urlMode]);

  const setMode = useCallback((m: WizardMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
    // push mode into URL (keeps docType path)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', m);
      router.push(url.pathname + '?' + url.searchParams.toString());
    }
  }, [router]);

  const value = useMemo(() => ({ mode, setMode, hydrated }), [mode, setMode, hydrated]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useWizardMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useWizardMode must be used within WizardModeProvider');
  return ctx;
}
