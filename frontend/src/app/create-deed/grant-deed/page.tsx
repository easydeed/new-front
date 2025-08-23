"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import PropertySearchWithTitlePoint from '../../../components/PropertySearchWithTitlePoint';
import Step2RequestDetails from '../../../features/wizard/steps/Step2RequestDetails';
import Step3DeclarationsTax from '../../../features/wizard/steps/Step3DeclarationsTax';
import Step4PartiesProperty from '../../../features/wizard/steps/Step4PartiesProperty';
import Step5Preview from '../../../features/wizard/steps/Step5Preview';
import '../../../styles/dashboard.css';

export default function GrantDeedWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [verifiedData, setVerifiedData] = useState<{[key: string]: any}>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [propertyConfirmed, setPropertyConfirmed] = useState(false);
  const [wizardData, setWizardData] = useState({
    step1: {},
    step2: {},
    step3: {},
    step4: {}
  });
  const router = useRouter();

  // Auto-save functionality
  useEffect(() => {
    const saveData = {
      currentStep,
      verifiedData,
      wizardData,
      docType: 'grant_deed',
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('deedWizardDraft', JSON.stringify(saveData));
    setAutoSaveStatus('Saved');
    
    const timer = setTimeout(() => {
      setAutoSaveStatus('');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentStep, verifiedData, wizardData]);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('deedWizardDraft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.currentStep && parsed.currentStep > 1) {
          setCurrentStep(parsed.currentStep);
          setVerifiedData(parsed.verifiedData || {});
          setWizardData(parsed.wizardData || {});
          if (parsed.currentStep > 1) {
            setPropertyConfirmed(true);
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  const handlePropertyVerified = (data: any) => {
    setVerifiedData(data);
    setPropertyConfirmed(true);
    setWizardData(prev => ({
      ...prev,
      step1: {
        apn: data.apn,
        county: data.county,
        piqAddress: data.piqAddress,
        titlePoint: data.titlePoint
      }
    }));
  };

  const handleStepDataChange = (stepData: any) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const stepTitles = [
    'Property Search',
    'Request Details', 
    'Transfer Tax',
    'Parties & Property',
    'Review & Generate'
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Sidebar />
      
      <div style={{ flex: 1, padding: '2rem', marginLeft: '280px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            Grant Deed Wizard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Create a California Grant Deed with guided step-by-step assistance
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
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={step} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                position: 'relative',
                zIndex: 20
              }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: currentStep >= step ? '#F57C00' : '#e5e7eb',
                    color: currentStep >= step ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    margin: '0 auto',
                    transition: 'all 0.3s ease',
                    boxShadow: currentStep >= step ? '0 4px 12px rgba(245, 124, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.05)',
                    transform: currentStep === step ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {step}
                </div>
                
                {/* Progress Line */}
                {index < 4 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(50% + 24px)',
                      right: 'calc(-50% + 24px)',
                      height: '3px',
                      backgroundColor: currentStep > step ? '#F57C00' : '#e5e7eb',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      transition: 'all 0.3s ease',
                      zIndex: 10
                    }}
                  />
                )}
                
                <div style={{ 
                  marginTop: '0.75rem',
                  textAlign: 'center', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: currentStep >= step ? '#F57C00' : '#6b7280',
                  transition: 'color 0.3s ease'
                }}>
                  {stepTitles[index]}
                </div>
              </div>
            ))}
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
          
          {/* Step 1: Property Search */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Property Search</h2>
                <p style={{ color: '#6b7280' }}>Search and verify the property for your Grant Deed</p>
              </div>
              
              <PropertySearchWithTitlePoint onPropertyVerified={handlePropertyVerified} />
              
              {propertyConfirmed && (
                <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#F57C00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(245, 124, 0, 0.2)'
                    }}
                  >
                    Continue to Request Details
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Request Details */}
          {currentStep === 2 && (
            <Step2RequestDetails 
              onNext={handleNext}
              onDataChange={handleStepDataChange}
            />
          )}

          {/* Step 3: Transfer Tax */}
          {currentStep === 3 && (
            <Step3DeclarationsTax 
              onNext={handleNext}
              onDataChange={handleStepDataChange}
            />
          )}

          {/* Step 4: Parties & Property */}
          {currentStep === 4 && (
            <Step4PartiesProperty 
              onNext={handleNext}
              onDataChange={handleStepDataChange}
            />
          )}

          {/* Step 5: Preview & Generate */}
          {currentStep === 5 && (
            <Step5Preview 
              onStepChange={setCurrentStep}
            />
          )}

          {/* Navigation (Steps 2-5) */}
          {currentStep > 1 && currentStep < 5 && (
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
