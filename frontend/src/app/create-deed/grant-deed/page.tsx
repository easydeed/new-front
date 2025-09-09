"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { DynamicWizard } from '../../../components/DynamicWizard';
import '../../../styles/dashboard.css';

export default function GrantDeedWizard() {
  const router = useRouter();

  const handleWizardComplete = (documentData: any) => {
    // Clear any old saved data
    localStorage.removeItem('deedWizardDraft');
    
    // Redirect to dashboard with success message
    router.push('/dashboard?success=grant_deed_generated');
  };

  const handleWizardCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="wizard-container">
        {/* Header */}
          <div className="wizard-header">
            <h1>Grant Deed Generator</h1>
            <p>Create a professional Grant Deed with AI assistance</p>
        </div>

          {/* Dynamic Wizard */}
          <DynamicWizard
            initialDocumentType="grant_deed"
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
            className="grant-deed-wizard"
          />
        </div>
      </div>
    </div>
  );
}
