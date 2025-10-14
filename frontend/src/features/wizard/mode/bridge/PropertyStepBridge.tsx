'use client';
/**
 * PropertyStepBridge: Renders the existing property search component.
 * After property verification, this stops rendering and ModernEngine takes over.
 */
import React, { useCallback } from 'react';
import PropertySearchWithTitlePoint from '@/components/PropertySearchWithTitlePoint';
import { useWizardStoreBridge } from './useWizardStoreBridge';

export default function PropertyStepBridge() {
  const { isPropertyVerified, set } = useWizardStoreBridge();

  // Handle property verification callback
  const handlePropertyVerified = useCallback((data: any) => {
    // Update the store with verified property data
    set({
      verifiedData: data,
      propertyVerified: true,
      apn: data.apn,
      county: data.county,
      property: {
        address: data.fullAddress || data.address,
        apn: data.apn,
        county: data.county,
        verified: true
      },
      // Prefill grantor from owner data if available
      grantorName: data.titlePoint?.owners?.[0]?.fullName || 
                   data.titlePoint?.owners?.[0]?.name || 
                   '',
    });
  }, [set]);

  // If property is already verified, don't render Step 1
  if (isPropertyVerified()) return null;

  return (
    <div className="p-4">
      <PropertySearchWithTitlePoint onVerified={handlePropertyVerified} />
    </div>
  );
}
