
'use client';
import React from 'react';
import { useWizardMode } from './ModeContext';

export default function WizardModeToggle({ docType }: { docType: string }) {
  const { mode, setMode, hydrated } = useWizardMode();
  return (
    <div aria-live="polite" className="dp-mode-toggle" style={{ position: 'absolute', top: 16, right: 16, zIndex: 40 }}>
      <div className="btn-group">
        <button
          type="button"
          className={`btn ${mode==='classic' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('classic')}
          disabled={!hydrated}
          aria-pressed={mode==='classic'}
        >
          Classic
        </button>
        <button
          type="button"
          className={`btn ${mode==='modern' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('modern')}
          disabled={!hydrated}
          aria-pressed={mode==='modern'}
        >
          Modern
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Mode: {mode}</div>
    </div>
  );
}
