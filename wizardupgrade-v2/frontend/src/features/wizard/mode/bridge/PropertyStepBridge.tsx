'use client';
import React from 'react';
import { useWizardStoreBridge } from './useWizardStoreBridge';

/**
 * Renders YOUR existing Step 1 (Property Search) EXACTLY as-is.
 * After property verification, this component will stop rendering and the Modern Q&A will take over.
 *
 * TODO: Replace the import below to your Step 1 component.
 */
// Example imports (choose the correct one and delete the other lines):
// import PropertySearchWithTitlePoint from '@/features/wizard/steps/PropertySearchWithTitlePoint';
// import Step1PropertySearch from '@/features/wizard/steps/Step1PropertySearch';

export default function PropertyStepBridge(){
  const { isPropertyVerified } = useWizardStoreBridge();

  if (isPropertyVerified()) return null; // Already done → let ModernEngine render

  return (
    <div className="p-4">
      {/* TODO: render your Step 1 component here. Example: */}
      {/* <PropertySearchWithTitlePoint /> */}
      {/* If your Step 1 expects callbacks (onVerified), wire them to update the store. */}
      <div className="text-sm text-gray-600">
        <strong>Missing Step 1 component:</strong> Open <code>PropertyStepBridge.tsx</code> and import your Step 1.
      </div>
    </div>
  );
}
