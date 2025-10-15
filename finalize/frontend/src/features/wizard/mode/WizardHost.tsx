'use client';
import React from 'react';
import { WizardModeProvider, useWizardMode } from './ModeContext';
import WizardModeBoundary from './WizardModeBoundary';
import ModernEngine from './engines/ModernEngine';
import ClassicEngine from './engines/ClassicEngine';
import PropertyStepBridge from './bridge/PropertyStepBridge';
import { useWizardStoreBridge } from './bridge/useWizardStoreBridge';
import HydrationGate from './HydrationGate';
import WizardFrame from './layout/WizardFrame';

/**
 * Orchestrates:
 *   Step 1 (Property) → Modern Q&A or Classic
 */
function Inner({ docType, classic }: { docType: string; classic: React.ReactNode }){
  const { mode } = useWizardMode();
  const { isPropertyVerified } = useWizardStoreBridge();

  if (mode === 'modern') {
    if (!isPropertyVerified()) {
      return (
        <WizardFrame docType={docType} heading="Create Deed">
          <PropertyStepBridge />
        </WizardFrame>
      );
    }
    return (
      <WizardModeBoundary fallback={<ClassicEngine>{classic}</ClassicEngine>}>
        <WizardFrame docType={docType} heading="Create Deed">
          <ModernEngine docType={docType} />
        </WizardFrame>
      </WizardModeBoundary>
    );
  }
  // Classic (unchanged), but keep consistent header/switcher
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
