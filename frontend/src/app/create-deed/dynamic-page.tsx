'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/Sidebar';

// Document types configuration
const DOC_TYPES = {
  grant_deed: {
    label: 'Grant Deed',
    fields: ['consideration'],
    buttons: ['vesting', 'grant_deed', 'tax_roll'],
    required: ['granteeName', 'consideration']
  },
  quit_claim: {
    label: 'Quitclaim Deed', 
    fields: [],
    buttons: ['vesting'],
    required: ['granteeName']
  },
  interspousal_transfer: {
    label: 'Interspousal Transfer',
    fields: ['spouse'],
    buttons: ['vesting'],
    required: ['spouse']
  },
  warranty_deed: {
    label: 'Warranty Deed',
    fields: ['covenants'],
    buttons: ['grant_deed'],
    required: ['granteeName', 'covenants']
  },
  tax_deed: {
    label: 'Tax Deed',
    fields: ['buyer'],
    buttons: ['tax_roll'],
    required: ['buyer']
  },
  property_profile: {
    label: 'Property Profile Report',
    fields: [],
    buttons: ['vesting', 'grant_deed', 'tax_roll'],
    required: []
  }
};

export default function CreateDeedDynamic() {
  const [currentStep, setCurrentStep] = useState(1);
  const [docType, setDocType] = useState('');
  const [verifiedData, setVerifiedData] = useState({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
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
    buyer: ''
  });
  const router = useRouter();

  // Handle property search completion
  const handlePropertyVerified = async (address: string) => {
    if (!address.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/property/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const result = await response.json();
      setVerifiedData(result);
      setFormData(prev => ({ ...prev, ...result, propertySearch: address }));
      setCurrentStep(2);
    } catch (error) {
      console.error('Property search failed:', error);
      setErrors({ property: 'Property search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
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
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: promptType,
          docType,
          verifiedData,
          currentData: formData
        })
      });

      const result = await response.json();
      
      if (result.error) {
        setErrors({ prompt: result.error });
        return;
      }

      setFormData(prev => ({ ...prev, ...result }));
      
      // Check for fast-forward
      if (checkFastForward(result)) {
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
          <div className="wizard-header">
            <h1 className="wizard-title">Create Your Document</h1>
            <p className="wizard-subtitle">Dynamic prompt-driven document generation</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container" style={{ marginBottom: '2rem' }}>
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
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: currentStep >= step ? '#3b82f6' : '#e5e7eb',
                      color: currentStep >= step ? 'white' : '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      zIndex: 10
                    }}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      style={{
                        height: '2px',
                        flex: 1,
                        backgroundColor: currentStep > step ? '#3b82f6' : '#e5e7eb',
                        marginLeft: '8px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="progress-labels" style={{ display: 'flex', marginTop: '8px' }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Address</div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Doc Type & Data</div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Review</div>
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Address Verification */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                  Property Address
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  Enter the property address to begin document creation
                </p>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    value={formData.propertySearch}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertySearch: e.target.value }))}
                    placeholder="Enter property address..."
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePropertyVerified(formData.propertySearch);
                      }
                    }}
                  />
                  <button
                    onClick={() => handlePropertyVerified(formData.propertySearch)}
                    disabled={loading || !formData.propertySearch.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: loading || !formData.propertySearch.trim() ? 0.5 : 1
                    }}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {errors.property && (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {errors.property}
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 2: Document Type & Data Prompts */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                  Document Type & Data
                </h2>
                
                {/* Document Type Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select document type...</option>
                    {Object.entries(DOC_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
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
              </motion.div>
            )}

            {/* Step 3: Dynamic Fields & Review */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  marginBottom: '2rem'
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                  Review & Generate
                </h2>
                
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

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Generating...' : `Generate ${DOC_TYPES[docType as keyof typeof DOC_TYPES]?.label}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
