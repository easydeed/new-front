import dynamic from 'next/dynamic';
import React from 'react';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';

const PropertySearchWithTitlePoint = dynamic(
  () => import('@/components/PropertySearchWithTitlePoint'),
  { ssr: false }
);

export default function PropertyStepBridge({ onVerified }: { onVerified: (v: any) => void }) {
  const { markVerified } = useWizardStoreBridge();
  
  const handleVerified = (data: any) => {
    // Transform SiteX field names to match ModernEngine expectations
    const transformedData = {
      ...data,
      // ModernEngine expects these field names:
      ownerPrimary: data.currentOwnerPrimary || data.ownerPrimary || '',
      ownerSecondary: data.currentOwnerSecondary || data.ownerSecondary || '',
      owners: data.owners || [],
    };
    
    console.log('[PropertyStepBridge] Transformed data for ModernEngine:', {
      ownerPrimary: transformedData.ownerPrimary,
      ownerSecondary: transformedData.ownerSecondary,
      owners: transformedData.owners
    });
    
    markVerified(transformedData);
    onVerified(transformedData);
  };
  
  return (
    <div className="modern-qna">
      <h1 className="modern-qna__title">Let's confirm the property</h1>
      <p className="modern-qna__why">We'll prefill APN, county, and owner if available.</p>
      <PropertySearchWithTitlePoint
        onVerified={handleVerified}
        googlePlacesOverrides={{ preferNewAPIs: true }}
      />
    </div>
  );
}

