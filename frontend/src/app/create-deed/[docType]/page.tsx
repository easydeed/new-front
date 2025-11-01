"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import PropertySearchWithTitlePoint from '../../../components/PropertySearchWithTitlePoint';
import Step2RequestDetails from '../../../features/wizard/steps/Step2RequestDetails';
import Step3DeclarationsTax from '../../../features/wizard/steps/Step3DeclarationsTax';
import Step4PartiesProperty from '../../../features/wizard/steps/Step4PartiesProperty';
import Step5PreviewFixed from '../../../features/wizard/steps/Step5PreviewFixed';
import DTTExemption from '../../../features/wizard/steps/DTTExemption';
import Covenants from '../../../features/wizard/steps/Covenants';
import TaxSaleRef from '../../../features/wizard/steps/TaxSaleRef';
import { flows, getFlowForDocType, type DocType, type StepId } from '../../../features/wizard/flows';
import { getContextAdapter } from '../../../features/wizard/context/buildContext';
import { prefillFromEnrichment } from '../../../features/wizard/services/propertyPrefill';
import '../../../styles/dashboard.css';
import { useWizardStore } from '../../../store';
import WizardHost from '../../../features/wizard/mode/WizardHost';
// Phase15: Isolated storage keys + safe wrapper
import { safeStorage } from '../../../shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_CLASSIC, WIZARD_DRAFT_KEY_MODERN } from '../../../features/wizard/mode/bridge/persistenceKeys';
// [v4.2] Consistent docType mapping
import { canonicalFromUrlParam, toUrlSlug, toLabel } from '../../../features/wizard/mode/utils/docType';
// Phase 15 v5: Partners provider for industry partners
import { PartnersProvider } from '../../../features/partners/PartnersContext';

/**
 * Phase 11 + Phase 15 Hydration Fix: Unified Wizard for All Deed Types
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
 * 
 * Phase 15 Fix: Extracted Classic wizard into separate component to prevent
 * hydration errors caused by unconditional localStorage access.
 */

/**
 * ClassicWizard: The traditional multi-step wizard (isolated component)
 * 
 * This component is ONLY rendered when in Classic mode, preventing hooks from
 * running unconditionally and causing hydration mismatches.
 */
function ClassicWizard({ docType }: { docType: DocType }) {
  const { currentStep, setCurrentStep } = useWizardStore();
  
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

  // Auto-save functionality (Phase15: uses isolated Classic key)
  useEffect(() => {
    const saveData = {
      currentStep,
      verifiedData,
      grantDeed,
      docType,
      timestamp: new Date().toISOString()
    };
    
    safeStorage.set(WIZARD_DRAFT_KEY_CLASSIC, JSON.stringify(saveData));
    setAutoSaveStatus('Saved');
    
    const timer = setTimeout(() => {
      setAutoSaveStatus('');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentStep, verifiedData, grantDeed, docType]);

  // Load saved data on component mount (Phase15: uses isolated Classic key)
  // ✅ PHASE 19 HOTFIX #5: Clear data when switching deed types
  // ✅ PHASE 19 FORENSIC FIX: Check sessionStorage flag to prevent loading old data
  useEffect(() => {
    // Check if we just cleared localStorage from document selector
    const wasJustCleared = typeof window !== 'undefined' && sessionStorage.getItem('deedWizardCleared') === 'true';
    
    if (wasJustCleared) {
      setCurrentStep(1);
      setVerifiedData({});
      setGrantDeed({ step2: {}, step3: {}, step4: {} });
      setPropertyConfirmed(false);
      return; // Don't load from localStorage
    }
    
    const savedData = safeStorage.get(WIZARD_DRAFT_KEY_CLASSIC);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        
        // Only restore if same docType
        if (parsed.docType === docType) {
          if (parsed.currentStep && parsed.currentStep > 1) {
            console.log('[ClassicWizard] 📂 Resuming saved session at step', parsed.currentStep);
            setCurrentStep(parsed.currentStep);
            setVerifiedData(parsed.verifiedData || {});
            setGrantDeed(parsed.grantDeed || parsed.wizardData || {});
            if (parsed.currentStep > 1) {
              setPropertyConfirmed(true);
            }
          }
        } else {
          // ✅ HOTFIX #5: Different docType - clear old data and start fresh
          console.log(`[ClassicWizard] DocType changed from ${parsed.docType} to ${docType} - clearing old data`);
          setCurrentStep(1);
          setVerifiedData({});
          setGrantDeed({ step2: {}, step3: {}, step4: {} });
          setPropertyConfirmed(false);
          // Clear localStorage to prevent confusion
          safeStorage.remove(WIZARD_DRAFT_KEY_CLASSIC);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, [docType, setCurrentStep]);

  const handlePropertyVerified = (data: VerifiedData) => {
    setVerifiedData(data);
    setPropertyConfirmed(true);
    
    // ✅ PHASE 19 HOTFIX #8: Clear old wizard data when NEW property is searched
    // This ensures fresh start with SiteX data, no old junk text
    console.log('[handlePropertyVerified] 🔄 Fresh property search - clearing old wizard data');
    setGrantDeed({ step2: {}, step3: {}, step4: {} });
    
    // Phase 11 Prequal: Prefill enriched data from SiteX/TitlePoint
    prefillFromEnrichment(data as any, setGrantDeed);
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
        // Phase 11 Prequal: Use new Step5PreviewFixed with context adapter
        const contextAdapter = getContextAdapter(docType);
        const wizardData = {
          step1: verifiedData,
          grantDeed,
          verifiedData,
          dttExemption: grantDeed.dttExemption,
          warranty: grantDeed.warranty,
          taxSale: grantDeed.taxSale,
        };
        
        return (
          <Step5PreviewFixed
            docType={docType}
            onStepChange={setCurrentStep}
            wizardData={wizardData}
            contextBuilder={contextAdapter}
          />
        );
      
      default:
        return <div>Unknown step: {currentStepId}</div>;
    }
  };

  // Return the Classic wizard JSX
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Sidebar />
      
      {/* ✅ PHASE 19 FORENSIC FIX: Sidebar is position:fixed, so wizard needs marginLeft */}
      {/* Sidebar width is 240px (from CSS), add 240px margin to prevent overlap */}
      <div style={{ flex: 1, padding: '2rem', marginLeft: '240px', position: 'relative', zIndex: 1 }}>
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

/**
 * UnifiedWizard: Main entry point for the wizard
 * 
 * Phase 15 Fix: This component now only extracts the docType from URL params
 * and passes the ClassicWizard component to WizardHost. No hooks run here!
 * 
 * Phase 15 v5: Wrapped with PartnersProvider for industry partners integration
 */
export default function UnifiedWizard() {
  const params = useParams();
  const router = useRouter();
  
  // [v4.2] URL param → canonical docType (e.g., 'quitclaim-deed' → 'quitclaim')
  const docType = canonicalFromUrlParam(params?.docType as string);

  // PATCH4a-FIX: Clear localStorage if ?fresh=true URL param is present
  // Usage: /create-deed/grant-deed?mode=modern&fresh=true
  // ✅ PHASE 19 SESSION FIX: Also clear sessionStorage flag after initial clear
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('fresh') === 'true') {
        console.log('[UnifiedWizard] Fresh start requested - clearing localStorage');
        safeStorage.remove(WIZARD_DRAFT_KEY_MODERN);
        safeStorage.remove(WIZARD_DRAFT_KEY_CLASSIC);
        sessionStorage.removeItem('deedWizardCleared'); // Clear flag for fresh start
        // Remove ?fresh=true from URL to prevent clearing on refresh
        urlParams.delete('fresh');
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        router.replace(newUrl);
      } else {
        // ✅ PHASE 19 SESSION FIX: Clear flag after initial page load
        // This prevents repeated clearing when navigating sidebar links within wizard
        const hasCleared = sessionStorage.getItem('deedWizardCleared');
        if (hasCleared) {
          console.log('[UnifiedWizard] Initial wizard load complete - clearing session flag');
          sessionStorage.removeItem('deedWizardCleared');
        }
      }
    }
  }, [router]);

  // Phase 15 v5: Wrap with PartnersProvider for industry partners
  // Phase 15: Dual-Mode Wizard Integration
  // WizardHost determines which mode to render (Modern vs. Classic)
  // ClassicWizard component is passed, not JSX, so hooks only run when it's rendered
  return (
    <PartnersProvider>
      <WizardHost docType={docType} classic={<ClassicWizard docType={docType as DocType} />} />
    </PartnersProvider>
  );
}

