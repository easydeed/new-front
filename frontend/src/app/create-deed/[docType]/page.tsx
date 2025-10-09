"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import PropertySearchWithTitlePoint from '../../../components/PropertySearchWithTitlePoint';
import Step2RequestDetails from '../../../features/wizard/steps/Step2RequestDetails';
import Step3DeclarationsTax from '../../../features/wizard/steps/Step3DeclarationsTax';
import Step4PartiesProperty from '../../../features/wizard/steps/Step4PartiesProperty';
import Step5Preview from '../../../features/wizard/steps/Step5Preview';
import DTTExemption from '../../../features/wizard/steps/DTTExemption';
import Covenants from '../../../features/wizard/steps/Covenants';
import TaxSaleRef from '../../../features/wizard/steps/TaxSaleRef';
import { flows, getFlowForDocType, type DocType, type StepId } from '../../../features/wizard/flows';
import '../../../styles/dashboard.css';
import { useWizardStore } from '../../../store';

/**
 * Phase 11: Unified Wizard for All Deed Types
 * 
 * This wizard dynamically renders steps based on the deed type (docType).
 * Uses the flow registry to determine which steps to show and in what order.
 * 
 * Supported Deed Types:
 * - grant_deed (5 steps: Address → RequestDetails → Tax → Parties → Preview)
 * - quitclaim (4 steps: Address → RequestDetails → Parties → Preview)
 * - interspousal_transfer (5 steps: Address → RequestDetails → DTTExemption → Parties → Preview)
 * - warranty_deed (5 steps: Address → RequestDetails → Covenants → Parties → Preview)
 * - tax_deed (5 steps: Address → RequestDetails → TaxSaleRef → Parties → Preview)
 */
export default function UnifiedWizard() {
  const params = useParams();
  const router = useRouter();
  const { currentStep, setCurrentStep } = useWizardStore();
  
  // Get docType from URL params (e.g., /create-deed/grant-deed → 'grant_deed')
  const rawDocType = params?.docType as string || 'grant_deed';
  const docType = rawDocType.replace(/-/g, '_') as DocType;
  
  // Get the flow for this deed type
  const flow = getFlowForDocType(docType);
  const totalSteps = flow.length;
  const currentStepId = flow[currentStep - 1];

  // Deed type labels
  const deedTypeLabels: Record<DocType, string> = {
    grant_deed: 'Grant Deed',
    quitclaim: 'Quitclaim Deed',
    interspousal_transfer: 'Interspousal Transfer Deed',
    warranty_deed: 'Warranty Deed',
    tax_deed: 'Tax Deed',
  };

  // Step titles
  const stepTitles: Record<StepId, string> = {
    Address: 'Property Search',
    RequestDetails: 'Request Details',
    Tax: 'Transfer Tax',
    DTTExemption: 'DTT Exemption',
    Covenants: 'Covenants',
    TaxSaleRef: 'Tax Sale Ref',
    Parties: 'Parties & Property',
    Preview: 'Review & Generate',
  };

  // State
  type Owner = { fullName?: string; name?: string };
  type PiqAddress = { name?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  interface VerifiedData {
    apn?: string;
    county?: string;
    piqAddress?: PiqAddress;
    titlePoint?: { owners?: Owner[] };
    [key: string]: unknown;
  }
  const [verifiedData, setVerifiedData] = useState<VerifiedData>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [propertyConfirmed, setPropertyConfirmed] = useState(false);
  const [grantDeed, setGrantDeed] = useState<Record<string, unknown>>({
    step2: {},
    step3: {},
    step4: {}
  });

  // Auto-save functionality
  useEffect(() => {
    const saveData = {
      currentStep,
      verifiedData,
      grantDeed,
      docType,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('deedWizardDraft', JSON.stringify(saveData));
    setAutoSaveStatus('Saved');
    
    const timer = setTimeout(() => {
      setAutoSaveStatus('');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentStep, verifiedData, grantDeed, docType]);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('deedWizardDraft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        
        // Only restore if same docType
        if (parsed.docType === docType) {
          if (parsed.currentStep && parsed.currentStep > 1) {
            setCurrentStep(parsed.currentStep);
            setVerifiedData(parsed.verifiedData || {});
            setGrantDeed(parsed.grantDeed || parsed.wizardData || {});
            if (parsed.currentStep > 1) {
              setPropertyConfirmed(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, [docType]);

  const handlePropertyVerified = (data: VerifiedData) => {
    setVerifiedData(data);
    setPropertyConfirmed(true);
  };

  type StepPayload = Partial<{
    step2: any;
    step3: any;
    step4: any;
    dttExemption: any;
    warranty: any;
    taxSale: any;
  }>;

  const handleStepDataChange = (stepData: StepPayload) => {
    setGrantDeed(prev => ({ ...prev, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Step router: Maps StepId → Component
  const renderStep = () => {
    switch (currentStepId) {
      case 'Address':
        return (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Property Search</h2>
              <p style={{ color: '#6b7280' }}>Search and verify the property for your {deedTypeLabels[docType]}</p>
            </div>
            
            <PropertySearchWithTitlePoint onVerified={handlePropertyVerified} />
            
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button
                onClick={handleNext}
                disabled={!propertyConfirmed}
                style={{
                  padding: '12px 24px',
                  backgroundColor: propertyConfirmed ? '#F57C00' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: propertyConfirmed ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: propertyConfirmed ? '0 2px 8px rgba(245, 124, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  opacity: propertyConfirmed ? 1 : 0.6
                }}
              >
                Continue to {stepTitles[flow[currentStep]] || 'Next Step'}
              </button>
            </div>
          </div>
        );
      
      case 'RequestDetails':
        return <Step2RequestDetails onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'Tax':
        return <Step3DeclarationsTax onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'DTTExemption':
        return <DTTExemption onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'Covenants':
        return <Covenants onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'TaxSaleRef':
        return <TaxSaleRef onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'Parties':
        return <Step4PartiesProperty onNext={handleNext} onDataChange={handleStepDataChange} />;
      
      case 'Preview':
        return <Step5Preview onStepChange={setCurrentStep} />;
      
      default:
        return <div>Unknown step: {currentStepId}</div>;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Sidebar />
      
      <div style={{ flex: 1, padding: '2rem', marginLeft: '280px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            {deedTypeLabels[docType]} Wizard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Create a California {deedTypeLabels[docType]} with guided step-by-step assistance
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            maxWidth: '800px',
            margin: '0 auto',
            position: 'relative'
          }}>
            {flow.map((stepId, index) => {
              const stepNumber = index + 1;
              return (
                <div key={stepId} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 20,
                  flex: 1
                }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: currentStep >= stepNumber ? '#F57C00' : '#e5e7eb',
                      color: currentStep >= stepNumber ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      margin: '0 auto',
                      transition: 'all 0.3s ease',
                      boxShadow: currentStep >= stepNumber ? '0 4px 12px rgba(245, 124, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.05)',
                      transform: currentStep === stepNumber ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {stepNumber}
                  </div>
                  
                  {/* Progress Line */}
                  {index < totalSteps - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 'calc(50% + 24px)',
                        right: 'calc(-50% + 24px)',
                        height: '3px',
                        backgroundColor: currentStep > stepNumber ? '#F57C00' : '#e5e7eb',
                        top: '24px',
                        transition: 'all 0.3s ease',
                        zIndex: 10
                      }}
                    />
                  )}
                  
                  <div style={{ 
                    marginTop: '0.75rem',
                    textAlign: 'center', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: currentStep >= stepNumber ? '#F57C00' : '#6b7280',
                    transition: 'color 0.3s ease',
                    maxWidth: '100px'
                  }}>
                    {stepTitles[stepId]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-save indicator */}
        {autoSaveStatus && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#22c55e',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000
          }}>
            {autoSaveStatus}
          </div>
        )}

        {/* Step Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb',
          minHeight: '500px'
        }}>
          {renderStep()}

          {/* Navigation (Back button for steps 2+, except Preview) */}
          {currentStep > 1 && currentStepId !== 'Preview' && (
            <div style={{
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

