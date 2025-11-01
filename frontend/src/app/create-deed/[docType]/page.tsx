"use client";

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WizardHost from '../../../features/wizard/mode/WizardHost';
import { safeStorage } from '../../../shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from '../../../features/wizard/mode/bridge/persistenceKeys';
import { canonicalFromUrlParam } from '../../../features/wizard/mode/utils/docType';
import { PartnersProvider } from '../../../features/partners/PartnersContext';

/**
 * ✅ PHASE 24-C: MODERN WIZARD ONLY!
 * 
 * Entry point for the Modern Deed Wizard.
 * Classic Wizard has been DELETED - Modern only!
 * 
 * Flow: Property Search → Modern Q&A → SmartReview → PDF Generation
 * 
 * Supported Deed Types (all use Modern Wizard):
 * - grant_deed
 * - quitclaim  
 * - interspousal_transfer
 * - warranty_deed
 * - tax_deed
 */
export default function UnifiedWizard() {
  const params = useParams();
  const router = useRouter();
  
  // [v4.2] URL param → canonical docType (e.g., 'quitclaim-deed' → 'quitclaim')
  const docType = canonicalFromUrlParam(params?.docType as string);

  // PATCH4a-FIX: Clear localStorage if ?fresh=true URL param is present
  // Usage: /create-deed/grant-deed?fresh=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('fresh') === 'true') {
        console.log('[UnifiedWizard] Fresh start requested - clearing localStorage');
        safeStorage.remove(WIZARD_DRAFT_KEY_MODERN);
        safeStorage.remove(WIZARD_DRAFT_KEY_CLASSIC);
        sessionStorage.removeItem('deedWizardCleared');
        // Remove ?fresh=true from URL to prevent clearing on refresh
        urlParams.delete('fresh');
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        router.replace(newUrl);
      } else {
        // Clear flag after initial page load
        const hasCleared = sessionStorage.getItem('deedWizardCleared');
        if (hasCleared) {
          console.log('[UnifiedWizard] Initial wizard load complete - clearing session flag');
          sessionStorage.removeItem('deedWizardCleared');
        }
      }
    }
  }, [router]);

  // ✅ PHASE 24-C: Modern Wizard ONLY! Classic prop removed
  return (
    <PartnersProvider>
      <WizardHost docType={docType} />
    </PartnersProvider>
  );
}
