'use client';
/**
 * Bridge that connects Modern Wizard to the existing Zustand store + localStorage.
 * This ensures single source of truth and state persistence.
 */
import { useMemo, useCallback } from 'react';
import { useWizardStore } from '@/store';

export function useWizardStoreBridge(){
  const { data, setData } = useWizardStore();
  
  const getWizardData = useCallback(() => {
    // Try localStorage first (for persistence)
    try {
      const stored = localStorage.getItem('deedWizardDraft');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { 
          formData: parsed.grantDeed || parsed.formData || {} ,
          verifiedData: parsed.verifiedData || {},
          docType: parsed.docType || 'grant_deed'
        };
      }
    } catch (error) {
      console.error('Error loading wizard data:', error);
    }
    
    // Fallback to Zustand store
    return { formData: data || {} };
  }, [data]);
  
  const updateFormData = useCallback((patch: any) => {
    // Update Zustand store
    Object.keys(patch).forEach(key => {
      setData(key, patch[key]);
    });
    
    // Update localStorage for persistence
    try {
      const current = getWizardData();
      const updated = {
        ...current,
        formData: { ...current.formData, ...patch },
        grantDeed: { ...current.formData, ...patch },
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('deedWizardDraft', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving wizard data:', error);
    }
  }, [setData, getWizardData]);
  
  const isPropertyVerified = useCallback(() => {
    const wizardData = getWizardData();
    const formData = wizardData.formData || {};
    const verifiedData = wizardData.verifiedData || {};
    
    // Check multiple possible property verification indicators
    return !!(
      verifiedData?.apn || 
      formData?.property?.apn || 
      formData?.apn ||
      verifiedData?.propertyVerified ||
      formData?.propertyVerified
    );
  }, [getWizardData]);

  return useMemo(() => ({
    get: getWizardData,
    set: updateFormData,
    isPropertyVerified
  }), [getWizardData, updateFormData, isPropertyVerified]);
}
