'use client';
import React from 'react';
import Sidebar from '@/components/Sidebar';
import DeedTypeBadge from '../components/DeedTypeBadge';
// ✅ PHASE 24-C: ToggleSwitch removed - Modern only!
import { useWizardMode, WizardModeProvider } from '../ModeContext';
import ModeCookieSync from '../hoc/ModeCookieSync';
import './wizard-frame.css';

/**
 * Phase 15 v4.2: Full platform integration with Sidebar
 * Beautiful aesthetics, full-width content, styled toggle switch
 * PATCH4: Added ModeCookieSync for mode persistence
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
    <>
      <ModeCookieSync />
      <div className="wizard-layout">
        <Sidebar />
      
      <div className="wizard-main-content">
        <div className="wizard-frame__header">
          <div className="wizard-frame__title">
            <DeedTypeBadge docType={docType} />
            <h1 className="wizard-heading">{heading || 'Create Deed'}</h1>
            {/* ✅ PHASE 24-C: Always Modern now, mode badge removed */}
          </div>
        </div>
        
        <div className="wizard-frame__body">
          {children}
        </div>
      </div>
    </div>
    </>
  );
}

