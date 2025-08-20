'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Removed framer-motion to fix build issues
import Sidebar from '../../components/Sidebar';
import PropertySearchWithTitlePoint from '../../components/PropertySearchWithTitlePoint';
import '../../styles/dashboard.css';

// Document types configuration
const DOC_TYPES = {
  grant_deed: {
    label: 'Grant Deed',
    fields: ['consideration'],
    buttons: ['vesting', 'grant_deed', 'tax_roll', 'chain_of_title'],
    required: ['granteeName', 'consideration'],
    dataNeeds: ['current_owner', 'legal_description', 'consideration_amount', 'vesting_type', 'tax_assessments']
  },
  quit_claim: {
    label: 'Quitclaim Deed', 
    fields: [],
    buttons: ['vesting'],
    required: ['granteeName'],
    dataNeeds: ['current_owner', 'legal_description', 'vesting_type']
  },
  interspousal_transfer: {
    label: 'Interspousal Transfer',
    fields: ['spouse'],
    buttons: ['vesting'],
    required: ['spouse'],
    dataNeeds: ['current_owner', 'legal_description', 'vesting_type', 'spouse_confirmation']
  },
  warranty_deed: {
    label: 'Warranty Deed',
    fields: ['covenants'],
    buttons: ['grant_deed', 'chain_of_title'],
    required: ['granteeName', 'covenants'],
    dataNeeds: ['current_owner', 'legal_description', 'consideration_amount', 'chain_of_title', 'title_warranty']
  },
  tax_deed: {
    label: 'Tax Deed',
    fields: ['buyer'],
    buttons: ['tax_roll'],
    required: ['buyer'],
    dataNeeds: ['tax_sale_info', 'legal_description', 'tax_amounts', 'auction_details']
  },
  property_profile: {
    label: 'Property Profile Report',
    fields: [],
    buttons: ['vesting', 'grant_deed', 'tax_roll', 'chain_of_title'],
    required: [],
    dataNeeds: ['all_property_data', 'ownership_history', 'tax_history', 'legal_description', 'liens_encumbrances']
  }
};

// Helper function to get document descriptions
const getDocumentDescription = (docType: string) => {
  const descriptions = {
    grant_deed: 'Standard property transfer with warranties and consideration',
    quit_claim: 'Simple ownership transfer without warranties',
    interspousal_transfer: 'Property transfer between spouses',
    warranty_deed: 'Property transfer with full warranty protection',
    tax_deed: 'Property transfer from tax sale or auction',
    property_profile: 'Comprehensive property analysis and ownership report'
  };
  return descriptions[docType] || 'Legal document for property transfer';
};

// Enhanced data mapping based on document type
const enhanceDataForDocumentType = (rawData: any, docType: string) => {
  const enhanced = { ...rawData };
  
  switch (docType) {
    case 'grant_deed':
      // Ensure we have consideration and vesting information
      if (rawData.current_owner_primary) {
        enhanced.grantorName = rawData.current_owner_primary;
      }
      if (rawData.vesting) {
        enhanced.vesting = rawData.vesting;
      }
      break;
      
    case 'quit_claim':
      // Focus on ownership transfer without consideration
      if (rawData.current_owner_primary) {
        enhanced.grantorName = rawData.current_owner_primary;
      }
      break;
      
    case 'interspousal_transfer':
      // Handle spouse-to-spouse transfer
      if (rawData.current_owner_primary && rawData.current_owner_secondary) {
        enhanced.grantorName = rawData.current_owner_primary;
        enhanced.spouse = rawData.current_owner_secondary;
      }
      break;
      
    case 'warranty_deed':
      // Full warranty protection requirements
      if (rawData.current_owner_primary) {
        enhanced.grantorName = rawData.current_owner_primary;
      }
      if (rawData.chainOfTitle) {
        enhanced.chainOfTitle = rawData.chainOfTitle;
      }
      break;
      
    case 'tax_deed':
      // Tax sale specific information
      if (rawData.tax_sale_info) {
        enhanced.taxSaleInfo = rawData.tax_sale_info;
      }
      if (rawData.assessed_value) {
        enhanced.consideration = rawData.assessed_value;
      }
      break;
      
    case 'property_profile':
      // Comprehensive property report
      enhanced.propertyProfile = {
        ownership: rawData.ownership || {},
        taxInfo: rawData.taxInfo || {},
        legalDescription: rawData.legalDescription || '',
        chainOfTitle: rawData.chainOfTitle || [],
        liens: rawData.liens || []
      };
      break;
  }
  
  return enhanced;
};

export default function CreateDeed() {
  const [currentStep, setCurrentStep] = useState(1);
  const [docType, setDocType] = useState('');
  const [verifiedData, setVerifiedData] = useState<{[key: string]: any}>({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [propertyConfirmed, setPropertyConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    propertySearch: '',
    apn: '',
    county: '',
    city: '',
    state: '',
    zip: '',
    legalDescription: '',
    grantorName: '',
    granteeName: '',
    vesting: '',
    consideration: '',
    spouse: '',
    covenants: '',
    buyer: '',
    chainOfTitle: [],
    titleIssues: [],
    ownershipDuration: []
  });
  const router = useRouter();

  // Auto-save functionality
  useEffect(() => {
    const saveData = {
      currentStep,
      docType,
      verifiedData,
      formData,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('deedWizardDraft', JSON.stringify(saveData));
    setAutoSaveStatus('Saved');
    
    const timer = setTimeout(() => {
      setAutoSaveStatus('');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentStep, docType, verifiedData, formData]);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('deedWizardDraft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.currentStep && parsed.currentStep > 1) {
          // Only restore if user was past step 1
          setCurrentStep(parsed.currentStep);
          setDocType(parsed.docType || '');
          setVerifiedData(parsed.verifiedData || {});
          setFormData(prev => ({ ...prev, ...parsed.formData }));
        }
      } catch (error) {
        console.error('Failed to load saved wizard data:', error);
      }
    }
  }, []);

  // Cancel wizard function
  const handleCancelWizard = () => {
    if (window.confirm('Are you sure you want to cancel? All progress will be lost.')) {
      localStorage.removeItem('deedWizardDraft');
      router.push('/dashboard');
    }
  };

  // Handle property search completion from PropertySearch component
  const handlePropertyVerified = (propertyData: any) => {
    setVerifiedData(propertyData);
    setPropertyConfirmed(true); // User has confirmed the property details
    setFormData(prev => ({ 
      ...prev, 
      ...propertyData,
      propertySearch: propertyData.fullAddress || propertyData.address
    }));
    // Don't auto-advance anymore - let user click Next button
  };

  // Handle doc type selection
  const handleDocTypeChange = (type: string) => {
    setDocType(type);
    setFormData(prev => ({ ...prev, deedType: type }));
    setErrors({});
    
    // Auto-advance for property profile
    if (type === 'property_profile') {
      handleButtonPrompt('all');
    }
  };

  // Handle button prompts
  const handleButtonPrompt = async (promptType: string) => {
    if (!docType) return;
    
    setLoading(true);
    setErrors({});

    try {
      const currentDocType = DOC_TYPES[docType as keyof typeof DOC_TYPES];
      
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: promptType,
          docType,
          verifiedData,
          currentData: formData,
          dataNeeds: currentDocType?.dataNeeds || [], // Include specific data needs for this document type
          requiredFields: currentDocType?.required || [] // Include required fields
        })
      });

      const result = await response.json();
      
      if (result.error) {
        setErrors({ prompt: result.error });
        return;
      }

      // Enhanced data mapping based on document type
      const enhancedData = enhanceDataForDocumentType(result, docType);
      setFormData(prev => ({ ...prev, ...enhancedData }));
      
      // Check for fast-forward
      if (checkFastForward(enhancedData)) {
        setCurrentStep(3);
      }
      
    } catch (error) {
      setErrors({ prompt: 'Failed to fetch data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle custom prompt
  const handleCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          docType,
          verifiedData,
          currentData: formData
        })
      });

      const result = await response.json();
      
      if (result.error) {
        setErrors({ custom: result.error });
        return;
      }

      setFormData(prev => ({ ...prev, ...result }));
      setCustomPrompt('');
      
    } catch (error) {
      setErrors({ custom: 'Failed to process prompt. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Fast-forward logic
  const checkFastForward = (data: any) => {
    if (!docType || !DOC_TYPES[docType as keyof typeof DOC_TYPES]) return false;
    
    const required = DOC_TYPES[docType as keyof typeof DOC_TYPES].required;
    const filled = required.every(field => data[field] && data[field].trim());
    
    return filled;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-deed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Deed generated successfully!');
        router.push('/past-deeds');
      } else {
        setErrors({ generate: result.error || 'Generation failed' });
      }
      
    } catch (error) {
      setErrors({ generate: 'Failed to generate deed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="wizard-container">
          {/* Header */}
          <div className="wizard-header" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="wizard-title">Create Your Document</h1>
                <p className="wizard-subtitle">Dynamic prompt-driven document generation</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Auto-save indicator */}
                {autoSaveStatus && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ✓ {autoSaveStatus}
                  </div>
                )}
                {/* Cancel button */}
                <button
                  onClick={handleCancelWizard}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar - Cloud-like Experience with 64px circles */}
          <div className="progress-container" style={{ marginBottom: '3rem' }}>
            <div className="progress-bar">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`progress-step ${currentStep >= step ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: currentStep >= step ? '#F57C00' : '#e5e7eb',
                      color: currentStep >= step ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '24px',
                      margin: '0 auto',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: currentStep >= step ? '0 8px 24px rgba(245, 124, 0, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transform: currentStep === step ? 'scale(1.1)' : 'scale(1)',
                      zIndex: 10
                    }}
                  >
                    {currentStep > step ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 'calc(50% + 32px)',
                        right: 'calc(-50% + 32px)',
                        height: '4px',
                        backgroundColor: currentStep > step ? '#F57C00' : '#e5e7eb',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 1,
                        borderRadius: '2px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="progress-labels" style={{ display: 'flex', marginTop: '16px' }}>
              <div style={{ 
                flex: 1, 
                textAlign: 'center', 
                fontSize: '16px', 
                fontWeight: '600',
                color: currentStep >= 1 ? '#F57C00' : '#6b7280',
                transition: 'color 0.3s ease'
              }}>
                Address
              </div>
              <div style={{ 
                flex: 1, 
                textAlign: 'center', 
                fontSize: '16px', 
                fontWeight: '600',
                color: currentStep >= 2 ? '#F57C00' : '#6b7280',
                transition: 'color 0.3s ease'
              }}>
                Document Type
              </div>
              <div style={{ 
                flex: 1, 
                textAlign: 'center', 
                fontSize: '16px', 
                fontWeight: '600',
                color: currentStep >= 3 ? '#F57C00' : '#6b7280',
                transition: 'color 0.3s ease'
              }}>
                Review & Generate
              </div>
            </div>
          </div>

          {/* Step Content */}
            {/* Step 1: Address Verification */}
            {currentStep === 1 && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  🏠 Find Your Property
                </h2>
                <div style={{ 
                  backgroundColor: '#f0f9ff', 
                  border: '1px solid #bae6fd', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  marginBottom: '1.5rem' 
                }}>
                  <p style={{ color: '#0c4a6e', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    💡 <strong>Here's how it works:</strong><br/>
                    1. Start typing your property address<br/>
                    2. Select from the helpful suggestions (or keep typing)<br/>
                    3. Click "Search" to find property details automatically<br/>
                    4. We'll get ownership, tax, and legal information for you!
                  </p>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '16px' }}>
                  Let's start with the property address. Our system will automatically find ownership and legal details.
                </p>
                
                <PropertySearchWithTitlePoint 
                  onVerified={handlePropertyVerified}
                  onPropertyFound={(data) => {
                    // Property details found - user hasn't confirmed yet
                    setPropertyConfirmed(false);
                  }}
                />
                
                {errors.property && (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {errors.property}
                  </p>
                )}
                
                {/* Step 1 Navigation */}
                <div style={{ 
                  marginTop: '2rem',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div></div> {/* Empty div for spacing */}
                  <button
                    onClick={() => {
                      if (!propertyConfirmed) {
                        setErrors({property: 'Please complete property search and confirm property details before proceeding'});
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    disabled={!propertyConfirmed}
                    style={{
                      padding: '20px 36px',
                      backgroundColor: propertyConfirmed ? '#F57C00' : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: propertyConfirmed ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: propertyConfirmed ? '0 6px 20px rgba(245, 124, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: 'translateY(0px)'
                    }}
                    onMouseEnter={(e) => {
                      if (propertyConfirmed) {
                        e.currentTarget.style.backgroundColor = '#e67100';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 124, 0, 0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (propertyConfirmed) {
                        e.currentTarget.style.backgroundColor = '#F57C00';
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 124, 0, 0.25)';
                      }
                    }}
                  >
                    Next: Select Document Type →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Document Type & Data Prompts */}
            {currentStep === 2 && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📋 Choose Your Document
                </h2>
                <div style={{ 
                  backgroundColor: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  marginBottom: '1.5rem' 
                }}>
                  <p style={{ color: '#15803d', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    🎯 <strong>Perfect! Your property data is ready.</strong><br/>
                    Now choose the type of document you need. Each card shows what information is required and what we can pull automatically for you.
                  </p>
                </div>
                
                {/* Document Type Cards */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem' }}>
                    Select Document Type
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '1rem' 
                  }}>
                    {Object.entries(DOC_TYPES).map(([key, config]) => (
                      <div
                        key={key}
                        onClick={() => handleDocTypeChange(key)}
                                            style={{
                          padding: '1.5rem',
                          border: docType === key ? '2px solid #F57C00' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          backgroundColor: docType === key ? '#fff8f0' : 'white',
                          transition: 'all 0.2s ease',
                          boxShadow: docType === key ? '0 4px 12px rgba(245, 124, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          minHeight: '160px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => {
                          if (docType !== key) {
                            e.currentTarget.style.borderColor = '#F57C00';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (docType !== key) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }
                        }}
                                            >
                        <div>
                          <div style={{ 
                            fontSize: '1.125rem', 
                            fontWeight: 'bold', 
                            marginBottom: '0.5rem',
                            color: docType === key ? '#F57C00' : '#111827'
                          }}>
                            {config.label}
                          </div>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280',
                            marginBottom: '0.75rem'
                          }}>
                            {getDocumentDescription(key)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            Required: {config.required.length > 0 ? config.required.join(', ') : 'Basic property info'}
                          </div>
                        </div>
                        {docType === key && (
                          <div style={{ 
                            marginTop: '0.75rem',
                            padding: '0.5rem',
                            backgroundColor: '#F57C00',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            textAlign: 'center'
                          }}>
                            Selected ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Button Prompts */}
                {docType && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem' }}>
                      Quick Data Pulls
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      {DOC_TYPES[docType as keyof typeof DOC_TYPES].buttons.map((buttonType) => (
                        <button
                          key={buttonType}
                          onClick={() => handleButtonPrompt(buttonType)}
                          disabled={loading}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: loading ? 0.5 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          {buttonType === 'vesting' && 'Pull Vesting'}
                          {buttonType === 'grant_deed' && 'Pull Grant History'}
                          {buttonType === 'tax_roll' && 'Pull Tax Roll'}
                          {buttonType === 'chain_of_title' && 'Pull Chain of Title'}
                          {buttonType === 'all' && 'Pull All Data'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Prompt */}
                {docType && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Custom Request
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., 'pull chain of title'"
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '1rem'
                        }}
                      />
                      <button
                        onClick={handleCustomPrompt}
                        disabled={loading || !customPrompt.trim()}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          opacity: loading || !customPrompt.trim() ? 0.5 : 1
                        }}
                      >
                        Pull
                      </button>
                    </div>
                    {errors.custom && (
                      <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {errors.custom}
                      </p>
                    )}
                  </div>
                )}

                {/* Errors */}
                {errors.prompt && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem'
                  }}>
                    <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{errors.prompt}</p>
                  </div>
                )}

                {/* Continue Button */}
                {docType && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Continue to Review
                  </button>
                )}
                
                {/* Step 2 Navigation */}
                <div style={{ 
                  marginTop: '2rem',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{
                      padding: '20px 36px',
                      backgroundColor: 'white',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transform: 'translateY(0px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F57C00';
                      e.currentTarget.style.color = '#F57C00';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 124, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    ← Back to Address
                  </button>
                  <button
                    onClick={() => {
                      if (!docType) {
                        setErrors({docType: 'Please select a document type'});
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    disabled={!docType}
                    style={{
                      padding: '20px 36px',
                      backgroundColor: docType ? '#F57C00' : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: docType ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: docType ? '0 6px 20px rgba(245, 124, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: 'translateY(0px)'
                    }}
                    onMouseEnter={(e) => {
                      if (docType) {
                        e.currentTarget.style.backgroundColor = '#e67100';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 124, 0, 0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (docType) {
                        e.currentTarget.style.backgroundColor = '#F57C00';
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 124, 0, 0.25)';
                      }
                    }}
                  >
                    Next: Review & Generate →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Dynamic Fields & Review */}
            {currentStep === 3 && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  ✨ Almost Done!
                </h2>
                <div style={{ 
                  backgroundColor: '#fef3c7', 
                  border: '1px solid #fed7aa', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  marginBottom: '1.5rem' 
                }}>
                  <p style={{ color: '#92400e', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    🎉 <strong>Great choice!</strong> Review the information below and fill in any missing details. We've pre-filled what we found, but you can always make changes before generating your document.
                  </p>
                </div>
                
                {/* Dynamic Fields based on doc type */}
                {docType && DOC_TYPES[docType as keyof typeof DOC_TYPES].fields.map((field) => (
                  <div key={field} style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                      {field.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      name={field}
                      value={formData[field as keyof typeof formData] || ''}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                ))}

                {/* Chain of Title Display */}
                {formData.chainOfTitle && formData.chainOfTitle.length > 0 && (
                  <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                      📜 Chain of Title ({formData.chainOfTitle.length} transfers)
                    </h3>
                    
                    {/* Title Issues Alert */}
                    {formData.titleIssues && formData.titleIssues.length > 0 && (
                      <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                        <h4 style={{ color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>⚠️ Title Issues Found:</h4>
                        <ul style={{ color: '#92400e', fontSize: '0.875rem', listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                          {formData.titleIssues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Chain of Title Timeline */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {formData.chainOfTitle.map((transfer, index) => (
                        <div key={index} style={{
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderLeft: index === formData.chainOfTitle.length - 1 ? '4px solid #10b981' : '4px solid #6b7280'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {transfer.date || 'Unknown Date'}
                            </span>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.25rem 0.5rem', 
                              backgroundColor: index === formData.chainOfTitle.length - 1 ? '#d1fae5' : '#f3f4f6',
                              color: index === formData.chainOfTitle.length - 1 ? '#047857' : '#6b7280',
                              borderRadius: '0.25rem'
                            }}>
                              {transfer.deed_type || 'Unknown Deed Type'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            <div><strong>From:</strong> {transfer.grantor || 'Unknown'}</div>
                            <div><strong>To:</strong> {transfer.grantee || 'Unknown'}</div>
                            {transfer.consideration && (
                              <div><strong>Consideration:</strong> {transfer.consideration}</div>
                            )}
                            {transfer.document_number && (
                              <div><strong>Doc #:</strong> {transfer.document_number}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Ownership Duration Summary */}
                    {formData.ownershipDuration && formData.ownershipDuration.length > 0 && (
                      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <strong>Ownership Summary:</strong>
                        {formData.ownershipDuration.slice(-3).map((duration, index) => (
                          <div key={index} style={{ marginLeft: '1rem' }}>
                            • {duration.owner}: {duration.duration_years ? `${duration.duration_years} years` : 'Current owner'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Standard fields that all deeds need */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Grantor (Seller)
                  </label>
                  <input
                    type="text"
                    name="grantorName"
                    value={formData.grantorName || ''}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Grantee (Buyer)
                  </label>
                  <input
                    type="text"
                    name="granteeName"
                    value={formData.granteeName || ''}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                {errors.generate && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem'
                  }}>
                    <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{errors.generate}</p>
                  </div>
                )}

                {/* Step 3 Navigation */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    style={{
                      padding: '20px 36px',
                      backgroundColor: 'white',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transform: 'translateY(0px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F57C00';
                      e.currentTarget.style.color = '#F57C00';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 124, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    ← Back to Document Type
                  </button>
                </div>

                {/* Generate Button - Big Bubbly Style */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '24px 40px',
                    backgroundColor: loading ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    fontSize: '20px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: loading ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 8px 32px rgba(16, 185, 129, 0.3)',
                    transform: 'translateY(0px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.3)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: '3px solid transparent',
                        borderTop: '3px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span>Generating Document...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <span>Generate {DOC_TYPES[docType as keyof typeof DOC_TYPES]?.label}</span>
                    </>
                  )}
                </button>
              </div>
            )}


          {/* Loading Overlay */}
          {loading && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  border: '2px solid #f3f4f6',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}></div>
                <p style={{ color: '#6b7280' }}>Processing...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
