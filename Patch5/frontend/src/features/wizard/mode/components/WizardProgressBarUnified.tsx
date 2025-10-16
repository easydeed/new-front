'use client';
import React from 'react';

export type StepDef = { key: string; label: string };
export type StepMap = Record<string, StepDef[]>; // docType -> steps

// A minimal, consistent progress bar for both Classic and Modern.
export default function WizardProgressBarUnified({
  currentStepIndex,
  steps,
}: {
  currentStepIndex: number;
  steps: StepDef[];
}) {
  const total = steps.length;
  const pct = Math.max(0, Math.min(100, Math.round(((currentStepIndex+1) / total) * 100)));
  return (
    <div aria-label="Wizard progress" style={{ width: '100%', margin: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#475569' }}>
        <div>{steps[currentStepIndex]?.label || '—'}</div>
        <div>{currentStepIndex+1} / {total}</div>
      </div>
      <div style={{ height: 6, width: '100%', background: '#e5e7eb', borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#0f172a', borderRadius: 999, transition: 'width 200ms' }} />
      </div>
    </div>
  );
}
