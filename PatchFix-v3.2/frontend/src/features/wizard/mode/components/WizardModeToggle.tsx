
'use client';
import React from 'react';
import { useWizardMode } from '../ModeContext';

export default function WizardModeToggle() {
  const { mode, setMode, hydrated } = useWizardMode();
  return (
    <div style={{display:'flex', justifyContent:'center', margin:'16px 0'}} aria-live="polite">
      <div className="wiz-toggle" role="tablist" aria-label="Wizard mode">
        <button role="tab" aria-selected={mode==='classic'} className={mode==='classic' ? 'active' : ''}
          onClick={() => hydrated && setMode('classic')}>
          Classic
        </button>
        <button role="tab" aria-selected={mode==='modern'} className={mode==='modern' ? 'active' : ''}
          onClick={() => hydrated && setMode('modern')}>
          Modern (Beta)
        </button>
      </div>
    </div>
  );
}
