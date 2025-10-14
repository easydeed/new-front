'use client';
import React from 'react';
import { WizardModeProvider, useWizardMode } from './ModeContext';
import WizardModeBoundary from './WizardModeBoundary';
import ModernEngine from './engines/ModernEngine';
import ClassicEngine from './engines/ClassicEngine';
import PropertyStepBridge from './bridge/PropertyStepBridge';
import { useWizardStoreBridge } from './bridge/useWizardStoreBridge';

/**
 * Orchestrates:
 *   Step 1 (Property search via PropertyStepBridge) → Modern Q&A or Classic
 *   - We never modify your Step 1; we render it intact first if property isn't verified.
 */
function Inner({ docType, classic }: { docType: string; classic: React.ReactNode }){
  const { mode } = useWizardMode();
  const { isPropertyVerified } = useWizardStoreBridge();

  if (mode === 'modern') {
    // Hybrid: run Step 1 first if needed
    if (!isPropertyVerified()) return <PropertyStepBridge />;
    return (
      <WizardModeBoundary fallback={<ClassicEngine>{classic}</ClassicEngine>}>
        <ModernEngine docType={docType} />
      </WizardModeBoundary>
    );
  }

  // Classic (your existing tree)
  return <ClassicEngine>{classic}</ClassicEngine>;
}

export default function WizardHost(props: { docType: string; classic: React.ReactNode; }){
  return (
    <WizardModeProvider>
      <Inner {...props} />
    </WizardModeProvider>
  );
}
