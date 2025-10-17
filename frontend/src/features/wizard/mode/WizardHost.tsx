'use client';
import React from 'react';
import { WizardModeProvider, useWizardMode } from './ModeContext';
import WizardModeBoundary from './WizardModeBoundary';
import ModernEngine from './engines/ModernEngine';
import ClassicEngine from './engines/ClassicEngine';
import PropertyStepBridge from './bridge/PropertyStepBridge';
import { useWizardStoreBridge } from './bridge/useWizardStoreBridge';
// [Phase15] hydration gate
import HydrationGate from './HydrationGate';
// [v4.1] layout unification
import WizardFrame from './layout/WizardFrame';

/**
 * Orchestrates:
 *   Step 1 (Property search via PropertyStepBridge) → Modern Q&A or Classic
 *   - We never modify your Step 1; we render it intact first if property isn't verified.
 */
function Inner({ docType, classic }: { docType: string; classic: React.ReactNode }){
  const { mode } = useWizardMode();
  const { isPropertyVerified } = useWizardStoreBridge();
  const [forceRender, setForceRender] = React.useState(0);
  
  // DEBUG: Log mode and verification status
  console.log('[WizardHost] Mode:', mode, 'PropertyVerified:', isPropertyVerified(), 'ForceRender:', forceRender);

  if (mode === 'modern') {
    // Hybrid: run Step 1 first if needed
    if (!isPropertyVerified()) {
      console.log('[WizardHost] Rendering PropertyStepBridge (property not verified)');
      return (
        <WizardFrame docType={docType} heading="Create Deed">
          <PropertyStepBridge onVerified={() => {
            console.log('[WizardHost] Property verified! Triggering re-render...');
            setForceRender(prev => prev + 1);
          }} />
        </WizardFrame>
      );
    }
    console.log('[WizardHost] Rendering ModernEngine (property verified)');
    return (
      <WizardModeBoundary fallback={<ClassicEngine>{classic}</ClassicEngine>}>
        <WizardFrame docType={docType} heading="Create Deed">
          <ModernEngine docType={docType} />
        </WizardFrame>
      </WizardModeBoundary>
    );
  }

  // Classic (your existing tree) - also wrapped for consistent header/toggle
  console.log('[WizardHost] Rendering ClassicEngine (mode:', mode, ')');
  return (
    <WizardFrame docType={docType} heading="Create Deed">
      <ClassicEngine>{classic}</ClassicEngine>
    </WizardFrame>
  );
}

export default function WizardHost(props: { docType: string; classic: React.ReactNode; }){
  return (
    <WizardModeProvider>
      <HydrationGate>
        <Inner {...props} />
      </HydrationGate>
    </WizardModeProvider>
  );
}
