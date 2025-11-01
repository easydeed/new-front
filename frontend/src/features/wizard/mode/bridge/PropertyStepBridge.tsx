'use client';
/**
 * PropertyStepBridge: Renders the existing property search component.
 * After property verification, this stops rendering and ModernEngine takes over.
 */
import React, { useCallback } from 'react';
import PropertySearchWithTitlePoint from '@/components/PropertySearchWithTitlePoint';
import { useWizardStoreBridge } from './useWizardStoreBridge';
// ✅ PHASE 24-C STEP 8: Telemetry for property search events
import { trackWizardEvent } from '@/lib/telemetry';

export default function PropertyStepBridge({ onVerified }: { onVerified?: () => void } = {}) {
  const { isPropertyVerified, updateFormData } = useWizardStoreBridge();

  // Handle property verification callback
  const handlePropertyVerified = useCallback((data: any) => {
    // ✅ PHASE 24-C STEP 8: Track property enrichment with SiteX data
    trackWizardEvent('Wizard.PropertyEnriched', { 
      address: data.fullAddress || data.address,
      apn: data.apn,
      county: data.county,
      hasLegal: Boolean(data.legalDescription)
    });

    // Update the store with verified property data + SiteX enrichment
    const storeUpdate = {
      verifiedData: data,
      propertyVerified: true,
      apn: data.apn,
      county: data.county,
      propertyAddress: data.fullAddress || data.address,  // FIXED: Add flat propertyAddress field
      fullAddress: data.fullAddress || data.address,      // FIXED: Add fullAddress alias
      property: {
        address: data.fullAddress || data.address,
        apn: data.apn,
        county: data.county,
        verified: true
      },
      // ✅ PHASE 15 v5 FIX: Prefill ALL critical fields from SiteX data
      // Legal description (required for PDF generation)
      legalDescription: data.legalDescription || '',
      // Grantor name from primary owner (required for PDF generation)
      grantorName: data.currentOwnerPrimary || 
                   data.titlePoint?.owners?.[0]?.fullName || 
                   data.titlePoint?.owners?.[0]?.name || 
                   '',
      // Vesting details (improves deed accuracy)
      vesting: data.titlePoint?.vestingDetails || '',
      // Store additional context for future use
      currentOwnerPrimary: data.currentOwnerPrimary || '',
      currentOwnerSecondary: data.currentOwnerSecondary || '',
      propertyType: data.propertyType || '',
      lastSaleDate: data.titlePoint?.lastSaleDate || '',
      lastSalePrice: data.titlePoint?.lastSalePrice || ''
    };
    
    updateFormData(storeUpdate);
    
    // PATCH 6-C FIX: Call parent callback to trigger WizardHost re-render
    if (onVerified) {
      onVerified();
    }
  }, [updateFormData, onVerified]);

  // If property is already verified, don't render Step 1
  if (isPropertyVerified()) return null;

  return (
    <div className="p-4">
      <PropertySearchWithTitlePoint onVerified={handlePropertyVerified} />
    </div>
  );
}
