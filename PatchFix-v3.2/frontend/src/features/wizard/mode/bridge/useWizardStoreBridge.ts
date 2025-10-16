
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWizardMode } from '../ModeContext';

type WizardData = {
  formData?: any;
  verifiedData?: any;
  docType?: string;
  timestamp?: string;
};

const KEY_CLASSIC = 'deedWizardDraft_classic';
const KEY_MODERN  = 'deedWizardDraft_modern';

export default function useWizardStoreBridge() {
  const { mode, hydrated } = useWizardMode();
  const [tick, setTick] = useState(0);
  const keyRef = useRef(mode === 'modern' ? KEY_MODERN : KEY_CLASSIC);

  useEffect(() => {
    keyRef.current = (mode === 'modern' ? KEY_MODERN : KEY_CLASSIC);
    // Do not migrate values to avoid hydration mismatch; keep modes isolated
  }, [mode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyRef.current) setTick(t => t + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getWizardData = useCallback<() => WizardData>(() => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty');
      return {};
    }
    try {
      const raw = localStorage.getItem(keyRef.current);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      console.log('[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage:', parsed);
      return parsed || {};
    } catch {
      return {};
    }
  }, [hydrated, tick]);

  const updateFormData = useCallback((patch: any) => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.updateFormData] NOT HYDRATED - blocked write');
      return;
    }
    const current = getWizardData();
    const merged = {
      ...current,
      formData: { ...(current.formData || {}), ...(patch || {}) },
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(merged));
      console.log('[useWizardStoreBridge.updateFormData] Saved to localStorage');
      setTick(t => t + 1);
    } catch {}
  }, [hydrated, getWizardData]);

  const isPropertyVerified = useCallback(() => {
    if (!hydrated) {
      console.log('[useWizardStoreBridge.isPropertyVerified] NOT HYDRATED - returning false');
      return false;
    }
    const data = getWizardData();
    const fd = data.formData || {};
    const verified = (fd.propertyVerified === true) || !!fd.apn || !!(fd.property && fd.property.address);
    console.log('[useWizardStoreBridge.isPropertyVerified] Checking:', '\n  - wizardData:', data, '\n  - formData:', fd, '\n  - RESULT:', verified);
    return verified;
  }, [hydrated, getWizardData]);

  return { getWizardData, updateFormData, isPropertyVerified };
}
