'use client';
import React, { useState } from 'react';
import { useWizardMode } from '../ModeContext';
import './toggle-switch.css';

/**
 * Phase 15 v4.2: Beautiful toggle switch with blue background
 * Styled like a modern iOS/Material toggle switch
 */
export default function ToggleSwitch() {
  const { mode, setMode } = useWizardMode();
  const [confirming, setConfirming] = useState(false);

  function handleToggle() {
    if (confirming) {
      setMode(mode === 'modern' ? 'classic' : 'modern');
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3500);
    }
  }

  return (
    <div className="toggle-switch-container">
      <div 
        className={`toggle-switch ${mode === 'modern' ? 'modern-active' : 'classic-active'}`}
        onClick={handleToggle}
        role="switch"
        aria-checked={mode === 'modern'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className={`toggle-option ${mode === 'classic' ? 'active' : ''}`}>
          Classic
        </div>
        <div className={`toggle-option ${mode === 'modern' ? 'active' : ''}`}>
          Modern
        </div>
        <div className={`toggle-pill ${mode === 'modern' ? 'pill-right' : 'pill-left'}`} />
      </div>
      {confirming && (
        <div className="toggle-confirm-message">
          Switch modes? Data is preserved.
        </div>
      )}
    </div>
  );
}

