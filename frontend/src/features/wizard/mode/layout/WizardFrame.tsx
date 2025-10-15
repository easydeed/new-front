'use client';
import React from 'react';
import Sidebar from '@/components/Sidebar';
import DeedTypeBadge from '../components/DeedTypeBadge';
import ToggleSwitch from '../components/ToggleSwitch';
import { useWizardMode } from '../ModeContext';
import './wizard-frame.css';

/**
 * Phase 15 v4.2: Full platform integration with Sidebar
 * Beautiful aesthetics, full-width content, styled toggle switch
 */
export default function WizardFrame({
  docType,
  heading,
  children
}:{
  docType: string;
  heading?: string;
  children: React.ReactNode;
}){
  const { mode } = useWizardMode();
  
  return (
    <div className="wizard-layout">
      <Sidebar />
      
      <div className="wizard-main-content">
        <div className="wizard-frame__header">
          <div className="wizard-frame__title">
            <DeedTypeBadge docType={docType} />
            <h1 className="wizard-heading">{heading || 'Create Deed'}</h1>
            {mode === 'modern' && <span className="wizard-mode-badge">Modern</span>}
          </div>
          <ToggleSwitch />
        </div>
        
        <div className="wizard-frame__body">
          {children}
        </div>
      </div>
    </div>
  );
}

