'use client';
/**
 * Bridge to your existing wizard store.
 * - Avoids localStorage on first render (SSR)
 * - Exposes `isHydrated` and gates branching on server
 *
 * TODO: Replace the mock with your *real* store import and mappings.
 */
import { useMemo } from 'react';
import { useHydrated } from '@/shared/hooks/useHydrated';
import { dbg } from './debugLogs';

function useMockWizardStore(){
  const _state = (typeof window!=='undefined' && (window as any).__WIZARD_STATE__) || {};
  const getWizardData = () => ({ formData: _state });
  const updateFormData = (patch:any) => { if (typeof window!=='undefined'){ (window as any).__WIZARD_STATE__ = { ..._state, ...patch }; } };
  const isPropertyVerified = () => !!_state?.property?.verified || !!_state?.propertyVerified || !!_state?.apn;
  return { getWizardData, updateFormData, isPropertyVerified };
}

export function useWizardStoreBridge(){
  const hydrated = useHydrated();
  // Swap to your real store here:
  // const store = useWizardStore();
  const store = useMockWizardStore();

  const api = useMemo(() => ({
    hydrated,
    get: () => {
      if (!hydrated) {
        dbg('getWizardData: not hydrated → empty');
        return { formData: {}, verifiedData: {}, docType: 'grant-deed' };
      }
      const data = store.getWizardData();
      dbg('getWizardData: hydrated →', data);
      return data;
    },
    set: (patch: any) => {
      if (!hydrated) { dbg('setWizardData blocked (not hydrated)'); return; }
      dbg('setWizardData:', patch);
      store.updateFormData(patch);
    },
    isPropertyVerified: () => {
      if (!hydrated) return false;
      try { return !!store.isPropertyVerified(); } catch { return false; }
    }
  }), [hydrated, store]);

  return api;
}
