
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type WizardData = {
  formData?: any;
  verifiedData?: any;
  docType?: string;
};

const MODERN_KEY = 'deedWizardDraft_modern_v2';
const CLASSIC_KEY = 'deedWizardDraft';

function readLocal(key: string): WizardData {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(key: string, data: WizardData) {
  try {
    const current = readLocal(key);
    localStorage.setItem(key, JSON.stringify({ ...(current || {}), ...(data || {}), timestamp: new Date().toISOString() }));
  } catch {}
}

export function useWizardStoreBridge(mode: 'modern'|'classic') {
  const [hydrated, setHydrated] = useState(false);
  const key = mode === 'modern' ? MODERN_KEY : CLASSIC_KEY;

  useEffect(() => { setHydrated(true); }, []);

  const getWizardData = useCallback((): WizardData => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty');
      return {};
    }
    const data = readLocal(key);
    console.log('[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage:', data);
    return data || {};
  }, [hydrated, key]);

  const updateFormData = useCallback((partial: any) => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.updateFormData] NOT HYDRATED - blocked write');
      return;
    }
    const current = readLocal(key);
    const merged = { ...current, formData: { ...(current.formData || {}), ...(partial || {}) } };
    writeLocal(key, merged);
    console.log('[useWizardStoreBridge.updateFormData] Saved to localStorage');
  }, [hydrated, key]);

  const setVerified = useCallback((verified: any) => {
    if (!hydrated) return;
    const current = readLocal(key);
    writeLocal(key, { ...current, verifiedData: verified });
  }, [hydrated, key]);

  const isPropertyVerified = useCallback(() => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.isPropertyVerified] NOT HYDRATED - returning false');
      return false;
    }
    const wd = readLocal(key);
    const form = wd.formData || {};
    const v = wd.verifiedData || form.verifiedData || {};
    const result = !!(form.propertyVerified || v?.apn || v?.fullAddress);
    console.log('[useWizardStoreBridge.isPropertyVerified] Checking:', '\n  - wizardData:', wd, '\n  - formData:', form, '\n  - verifiedData:', v, '\n  - RESULT:', result);
    return result;
  }, [hydrated, key]);

  return useMemo(() => ({
    hydrated,
    getWizardData,
    updateFormData,
    setVerified,
    isPropertyVerified,
    storageKey: key
  }), [hydrated, getWizardData, updateFormData, setVerified, isPropertyVerified, key]);
}
