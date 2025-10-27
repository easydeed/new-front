'use client';
import React from 'react';
import DeedTypeBadge from '../components/DeedTypeBadge';
import ModeSwitcher from '../ModeSwitcher';
import './wizard-frame.css';

/**
 * Unifies Modern look & feel with Classic.
 * Wrap your engines in this frame to keep header, spacing, and typography consistent.
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
  return (
    <div className="wizard-frame" data-testid="wizard-frame">
      <div className="wizard-frame__header">
        <div className="wizard-frame__title">
          <DeedTypeBadge docType={docType} />
          <span>{heading || 'Create Deed'}</span>
          <span className="wizard-muted">Modern</span>
        </div>
        <ModeSwitcher />
      </div>
      <div className="wizard-frame__body">
        {children}
      </div>
    </div>
  );
}
