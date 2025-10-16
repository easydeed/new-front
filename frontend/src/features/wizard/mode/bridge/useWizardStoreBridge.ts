'use client';
/**
 * Phase 15 Hydration Hardening:
 * Bridge to existing Zustand wizard store + localStorage
 * - Exposes `hydrated` status for conditional rendering
 * - Uses isolated storage keys for Modern vs. Classic
 * - All storage access is gated by hydration status
 */
import { useMemo, useCallback } from 'react';
import { useWizardStore } from '@/store';
import { useHydrated } from '@/shared/hooks/useHydrated';
import { safeStorage } from '@/shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_MODERN } from './persistenceKeys';

export function useWizardStoreBridge(){
  const { data, setData } = useWizardStore();
  const hydrated = useHydrated();
  
  const getWizardData = useCallback(() => {
    // CRITICAL: Return empty state before hydration
    if (!hydrated) {
      console.log('[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty');
      return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    }
    
    // After hydration, read from localStorage (Modern mode key)
    try {
      const stored = safeStorage.get(WIZARD_DRAFT_KEY_MODERN);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage:', parsed);
        return { 
          formData: parsed.grantDeed || parsed.formData || {} ,
          verifiedData: parsed.verifiedData || {},
          docType: parsed.docType || 'grant_deed'
        };
      }
    } catch (error) {
      console.error('[useWizardStoreBridge.getWizardData] Error loading from localStorage:', error);
    }
    
    // Fallback to Zustand store
    console.log('[useWizardStoreBridge.getWizardData] HYDRATED - using Zustand store:', data);
    return { formData: data || {} };
  }, [data, hydrated]);
  
  const updateFormData = useCallback((patch: any) => {
    // Block writes before hydration
    if (!hydrated) {
      console.log('[useWizardStoreBridge.updateFormData] NOT HYDRATED - blocked write');
      return;
    }
    
    console.log('[useWizardStoreBridge.updateFormData] Updating:', patch);
    
    // Update Zustand store
    Object.keys(patch).forEach(key => {
      setData(key, patch[key]);
    });
    
    // Update localStorage for persistence (Modern mode key)
    try {
      const current = getWizardData();
      const updated = {
        ...current,
        formData: { ...current.formData, ...patch },
        grantDeed: { ...current.formData, ...patch },
        timestamp: new Date().toISOString()
      };
      safeStorage.set(WIZARD_DRAFT_KEY_MODERN, JSON.stringify(updated));
      console.log('[useWizardStoreBridge.updateFormData] Saved to localStorage');
    } catch (error) {
      console.error('[useWizardStoreBridge.updateFormData] Error saving to localStorage:', error);
    }
  }, [setData, getWizardData, hydrated]);
  
  const isPropertyVerified = useCallback(() => {
    // CRITICAL: Always return false before hydration
    // This prevents PropertyStepBridge → ModernEngine switch during hydration
    if (!hydrated) {
      console.log('[useWizardStoreBridge.isPropertyVerified] NOT HYDRATED - returning false');
      return false;
    }
    
    const wizardData = getWizardData();
    const formData = wizardData.formData || {};
    const verifiedData = wizardData.verifiedData || {};
    
    console.log('[useWizardStoreBridge.isPropertyVerified] Checking:');
    console.log('  - wizardData:', wizardData);
    console.log('  - formData:', formData);
    console.log('  - verifiedData:', verifiedData);
    
    // PATCH4a-FIX: Check if property data is fresh (< 1 hour old)
    // This prevents using stale property data from previous sessions
    const timestamp = wizardData.timestamp;
    if (timestamp) {
      const age = Date.now() - new Date(timestamp).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (age > ONE_HOUR) {
        console.log('  - Property data is stale (> 1 hour old), forcing re-verification');
        return false;
      }
    }
    
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
    hydrated, // Expose hydration status
    getWizardData,  // ✅ FIXED: Use correct property name
    updateFormData, // ✅ FIXED: Use correct property name
    isPropertyVerified
  }), [hydrated, getWizardData, updateFormData, isPropertyVerified]);
}
