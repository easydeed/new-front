'use client';
import React, { useState } from 'react';
import { useWizardMode } from './ModeContext';

export default function ModeSwitcher(){
  const { mode, setMode } = useWizardMode();
  const [confirming, setConfirming] = useState(false);

  function trySwitch(){
    // Optional guard — switching will not drop data because we share the same store,
    // but you can keep this confirm for user clarity.
    if (confirming) {
      setMode(mode === 'modern' ? 'classic' : 'modern');
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(()=>setConfirming(false), 3500);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={trySwitch}
        className="px-3 py-1 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-50"
        aria-pressed={mode==='modern'} title="Toggle wizard mode"
      >
        {mode === 'modern' ? 'Modern Q&A' : 'Traditional'}
      </button>
      {confirming && <span className="text-xs text-gray-500">Switch modes? Data is preserved.</span>}
    </div>
  );
}
