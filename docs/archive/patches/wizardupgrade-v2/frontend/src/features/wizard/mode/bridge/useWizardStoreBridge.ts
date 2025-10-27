'use client';
// Bridge that reads/writes to your EXISTING wizard store.
// Edit the import below to match your project.
import { useMemo } from 'react';

// TODO: Replace with your actual store import (examples):
// import { useWizardStore } from '@/features/wizard/state/useWizardStore';
// import { useWizardStore } from '@/stores/wizardStore';
function useMockWizardStore(){
  // Fallback mock; replace with your store's get/set
  const _state = (typeof window!=='undefined' && (window as any).__WIZARD_STATE__) || {};
  const getWizardData = () => ({ formData: _state });
  const updateFormData = (patch:any) => { if (typeof window!=='undefined'){ (window as any).__WIZARD_STATE__ = { ..._state, ...patch }; } };
  const isPropertyVerified = () => !!_state?.property?.verified || !!_state?.propertyVerified || !!_state?.apn;
  return { getWizardData, updateFormData, isPropertyVerified };
}

export function useWizardStoreBridge(){
  // Swap the impl here to use your real store.
  // const store = useWizardStore();
  const store = useMockWizardStore();

  return useMemo(()=>({
    get: store.getWizardData,
    set: store.updateFormData,
    isPropertyVerified: store.isPropertyVerified
  }), [store]);
}
