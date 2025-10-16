'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type WizardData = {
  formData: any;
  verifiedData?: any;
  docType?: string;
  timestamp?: string;
};

const KEY_CLASSIC = 'deedWizardDraft_classic';
const KEY_MODERN  = 'deedWizardDraft_modern';

function safeParse(json: string | null) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}

/**
 * Bridge around localStorage/Zustand to keep Modern and Classic drafts isolated
 * and to avoid hydration mismatches.
 */
export function useWizardStoreBridge(mode: 'modern'|'classic' = 'modern') {
  const hydrated = useHydrated();
  const key = mode === 'modern' ? KEY_MODERN : KEY_CLASSIC;
  const last = useRef<WizardData | null>(null);

  const getWizardData = useCallback((): WizardData => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty');
      return { formData: {} };
    }
    const raw = localStorage.getItem(key);
    const parsed = safeParse(raw) || { formData: {} };
    last.current = parsed;
    console.log('[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage:', parsed);
    return parsed;
  }, [hydrated, key]);

  const updateFormData = useCallback((patch: any) => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.updateFormData] NOT HYDRATED - blocked write');
      return;
    }
    const current = last.current ?? getWizardData();
    const next: WizardData = {
      ...current,
      formData: { ...(current?.formData || {}), ...patch },
      timestamp: new Date().toISOString(),
    };
    last.current = next;
    localStorage.setItem(key, JSON.stringify(next));
    console.log('[useWizardStoreBridge.updateFormData] Saved to localStorage');
  }, [hydrated, key, getWizardData]);

  const setVerifiedData = useCallback((verifiedData: any) => {
    if (!hydrated) return;
    const current = last.current ?? getWizardData();
    const next: WizardData = {
      ...current,
      verifiedData: verifiedData,
      timestamp: new Date().toISOString(),
    };
    last.current = next;
    localStorage.setItem(key, JSON.stringify(next));
  }, [hydrated, key, getWizardData]);

  const clearDraft = useCallback(() => {
    if (!hydrated) return;
    localStorage.removeItem(key);
  }, [hydrated, key]);

  const isPropertyVerified = useCallback(() => {
    const data = getWizardData();
    const fd = data.formData || {};
    const vd = data.verifiedData || {};
    const result = !!(fd.propertyVerified || vd.apn || vd.fullAddress);
    console.log('[useWizardStoreBridge.isPropertyVerified] Checking:', { data, result });
    return result;
  }, [getWizardData]);

  const ownerCandidates = useCallback((): string[] => {
    const data = getWizardData();
    const owners = data.verifiedData?.owners || [];
    if (!Array.isArray(owners)) return [];
    const names = owners.map((o: any) => o?.fullName || o?.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [getWizardData]);

  return {
    hydrated,
    getWizardData,
    updateFormData,
    setVerifiedData,
    clearDraft,
    isPropertyVerified,
    ownerCandidates,
  };
}
