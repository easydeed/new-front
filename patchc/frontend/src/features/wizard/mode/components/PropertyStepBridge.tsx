import dynamic from 'next/dynamic';
import React from 'react';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';

const PropertySearchWithTitlePoint = dynamic(
  () => import('@/components/PropertySearchWithTitlePoint'),
  { ssr: false }
);

export default function PropertyStepBridge({ onVerified }: { onVerified: (v: any) => void }) {
  const { markVerified } = useWizardStoreBridge();
  return (
    <div className="modern-qna">
      <h1 className="modern-qna__title">Let’s confirm the property</h1>
      <p className="modern-qna__why">We’ll prefill APN, county, and owner if available.</p>
      <PropertySearchWithTitlePoint
        onVerified={(data: any) => {
          markVerified(data);
          onVerified(data);
        }}
        googlePlacesOverrides={{ preferNewAPIs: true }}
      />
    </div>
  );
}
