'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

// Tooltip Component for iPhone-like help text
const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.4',
          maxWidth: '250px',
          whiteSpace: 'normal',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          marginBottom: '8px'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}
    </div>
  );
};

// AI Suggestion Component
const AiSuggestion = ({ 
  fieldName, 
  fieldValue, 
  deedType, 
  onSuggestion 
}: { 
  fieldName: string, 
  fieldValue: string, 
  deedType: string, 
  onSuggestion: (suggestion: string) => void 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);

  const handleGetSuggestion = async () => {
    if (!fieldValue.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deed_type: deedType,
          field: fieldName,
          input: fieldValue
        })
      });
      
      const data = await response.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSuggestion = () => {
    onSuggestion(suggestion);
    setShowSuggestion(false);
    setSuggestion('');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleGetSuggestion}
        disabled={isLoading || !fieldValue.trim()}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: isLoading ? 'var(--gray-200)' : 'var(--accent)',
          color: isLoading ? 'var(--gray-500)' : 'var(--primary-dark)',
          border: 'none',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          zIndex: 10
        }}
      >
        {isLoading ? (
          <>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid var(--gray-400)',
              borderTop: '2px solid var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            AI...
          </>
        ) : (
          <>
            ✨ AI Help
          </>
        )}
      </button>
      
      {showSuggestion && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          borderRadius: '16px',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '12px',
            color: 'var(--primary)',
            fontWeight: '600'
          }}>
            <span>🤖</span>
            AI Suggestion:
          </div>
          <p style={{ margin: '0 0 12px 0', color: 'var(--gray-700)' }}>
            {suggestion}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleUseSuggestion}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Use This
            </button>
            <button
              onClick={() => setShowSuggestion(false)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--gray-600)',
                border: '1px solid var(--gray-300)',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CreateDeed() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    deedType: '',
    propertySearch: '',
    apn: '',
    county: '',
    legalDescription: '',
    ownerType: '',
    salesPrice: '',
    granteeName: '',
    vesting: ''
  });

  // Plan limits state
  const [userProfile, setUserProfile] = useState<{plan?: string} | null>(null);
  const [planLimitsError, setPlanLimitsError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deedUsageCount, setDeedUsageCount] = useState(0);

  const steps = [
    { 
      id: 1, 
      title: 'Deed Type', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>
    },
    { 
      id: 2, 
      title: 'Property Info', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    },
    { 
      id: 3, 
      title: 'Parties', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z"/></svg>
    },
    { 
      id: 4, 
      title: 'Details', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/></svg>
    },
    { 
      id: 5, 
      title: 'Review', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
    }
  ];

  const deedTypes = [
    {
      type: 'Quitclaim Deed',
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9H8L6,7M4,19H8L6,17M4,14H8L6,12"/></svg>,
      description: 'Transfer ownership without warranty. Quick and simple for family transfers.',
      popular: false
    },
    {
      type: 'Grant Deed',
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/><path d="M8,13V15H16V13H8M8,10V12H13V10H8Z"/></svg>,
      description: 'Standard ownership transfer with basic warranties. Most common type.',
      popular: true
    },
    {
      type: 'Warranty Deed',
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>,
      description: 'Full warranty protection for buyer. Maximum legal protection.',
      popular: false
    },
    {
      type: 'Trust Transfer Deed',
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M17,18V16H7V18H17M7,12V14H17V12H7M17,6V8H7V6H17Z"/></svg>,
      description: 'Transfer property to or from a trust. Estate planning purposes.',
      popular: false
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Plan limits checking
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const checkPlanLimits = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setPlanLimitsError('Please log in to create deeds');
        return false;
      }

      // For demo purposes, we'll check locally stored data
      // In production, this would call the backend check_plan_limits function
      if (userProfile?.plan === 'free' && deedUsageCount >= 5) {
        setPlanLimitsError('You have reached your monthly limit of 5 deeds. Upgrade to Professional for unlimited deeds.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check plan limits:', error);
      return true; // Allow on error
    }
  };

  const handleGenerateDeed = async () => {
    const canGenerate = await checkPlanLimits();
    if (!canGenerate) return;

    setIsGenerating(true);
    setPlanLimitsError('');

    try {
      // Simulate deed creation API call
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/deeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deed_type: formData.deedType,
          property_address: formData.propertySearch,
          apn: formData.apn,
          county: formData.county,
          legal_description: formData.legalDescription,
          owner_type: formData.ownerType,
          sales_price: parseFloat(formData.salesPrice) || 0,
          grantee_name: formData.granteeName,
          vesting: formData.vesting
        })
      });

      if (response.ok) {
        // Update usage count for free users
        if (userProfile?.plan === 'free') {
          setDeedUsageCount(prev => prev + 1);
        }
        alert('Deed generated successfully! 🎉');
        // Redirect to dashboard or deed view
      } else {
        const error = await response.json();
        if (error.detail?.includes('limit')) {
          setPlanLimitsError(error.detail);
        } else {
          alert('Failed to generate deed. Please try again.');
        }
      }
    } catch (error) {
      alert('Failed to generate deed. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const selectDeedType = (type: string) => {
    setFormData({ ...formData, deedType: type });
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="wizard-container">
          
          {/* Header */}
          <div className="wizard-header">
            <h1 className="wizard-title">Create Your Deed</h1>
            <p className="wizard-subtitle">Professional property transfer documents in minutes</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
              >
                <div className="progress-step-circle">
                  {currentStep > step.id ? 
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                    : step.icon}
                </div>
                <div className="progress-step-label">{step.title}</div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="form-steps">
            
            {/* Step 1: Deed Type Selection */}
            <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Select Your Deed Type</h2>
                <p className="step-description">
                  Choose the type of deed that best fits your transfer needs. Each type offers different levels of protection.
                </p>
                
                <div className="deed-type-grid">
                  {deedTypes.map((deed) => (
                    <Tooltip 
                      key={deed.type}
                      text={deed.type === 'Quitclaim Deed' 
                        ? 'Most common for family transfers, divorces, or adding/removing names from title. No warranties provided.' 
                        : deed.type === 'Grant Deed' 
                        ? 'Standard California deed with basic warranties. Grantor guarantees they own the property and haven\'t transferred it to anyone else.'
                        : deed.type === 'Warranty Deed'
                        ? 'Provides maximum protection with full warranties against any title defects, even from previous owners.'
                        : 'Used for estate planning to transfer property into or out of a trust. Maintains same tax basis.'}
                    >
                      <div
                        className={`deed-type-card ${formData.deedType === deed.type ? 'selected' : ''}`}
                        onClick={() => selectDeedType(deed.type)}
                      >
                        {deed.popular && (
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'var(--accent)',
                            color: 'var(--primary-dark)',
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            POPULAR
                          </div>
                        )}
                        <div className="deed-type-icon">{deed.icon}</div>
                        <h3 className="deed-type-title">{deed.type}</h3>
                        <p className="deed-type-description">{deed.description}</p>
                        <div style={{
                          position: 'absolute',
                          bottom: '1rem',
                          right: '1rem',
                          color: 'var(--gray-400)',
                          fontSize: '12px'
                        }}>
                          💡 Hover for details
                        </div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Property Information */}
            <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Property Information</h2>
                <p className="step-description">
                  Enter the property details to identify the real estate being transferred.
                </p>
                
                <div style={{ display: 'grid', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                  <div className="form-group">
                    <Tooltip text="Enter the complete street address including city, state, and ZIP code for accurate property identification.">
                      <label className="form-label">Property Address 💡</label>
                    </Tooltip>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="propertySearch"
                        className="form-control"
                        placeholder="123 Main Street, Los Angeles, CA 90210"
                        value={formData.propertySearch}
                        onChange={handleInputChange}
                        style={{ paddingRight: '100px' }}
                      />
                      <AiSuggestion
                        fieldName="property_address"
                        fieldValue={formData.propertySearch}
                        deedType={formData.deedType}
                        onSuggestion={(suggestion) => setFormData({...formData, propertySearch: suggestion})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">APN (Assessor Parcel Number)</label>
                    <input
                      type="text"
                      name="apn"
                      className="form-control"
                      placeholder="123-456-789"
                      value={formData.apn}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">County</label>
                    <select
                      name="county"
                      className="form-control"
                      value={formData.county}
                      onChange={handleInputChange}
                    >
                      <option value="">Select County</option>
                      <option value="Los Angeles">Los Angeles</option>
                      <option value="Orange">Orange</option>
                      <option value="San Diego">San Diego</option>
                      <option value="Riverside">Riverside</option>
                      <option value="San Bernardino">San Bernardino</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <Tooltip text="Legal description provides precise property boundaries. AI can help format based on your input or APN.">
                      <label className="form-label">Legal Description (Optional) 💡</label>
                    </Tooltip>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        name="legalDescription"
                        className="form-control"
                        rows={4}
                        placeholder="Enter detailed legal description if available..."
                        value={formData.legalDescription}
                        onChange={handleInputChange}
                        style={{ paddingRight: '100px' }}
                      />
                      <AiSuggestion
                        fieldName="legal_description"
                        fieldValue={formData.legalDescription || formData.apn}
                        deedType={formData.deedType}
                        onSuggestion={(suggestion) => setFormData({...formData, legalDescription: suggestion})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Parties */}
            <div className={`form-step ${currentStep === 3 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Parties Involved</h2>
                <p className="step-description">
                  Specify the grantor (seller) and grantee (buyer) information.
                </p>
                
                <div style={{ display: 'grid', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                  <div className="form-group">
                    <label className="form-label">Ownership Type</label>
                    <select
                      name="ownerType"
                      className="form-control"
                      value={formData.ownerType}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Ownership Type</option>
                      <option value="Individual">Individual</option>
                      <option value="Joint Tenants">Joint Tenants</option>
                      <option value="Tenants in Common">Tenants in Common</option>
                      <option value="Community Property">Community Property</option>
                      <option value="Trust">Trust</option>
                      <option value="Corporation">Corporation</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Grantee Name(s)</label>
                    <input
                      type="text"
                      name="granteeName"
                      className="form-control"
                      placeholder="Full legal name(s) of new owner(s)"
                      value={formData.granteeName}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Vesting</label>
                    <input
                      type="text"
                      name="vesting"
                      className="form-control"
                      placeholder="How title will be held (e.g., as joint tenants)"
                      value={formData.vesting}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Additional Details */}
            <div className={`form-step ${currentStep === 4 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Transfer Details</h2>
                <p className="step-description">
                  Additional information required for the deed preparation.
                </p>
                
                <div style={{ display: 'grid', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                  <div className="form-group">
                    <label className="form-label">Sales Price / Consideration</label>
                    <input
                      type="text"
                      name="salesPrice"
                      className="form-control"
                      placeholder="$0 for gift, or actual sales price"
                      value={formData.salesPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center'
                  }}>
                    <h4 style={{ color: 'var(--gray-700)', marginBottom: '1rem', fontSize: '1.25rem' }}>
                      📋 Document Preparation
                    </h4>
                    <p style={{ color: 'var(--gray-600)', fontSize: '1rem', margin: 0, lineHeight: '1.6' }}>
                      Your deed will be prepared by licensed professionals and ready for notarization and recording.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Review */}
            <div className={`form-step ${currentStep === 5 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Review & Confirm</h2>
                <p className="step-description">
                  Please review all information before generating your deed.
                </p>
                
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <div style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '12px',
                    padding: '2.5rem'
                  }}>
                    <div style={{ display: 'grid', gap: '1.5rem', fontSize: '1.125rem' }}>
                      <div><strong>Deed Type:</strong> {formData.deedType || 'Not selected'}</div>
                      <div><strong>Property:</strong> {formData.propertySearch || 'Not entered'}</div>
                      <div><strong>APN:</strong> {formData.apn || 'Not entered'}</div>
                      <div><strong>County:</strong> {formData.county || 'Not selected'}</div>
                      <div><strong>Grantee:</strong> {formData.granteeName || 'Not entered'}</div>
                      <div><strong>Consideration:</strong> {formData.salesPrice || 'Not entered'}</div>
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '2rem',
                    padding: '2rem',
                    background: 'var(--primary-dark)',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>🎉 Ready to Generate</h4>
                    <p style={{ margin: 0, opacity: 0.9, fontSize: '1.125rem', lineHeight: '1.6' }}>
                      Your professional deed document will be created and ready for download.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="wizard-navigation">
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              ← Previous
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)', fontSize: '1.125rem' }}>
              Step {currentStep} of {steps.length}
            </div>
            
            {currentStep < 5 ? (
              <button
                className="wizard-btn wizard-btn-primary"
                onClick={nextStep}
              >
                Next →
              </button>
            ) : (
              <div>
                {planLimitsError && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '1px solid #f87171',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    color: '#dc2626',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong>Plan Limit Reached:</strong> {planLimitsError}
                      <div style={{ marginTop: '0.5rem' }}>
                        <a 
                          href="/account-settings" 
                          style={{ 
                            color: '#dc2626', 
                            fontWeight: '600',
                            textDecoration: 'underline'
                          }}
                        >
                          Upgrade your plan →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                {userProfile?.plan === 'free' && (
                  <div style={{
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    border: '1px solid #60a5fa',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    color: '#1d4ed8',
                    fontSize: '0.85rem',
                    textAlign: 'center'
                  }}>
                    Free Plan: {deedUsageCount}/5 deeds used this month
                  </div>
                )}
                
                <button
                  className="wizard-btn wizard-btn-primary"
                  onClick={handleGenerateDeed}
                  disabled={isGenerating || !!planLimitsError}
                  style={{ 
                    opacity: isGenerating || planLimitsError ? 0.6 : 1,
                    cursor: isGenerating || planLimitsError ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isGenerating ? 'Generating...' : 'Generate Deed ✨'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 