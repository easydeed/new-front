'use client';
import React from 'react';
import { WizardModeProvider } from './ModeContext';
import WizardModeBoundary from './WizardModeBoundary';
import ModernEngine from './engines/ModernEngine';
import PropertyStepBridge from './bridge/PropertyStepBridge';
import { useWizardStoreBridge } from './bridge/useWizardStoreBridge';
// [Phase15] hydration gate
import HydrationGate from './HydrationGate';
// [v4.1] layout unification
import WizardFrame from './layout/WizardFrame';

/**
 * ✅ PHASE 24-C: MODERN WIZARD ONLY
 * 
 * Orchestrates the Modern Wizard flow:
 *   Step 1: Property search (PropertyStepBridge) → Modern Q&A (ModernEngine)
 *   
 * Classic Wizard has been DELETED - Modern only!
 */
function Inner({ docType }: { docType: string }){
  const { isPropertyVerified } = useWizardStoreBridge();
  const [forceRender, setForceRender] = React.useState(0);

  // Step 1: Property search (if not verified)
  if (!isPropertyVerified()) {
    return (
      <WizardFrame docType={docType} heading="Create Deed">
        <PropertyStepBridge onVerified={() => {
          setForceRender(prev => prev + 1);
        }} />
      </WizardFrame>
    );
  }

  // Step 2+: Modern Q&A flow
  return (
    <WizardModeBoundary fallback={<div>Loading...</div>}>
      <WizardFrame docType={docType} heading="Create Deed">
        <ModernEngine docType={docType} />
      </WizardFrame>
    </WizardModeBoundary>
  );
}

export default function WizardHost(props: { docType: string }){
  return (
    <WizardModeProvider>
      <HydrationGate>
        <Inner {...props} />
      </HydrationGate>
    </WizardModeProvider>
  );
}
