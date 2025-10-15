'use client';
/**
 * Bridge that connects Modern Wizard to the existing Zustand store + localStorage.
 * This ensures single source of truth and state persistence.
 */
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useWizardStore } from '@/store';

export function useWizardStoreBridge(){
  const { data, setData } = useWizardStore();
  const [hydrated, setHydrated] = useState(false);
  
  // Only access localStorage after hydration to prevent SSR mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  const getWizardData = useCallback(() => {
    // During SSR or before hydration, return empty state
    if (!hydrated) {
      return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    }
    
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
  }, [data, hydrated]);
  
  const updateFormData = useCallback((patch: any) => {
    // Update Zustand store
    Object.keys(patch).forEach(key => {
      setData(key, patch[key]);
    });
    
    // Update localStorage for persistence (only after hydration)
    if (hydrated) {
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
    }
  }, [setData, getWizardData, hydrated]);
  
  const isPropertyVerified = useCallback(() => {
    // CRITICAL FIX: Don't check localStorage before hydration!
    // This prevents hydration mismatch when switching from false → true
    if (!hydrated) {
      console.log('[useWizardStoreBridge] NOT HYDRATED - property verification: false');
      return false; // Always return false before hydration
    }
    
    const wizardData = getWizardData();
    const formData = wizardData.formData || {};
    const verifiedData = wizardData.verifiedData || {};
    
    console.log('[useWizardStoreBridge] Checking property verification:');
    console.log('  - wizardData:', wizardData);
    console.log('  - formData:', formData);
    console.log('  - verifiedData:', verifiedData);
    console.log('  - formData.apn:', formData.apn);
    console.log('  - formData.propertyVerified:', formData.propertyVerified);
    
    // Check multiple possible property verification indicators
    const isVerified = !!(
      verifiedData?.apn || 
      formData?.property?.apn || 
      formData?.apn ||
      verifiedData?.propertyVerified ||
      formData?.propertyVerified
    );
    
    console.log('  - RESULT:', isVerified);
    return isVerified;
  }, [hydrated, getWizardData]);

  return useMemo(() => ({
    get: getWizardData,
    set: updateFormData,
    isPropertyVerified
  }), [getWizardData, updateFormData, isPropertyVerified]);
}
