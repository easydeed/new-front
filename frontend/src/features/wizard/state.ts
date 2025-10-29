// Simple wizard state management - integrates with existing React state
import { Step2RequestDetails, Step3DeclarationsTax, Step4PartiesProperty, ExtendedWizardState } from './types';
import { WIZARD_DRAFT_KEY_CLASSIC } from './mode/bridge/persistenceKeys';

// ✅ PHASE 19 SENIOR DEBUG FIX: Use correct storage key for Classic Wizard
// Previously: used 'deedWizardDraft' (Modern key) everywhere
// Now: use WIZARD_DRAFT_KEY_CLASSIC consistently

// Hook for wizard state management that extends the existing pattern
export const useWizardStore = () => {
  // This will integrate with the existing formData state in create-deed/page.tsx
  // For now, we'll create a simple structure that can be integrated
  
  const getStoredData = (): Partial<ExtendedWizardState> => {
    try {
      const stored = localStorage.getItem(WIZARD_DRAFT_KEY_CLASSIC);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const updateStoredData = (data: Partial<ExtendedWizardState>) => {
    try {
      const current = getStoredData();
      const updated = { ...current, ...data, timestamp: new Date().toISOString() };
      localStorage.setItem(WIZARD_DRAFT_KEY_CLASSIC, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const setStep2 = (data: Partial<Step2RequestDetails>) => {
    const current = getStoredData();
    updateStoredData({
      ...current,
      grantDeed: {
        ...current.grantDeed,
        step2: { ...current.grantDeed?.step2, ...data }
      }
    });
  };

  const setStep3 = (data: Partial<Step3DeclarationsTax>) => {
    const current = getStoredData();
    updateStoredData({
      ...current,
      grantDeed: {
        ...current.grantDeed,
        step3: { ...current.grantDeed?.step3, ...data }
      }
    });
  };

  const setStep4 = (data: Partial<Step4PartiesProperty>) => {
    const current = getStoredData();
    updateStoredData({
      ...current,
      grantDeed: {
        ...current.grantDeed,
        step4: { ...current.grantDeed?.step4, ...data }
      }
    });
  };

  const goToStep = (step: number) => {
    const current = getStoredData();
    updateStoredData({
      ...current,
      currentStep: step
    });
    
    // This would integrate with the existing navigation
    // For now, we'll just store the intent
  };

  const getWizardData = () => getStoredData();

  return {
    setStep2,
    setStep3,
    setStep4,
    goToStep,
    getWizardData
  };
};

// Helper functions to extract data for the components
// ✅ PHASE 19 SENIOR DEBUG FIX: Use correct storage key
export const getStep1Data = () => {
  const data = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY_CLASSIC) || '{}');
  return {
    apn: data.formData?.apn || data.verifiedData?.apn,
    county: data.formData?.county || data.verifiedData?.county,
    piqAddress: data.verifiedData?.piqAddress,
    titlePoint: data.verifiedData?.titlePoint
  };
};

export const getGrantDeedData = () => {
  const data = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY_CLASSIC) || '{}');
  return data.grantDeed || {};
};
