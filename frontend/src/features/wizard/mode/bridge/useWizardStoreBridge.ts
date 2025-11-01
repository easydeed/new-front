import { useCallback } from 'react';
import { useWizardMode } from '../ModeContext';

/**
 * A minimal, hydration-safe bridge around localStorage for wizard state.
 * We only read after hydration via ModeContext.hydrated gating.
 * NOTE: The actual hydration flag is handled in ModeContext consumer (ModernEngine),
 * which calls these only after hydration. This small wrapper keeps a single code path.
 */
export function useWizardStoreBridge() {
  const { storageKey, hydrated } = useWizardMode();

  const getWizardData = useCallback(() => {
    if (!hydrated) {
      return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
      const parsed = JSON.parse(raw);
      return parsed || { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    } catch {
      return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    }
  }, [hydrated, storageKey]);

  const updateFormData = useCallback((patch: Record<string, any>) => {
    if (!hydrated) {
      return;
    }
    try {
      const current = getWizardData();
      const merged = {
        ...current,
        formData: { ...(current.formData || {}), ...patch },
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('wizard:formDataUpdated', { detail: merged }));
    } catch (e) {
      console.warn('Failed to update formData', e);
    }
  }, [hydrated, getWizardData, storageKey]);

  const markVerified = useCallback((verifiedData: Record<string, any>) => {
    if (!hydrated) return;
    try {
      const current = getWizardData();
      const merged = {
        ...current,
        verifiedData: { ...(current.verifiedData || {}), ...verifiedData },
        formData: { ...(current.formData || {}), propertyVerified: true },
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch {}
  }, [hydrated, getWizardData, storageKey]);

  const isPropertyVerified = useCallback(() => {
    if (!hydrated) {
      return false;
    }
    const { formData = {}, verifiedData = {} } = getWizardData();
    const result = !!(formData.propertyVerified || verifiedData.apn || verifiedData.fullAddress);
    return result;
  }, [hydrated, getWizardData]);

  return { hydrated, getWizardData, updateFormData, markVerified, isPropertyVerified };
}
