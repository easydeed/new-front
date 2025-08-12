'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import PreviewDataDebugger from '../../components/PreviewDataDebugger';
import DeedPreviewPanel from '../../components/DeedPreviewPanel';
import WizardFlowManager from '../../components/WizardFlowManager';
import PropertySearch from '../../components/PropertySearch';
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
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.4',
          maxWidth: '420px',
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
  const [hasAccess, setHasAccess] = useState(false);
  const [needsWidgetAddon, setNeedsWidgetAddon] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    deedType: '',
    propertySearch: '',
    apn: '',
    county: '',
    city: '',
    state: '',
    zip: '',
    fullAddress: '',
    fips: '',
    propertyId: '',
    legalDescription: '',
    ownerType: '',
    salesPrice: '',
    granteeName: '',
    vesting: '',
    grantorName: '',
    deedDate: '',
    documentaryTax: '',
    taxComputedFullValue: true,
    taxComputedLessLiens: false,
    isUnincorporated: false,
    taxCityName: '',
    recordingRequestedBy: '',
    mailTo: '',
    orderNo: '',
    escrowNo: '',
    notaryCounty: '',
    notaryDate: '',
    notaryName: '',
    appearedBeforeNotary: '',
    grantorSignature: ''
  });

  // Plan limits state
  const [userProfile, setUserProfile] = useState<{plan?: string} | null>(null);
  const [planLimitsError, setPlanLimitsError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deedUsageCount, setDeedUsageCount] = useState(0);

  // Preview state for Step 5 enhancement
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  // AI Enhancement State
  const [aiSuggestions, setAiSuggestions] = useState<any>({});
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [validation, setValidation] = useState<any>({});
  const [enhancedProfile, setEnhancedProfile] = useState<any>(null);
  
  // Debug state for preview data mapper
  const [debugData, setDebugData] = useState<{
    templateData: any;
    validation: any;
  } | null>(null);
  
  // Wizard flow state
  const [wizardValidation, setWizardValidation] = useState<{
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  }>({ isValid: false, missingFields: [], warnings: [] });
  
  const [previewMode, setPreviewMode] = useState(false);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAITips, setShowAITips] = useState(true);
  const [propertySuggestions, setPropertySuggestions] = useState<any[]>([]);

  // Helpers for Review section
  const formatCurrency = (val?: string) => {
    if (!val) return '—';
    const n = parseFloat(val);
    return isNaN(n) ? val : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };
  const display = (val?: string) => (val && String(val).trim().length ? val : '—');

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
      popular: false
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
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Get property suggestions when address changes
    if (name === 'propertySearch') {
      getPropertySuggestions(value);
    }

    // Auto-apply AI suggestions for empty fields
    if (aiSuggestions[name] && !value.trim()) {
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          [name]: aiSuggestions[name]
        }));
      }, 500);
    }

    // Cache property data when user moves to next step
    if (name === 'legalDescription' && formData.propertySearch) {
      cachePropertyData();
    }
  };

  // Plan limits checking
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/profile`, {
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
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please log in to generate deed');
        return;
      }

      // Use the same data mapper as preview generation for consistency
      const { createPreviewPayload } = await import('../../utils/deedDataMapper');
      const deedData = createPreviewPayload(formData, aiSuggestions);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/generate-deed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(deedData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update usage count for free users
        if (userProfile?.plan === 'free') {
          setDeedUsageCount(prev => prev + 1);
        }

        // Handle the PDF download
        if (result.pdf_base64) {
          // Convert base64 to blob and download
          const pdfBlob = new Blob([Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${formData.deedType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // TODO: Save deed to database with status 'completed'
          // This will be implemented when backend /deeds POST endpoint is ready
          
          alert('Deed PDF generated and downloaded successfully! 🎉\n\nRedirecting to your past deeds...');
          
          // Clear the form data after successful generation
          localStorage.removeItem('deedWizardDraft');
          
          // Redirect to past deeds to show the completed deed
          setTimeout(() => {
            router.push('/past-deeds');
          }, 2000);
        } else {
          alert('Deed generated but PDF download failed. Please try again.');
        }
      } else {
        const error = await response.json();
        if (error.detail?.includes('limit')) {
          setPlanLimitsError(error.detail);
        } else {
          alert(`Failed to generate deed: ${error.detail || 'Please try again.'}`);
        }
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate deed. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI-Enhanced Preview functionality for Step 5
  const handlePreviewDeed = async () => {
    setIsLoadingPreview(true);
    setPreviewHtml('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please log in to generate preview');
        return;
      }

      // Import the data mapper (dynamic import to avoid build issues)
      const { createPreviewPayload, validatePreviewData } = await import('../../utils/deedDataMapper');
      
      // Validate data before sending
      const validation = validatePreviewData(formData);
      if (!validation.isValid) {
        alert(`Please complete the following required fields:\n${validation.missingFields.join('\n')}`);
        setIsLoadingPreview(false);
        return;
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Preview generation warnings:', validation.warnings);
      }

      // Convert formData to format expected by backend using the improved mapper
      const deedData = createPreviewPayload(formData, aiSuggestions);
      
      // Set debug data for debugger component
      setDebugData({
        templateData: deedData.data,
        validation: validation
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/generate-deed-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(deedData)
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewHtml(result.html);
        setShowPreview(true);
        
        // Update AI suggestions and validation from preview response
        if (result.ai_suggestions) {
          setAiSuggestions(prev => ({ ...prev, ...result.ai_suggestions }));
        }
        if (result.validation) {
          setValidation(result.validation);
        }
        
        // Cache the property data for future use
        if (formData.propertySearch) {
          cachePropertyData();
        }
        
        // Show success tip
        if (result.user_profile_applied) {
          setAiTips(prev => [...prev, "✅ Your profile settings were applied to optimize the deed format!"]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to generate preview: ${errorData.detail || 'Please check your data and try again.'}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to generate preview. Please check your connection.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerateFinalDeed = async () => {
    if (needsWidgetAddon) {
      alert('Upgrade required: Enable the Widget Add-on in Account Settings to generate the final PDF.');
      router.push('/account-settings?upgrade=widget');
      return;
    }
    await handleGenerateDeed();
  };

  const handlePropertySearch = async () => {
    if (!formData.propertySearch.trim()) {
      setAddressError('Please enter an address to search');
      return;
    }
    setAddressError('');
    setIsSearchingAddress(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const response = await fetch(`${baseUrl}/property/search?address=${encodeURIComponent(formData.propertySearch)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const result = await response.json();
      // Best-effort mapping based on backend
      const data = (result && (result.data || result.property || result)) || {};
      setFormData(prev => ({
        ...prev,
        apn: data.apn || prev.apn,
        county: data.county || prev.county,
        city: data.city || prev.city,
        state: data.state || prev.state,
        zip: data.zip || prev.zip,
        fullAddress: data.full_address || data.fullAddress || prev.fullAddress,
        fips: data.fips || prev.fips,
        propertyId: data.property_id || data.id || prev.propertyId,
        legalDescription: data.legal_description || prev.legalDescription
      }));
    } catch (e) {
      setAddressError('Could not find that address. Please refine and try again.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Enhanced preview mode functions for seamless editing
  const handleEnterPreviewMode = async () => {
    if (wizardValidation.isValid) {
      setPreviewMode(true);
      await handlePreviewDeed();
    } else {
      alert(`Please complete the following required fields:\n${wizardValidation.missingFields.join('\n')}`);
    }
  };

  const handleExitPreviewMode = () => {
    setPreviewMode(false);
    setShowPreview(false);
  };

  const handleAutoSave = () => {
    // Auto-save is handled by the existing useEffect
    setSavedAt(new Date().toLocaleTimeString());
  };

  // Cancel deed creation and clear all data
  const handleCancelDeed = () => {
    const shouldCancel = window.confirm(
      "Are you sure you want to cancel? All progress will be lost and cannot be recovered."
    );
    
    if (shouldCancel) {
      // Clear all form data
      setFormData({
        deedType: '',
        propertySearch: '',
        apn: '',
        county: '',
        city: '',
        state: '',
        zip: '',
        fullAddress: '',
        fips: '',
        propertyId: '',
        legalDescription: '',
        ownerType: '',
        salesPrice: '',
        granteeName: '',
        vesting: '',
        grantorName: '',
        deedDate: '',
        documentaryTax: '',
        taxComputedFullValue: true,
        taxComputedLessLiens: false,
        isUnincorporated: false,
        taxCityName: '',
        recordingRequestedBy: '',
        mailTo: '',
        orderNo: '',
        escrowNo: '',
        notaryCounty: '',
        notaryDate: '',
        notaryName: '',
        appearedBeforeNotary: '',
        grantorSignature: ''
      });
      
      // Reset wizard state
      setCurrentStep(1);
      setShowPreview(false);
      setPreviewMode(false);
      setPreviewHtml('');
      
      // Clear saved draft
      try {
        localStorage.removeItem('deedWizardDraft');
      } catch (error) {
        console.error('Failed to clear draft:', error);
      }
      
      // Reset validation and AI state
      setWizardValidation({ isValid: false, missingFields: [], warnings: [] });
      setAiSuggestions({});
      setDebugData(null);
      setSavedAt(null);
    }
  };

  useEffect(() => {
    // Check widget access first
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/check-widget-access`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          setHasAccess(true);
          setNeedsWidgetAddon(false);
          fetchUserProfile();
        } else if (response.status === 403) {
          // Allow preview access but indicate upgrade needed for final PDF
          setHasAccess(true);
          setNeedsWidgetAddon(true);
          fetchUserProfile();
        } else {
          // Fail-open to avoid blocking
          setHasAccess(true);
          setNeedsWidgetAddon(false);
          fetchUserProfile();
        }
      } catch (error) {
        console.error('Access check failed:', error);
        // Fail-open to allow preview
        setHasAccess(true);
        setNeedsWidgetAddon(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const selectDeedType = (type: string) => {
    // Set deed type and immediately advance to Step 2 (Property Info)
    setFormData(prev => ({ ...prev, deedType: type }));
    setCurrentStep(2);
    // Focus the property search field for a smooth handoff to Step 2
    setTimeout(() => {
      try {
        const el = document.querySelector<HTMLInputElement>('input[name="propertySearch"]');
        el?.focus();
      } catch {}
    }, 0);
  };

  // Draft: load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('deedWizardDraft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (parsed?.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed?.showPreview) setShowPreview(!!parsed.showPreview);
      }
    } catch {}
  }, []);

  // Real-time validation for wizard efficiency
  useEffect(() => {
    const validateData = async () => {
      try {
        const { validatePreviewData } = await import('../../utils/deedDataMapper');
        const validation = validatePreviewData(formData);
        setWizardValidation(validation);
      } catch (error) {
        console.error('Validation error:', error);
      }
    };

    validateData();
  }, [formData]);

  // Draft: debounce save on changes
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          'deedWizardDraft',
          JSON.stringify({ formData, currentStep, showPreview, previewMode })
        );
        const ts = new Date().toLocaleTimeString();
        setSavedAt(ts);
      } catch {}
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData, currentStep, showPreview, previewMode]);

  // AI Enhancement: Load user profile and get initial suggestions
  useEffect(() => {
    const loadEnhancedProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/profile/enhanced`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEnhancedProfile(data);
          
          // If user has profile data, get initial AI suggestions
          if (data.profile) {
            await getAISuggestions();
          }
        }
      } catch (error) {
        console.error('Failed to load enhanced profile:', error);
      }
    };

    if (hasAccess) {
      loadEnhancedProfile();
    }
  }, [hasAccess]);

  // AI Enhancement: Get suggestions when form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.deedType || formData.propertySearch) {
        getAISuggestions();
      }
    }, 1000); // Debounce AI suggestions

    return () => clearTimeout(timer);
  }, [formData.deedType, formData.propertySearch, formData.grantorName, formData.granteeName]);

  // AI Suggestions Function
  const getAISuggestions = async () => {
    try {
      setIsLoadingAI(true);
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/ai/deed-suggestions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || {});
        setValidation(data.validation || {});
        setAiTips(data.suggestions?.ai_tips || []);
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Property Search with AI Enhancement
  const getPropertySuggestions = async (address: string) => {
    if (!address || address.length < 3) {
      setPropertySuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/property/suggestions?address=${encodeURIComponent(address)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPropertySuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get property suggestions:', error);
    }
  };

  // Handle Google Places selection with full integration
  const handleGooglePlacesSelect = async (propertyData: any) => {
    try {
      setIsSearchingAddress(true);
      setAddressError('');
      
      // Update form with Google Places data
      setFormData(prev => ({
        ...prev,
        propertySearch: propertyData.fullAddress,
        city: propertyData.city || '',
        state: propertyData.state || 'CA',
        zip: propertyData.zip || '',
        neighborhood: propertyData.neighborhood || ''
      }));

      const token = localStorage.getItem('access_token');
      if (!token) return;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      
      // Step 1: Validate with Google Places
      const validateResponse = await fetch(`${baseUrl}/api/property/validate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyData)
      });
      
      if (validateResponse.ok) {
        const validatedData = await validateResponse.json();
        
        // Step 2: Enrich with SiteX and TitlePoint
        const enrichResponse = await fetch(`${baseUrl}/api/property/enrich`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address: propertyData.street || propertyData.fullAddress,
            city: propertyData.city,
            state: propertyData.state || 'CA',
            county: validatedData.data.county,
            apn: validatedData.data.apn
          })
        });
        
        if (enrichResponse.ok) {
          const enrichedData = await enrichResponse.json();
          
          // Update form with all enriched data
          setFormData(prev => ({
            ...prev,
            propertySearch: enrichedData.data.formatted_address || validatedData.data.formatted_address || propertyData.fullAddress,
            apn: enrichedData.data.apn || validatedData.data.apn || '',
            county: enrichedData.data.county || enrichedData.data.county_name || validatedData.data.county || '',
            legalDescription: enrichedData.data.legal_description || '',
            grantorName: enrichedData.data.primary_owner || '',
            vesting: enrichedData.data.vesting_details || '',
            city: enrichedData.data.city || propertyData.city || '',
            state: enrichedData.data.state || propertyData.state || 'CA',
            zip: enrichedData.data.zip_code || propertyData.zip || ''
          }));
          
          // Show success message
          setPropertySuggestions([{
            type: 'success',
            message: '✅ Property data successfully enriched with real estate information',
            confidence: enrichedData.confidence || 0.9,
            property: {
              property_address: enrichedData.data.formatted_address || validatedData.data.formatted_address || propertyData.fullAddress,
              legal_description: enrichedData.data.legal_description,
              apn: enrichedData.data.apn,
              county: enrichedData.data.county || enrichedData.data.county_name
            }
          }]);
          
          // Auto-dismiss success message after 5 seconds
          setTimeout(() => setPropertySuggestions([]), 5000);
          
        } else {
          // Use validated data only
          setFormData(prev => ({
            ...prev,
            propertySearch: validatedData.data.formatted_address || propertyData.fullAddress,
            apn: validatedData.data.apn || '',
            county: validatedData.data.county || '',
            city: validatedData.data.city || propertyData.city || '',
            state: validatedData.data.state || propertyData.state || 'CA',
            zip: validatedData.data.zip_code || propertyData.zip || ''
          }));
          
          setPropertySuggestions([{
            type: 'partial',
            message: '🔍 Address validated. Some property data may need manual entry.',
            confidence: validatedData.confidence || 0.8,
            property: {
              property_address: validatedData.data.formatted_address || propertyData.fullAddress,
              legal_description: null,
              apn: validatedData.data.apn,
              county: validatedData.data.county
            }
          }]);
          
          // Auto-dismiss partial message after 4 seconds
          setTimeout(() => setPropertySuggestions([]), 4000);
        }
      }
      
    } catch (error) {
      console.error('Property selection error:', error);
      setAddressError('Failed to process property data. Please try manual entry.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Cache property data when user fills in details
  const cachePropertyData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token || !formData.propertySearch) return;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/property/cache`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_address: formData.propertySearch,
          legal_description: formData.legalDescription,
          apn: formData.apn,
          county: formData.county,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip
        })
      });
    } catch (error) {
      console.error('Failed to cache property data:', error);
    }
  };

  const estimatedMinutesLeft = Math.max(0, 5 - currentStep);

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="wizard-container">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f4f6',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>Checking access...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="wizard-container">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔒</div>
              <h2 style={{ color: '#111827', marginBottom: '1rem' }}>Widget Access Required</h2>
              <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem' }}>
                Upgrade for access to the deed creation widget.
              </p>
              <button
                onClick={() => router.push('/account-settings?upgrade=widget')}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Upgrade Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
          <div className="wizard-container">
            {/* Header */}
            <div className="wizard-header" style={{ position: 'relative' }}>
              <h1 className="wizard-title">Create Your Deed</h1>
              <p className="wizard-subtitle">Professional property transfer documents in minutes</p>
              {savedAt && (
                <div style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                  Saved {savedAt}
                </div>
              )}
              {needsWidgetAddon && (
                <div style={{
                  marginTop: '0.75rem',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-soft)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.9rem'
                }}>
                  Preview is available on your plan. Upgrade the Widget Add-on to generate the final PDF.
                </div>
              )}

              {/* Enhanced Wizard Flow Manager */}
              {/* Progress bar should appear only after deed type is chosen (Step 1 completed) */}
              {!previewMode && formData.deedType && (
                <WizardFlowManager
                  currentStep={Math.max(currentStep, 2)}
                  totalSteps={steps.length}
                  onStepChange={setCurrentStep}
                  formData={formData}
                  validation={wizardValidation}
                  onAutoSave={handleAutoSave}
                  onCancel={handleCancelDeed}
                  lastSaved={savedAt}
                />
              )}
              
              {/* AI Tips Section */}
              {aiTips.length > 0 && showAITips && (
                <div style={{
                  marginTop: '1rem',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '16px',
                  position: 'relative'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '8px',
                    color: 'var(--primary-dark)',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}>
                    <span>✨</span>
                    AI Assistant {isLoadingAI && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid var(--primary-dark)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginLeft: '4px'
                      }} />
                    )}
                  </div>
                  {aiTips.map((tip, index) => (
                    <div key={index} style={{ 
                      fontSize: '0.9rem', 
                      color: 'var(--gray-700)', 
                      marginBottom: index < aiTips.length - 1 ? '6px' : '0'
                    }}>
                      {tip}
                    </div>
                  ))}
                  <button
                    onClick={() => setShowAITips(false)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--gray-500)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      lineHeight: '1'
                    }}
                  >
                    ×
                  </button>
                  {enhancedProfile?.profile && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--primary-dark)'
                    }}>
                      💼 Using your profile: {enhancedProfile.profile.company_name || 'Individual'} • {enhancedProfile.profile.role || 'User'}
                    </div>
                  )}
                </div>
              )}
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
                    <div
                      key={deed.type}
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
                    </div>
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
                
                <div className="form-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                  <div className="form-group col-span-2">
                    <Tooltip text="Start typing a property address and select from Google Places suggestions. The system will automatically validate and enrich the property data using SiteX and TitlePoint.">
                      <label className="form-label">Property Address 🌐✨</label>
                    </Tooltip>
                    <PropertySearch
                      onSelect={handleGooglePlacesSelect}
                      onError={(error) => setAddressError(error)}
                      placeholder="Start typing property address..."
                      value={formData.propertySearch}
                      className="w-full"
                    />
                    {addressError && (
                      <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.95rem' }}>{addressError}</div>
                    )}
                    
                    {/* AI Suggestion for manual entry */}
                    <div style={{ marginTop: '8px' }}>
                      <AiSuggestion
                        fieldName="property_address"
                        fieldValue={formData.propertySearch}
                        deedType={formData.deedType}
                        onSuggestion={(suggestion) => setFormData({...formData, propertySearch: suggestion})}
                      />
                    </div>
                    
                    {/* Property Suggestions Dropdown */}
                    {propertySuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}>
                        {propertySuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              // Handle clickable property suggestions
                              if (suggestion.property && suggestion.type !== 'success' && suggestion.type !== 'partial') {
                                const property = suggestion.property;
                                setFormData(prev => ({
                                  ...prev,
                                  propertySearch: property.property_address,
                                  legalDescription: property.legal_description || prev.legalDescription,
                                  apn: property.apn || prev.apn,
                                  county: property.county || prev.county,
                                  city: property.city || prev.city
                                }));
                                setPropertySuggestions([]);
                              } else {
                                // For status messages, just dismiss after a moment
                                setTimeout(() => setPropertySuggestions([]), 3000);
                              }
                            }}
                            style={{
                              padding: '12px 16px',
                              borderBottom: index < propertySuggestions.length - 1 ? '1px solid var(--gray-200)' : 'none',
                              cursor: suggestion.type === 'success' || suggestion.type === 'partial' ? 'default' : 'pointer',
                              transition: 'all 0.2s ease',
                              backgroundColor: suggestion.type === 'success' ? '#f0f9ff' : suggestion.type === 'partial' ? '#fffbf0' : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (suggestion.type !== 'success' && suggestion.type !== 'partial') {
                                e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (suggestion.type !== 'success' && suggestion.type !== 'partial') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {/* Status messages */}
                            {(suggestion.type === 'success' || suggestion.type === 'partial') ? (
                              <div style={{ 
                                color: suggestion.type === 'success' ? '#059669' : '#d97706',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                              }}>
                                {suggestion.message}
                                {suggestion.confidence && (
                                  <span style={{ 
                                    marginLeft: '8px',
                                    fontSize: '0.8rem',
                                    opacity: 0.8
                                  }}>
                                    ({Math.round(suggestion.confidence * 100)}% confidence)
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Property suggestions */
                              <>
                                <div style={{ 
                                  fontWeight: '600', 
                                  color: 'var(--gray-900)',
                                  fontSize: '0.9rem',
                                  marginBottom: '4px'
                                }}>
                                  📋 {suggestion.type === 'cached_exact' ? 'Previously Used' : 'Recent Property'}
                                </div>
                                <div style={{ 
                                  color: 'var(--gray-700)',
                                  fontSize: '0.85rem'
                                }}>
                                  {suggestion.property?.property_address || 'Address not available'}
                                </div>
                                {suggestion.property?.legal_description && (
                                  <div style={{ 
                                    color: 'var(--gray-500)',
                                    fontSize: '0.8rem',
                                    marginTop: '2px',
                                    maxWidth: '300px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {suggestion.property.legal_description}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
                  
                  <div className="form-group col-span-2">
                    <Tooltip text="Legal description provides precise property boundaries. AI can help format based on your input or APN.">
                      <label className="form-label">Legal Description (Optional) 💡</label>
                    </Tooltip>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        name="legalDescription"
                        className="form-control"
                        rows={5}
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

            {/* Step 3: Parties & Recording Info */}
            <div className={`form-step ${currentStep === 3 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Parties & Recording Info</h2>
                <p className="step-description">Who is transferring to whom, and how should recording be set up?</p>

                <div className="form-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                  <div className="form-group col-span-2">
                    <label className="form-label">
                      Recording Requested By 
                      {aiSuggestions.recordingRequestedBy && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '0.8rem', 
                          color: 'var(--accent)', 
                          fontWeight: 'normal' 
                        }}>
                          ✨ AI suggested
                        </span>
                      )}
                    </label>
                    <input 
                      name="recordingRequestedBy" 
                      className="form-control" 
                      placeholder={aiSuggestions.recordingRequestedBy || "Your company or name"}
                      value={formData.recordingRequestedBy} 
                      onChange={handleInputChange}
                      style={{
                        borderColor: aiSuggestions.recordingRequestedBy && !formData.recordingRequestedBy ? 'var(--accent)' : undefined,
                        backgroundColor: aiSuggestions.recordingRequestedBy && !formData.recordingRequestedBy ? 'var(--accent-soft)' : undefined
                      }}
                    />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">
                      Mail Tax Statements / When Recorded Mail To
                      {aiSuggestions.mailTo && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '0.8rem', 
                          color: 'var(--accent)', 
                          fontWeight: 'normal' 
                        }}>
                          ✨ AI suggested
                        </span>
                      )}
                    </label>
                    <input 
                      name="mailTo" 
                      className="form-control" 
                      placeholder={aiSuggestions.mailTo || "Recipient full address"}
                      value={formData.mailTo} 
                      onChange={handleInputChange}
                      style={{
                        borderColor: aiSuggestions.mailTo && !formData.mailTo ? 'var(--accent)' : undefined,
                        backgroundColor: aiSuggestions.mailTo && !formData.mailTo ? 'var(--accent-soft)' : undefined
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order No.</label>
                    <input name="orderNo" className="form-control" placeholder="Order Number" value={formData.orderNo} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Escrow No.</label>
                    <input name="escrowNo" className="form-control" placeholder="Escrow Number" value={formData.escrowNo} onChange={handleInputChange} />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">Grantor (Seller)</label>
                    <input name="grantorName" className="form-control" placeholder="Current owner(s) full legal name(s)" value={formData.grantorName} onChange={handleInputChange} />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">Grantee (Buyer)</label>
                    <input name="granteeName" className="form-control" placeholder="New owner(s) full legal name(s)" value={formData.granteeName} onChange={handleInputChange} />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">Vesting</label>
                    <input name="vesting" className="form-control" placeholder="How title will be held (e.g., Joint Tenants)" value={formData.vesting} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deed Date</label>
                    <input type="date" name="deedDate" className="form-control" value={formData.deedDate} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ownership Type (optional)</label>
                    <select name="ownerType" className="form-control" value={formData.ownerType} onChange={handleInputChange}>
                      <option value="">Select Ownership Type</option>
                      <option value="Individual">Individual</option>
                      <option value="Joint Tenants">Joint Tenants</option>
                      <option value="Tenants in Common">Tenants in Common</option>
                      <option value="Community Property">Community Property</option>
                      <option value="Trust">Trust</option>
                      <option value="Corporation">Corporation</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Transfer Tax & Consideration */}
            <div className={`form-step ${currentStep === 4 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title">Transfer Tax & Consideration</h2>
                <p className="step-description">Tax basis and location details for the deed.</p>
                
                <div className="form-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                  <div className="form-group">
                    <label className="form-label">Documentary Transfer Tax ($)</label>
                    <input name="documentaryTax" className="form-control" placeholder="e.g., 0.00" value={formData.documentaryTax} onChange={handleInputChange} />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">Tax Computation</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={!!formData.taxComputedFullValue} onChange={(e) => setFormData(prev => ({ ...prev, taxComputedFullValue: e.target.checked }))} />
                        Computed on full value of property conveyed
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={!!formData.taxComputedLessLiens} onChange={(e) => setFormData(prev => ({ ...prev, taxComputedLessLiens: e.target.checked }))} />
                        Computed on full value less liens and encumbrances remaining at time of sale
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unincorporated Area</label>
                    <div>
                      <input type="checkbox" checked={!!formData.isUnincorporated} onChange={(e) => setFormData(prev => ({ ...prev, isUnincorporated: e.target.checked }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City (if incorporated)</label>
                    <input name="taxCityName" className="form-control" placeholder="City name" value={formData.taxCityName} onChange={handleInputChange} />
                  </div>
                  <div style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center'
                  }} className="col-span-2">
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

            {/* Step 5: Review & Preview (inputs removed) */}
            <div className={`form-step ${currentStep === 5 ? 'active' : ''}`}>
              <div className="step-content">
                <h2 className="step-title" style={{ color: '#111827' }}>Review & Preview</h2>
                <p className="step-description" style={{ color: '#565F64' }}>
                  Review your information and preview the exact deed format before generating.
                </p>
                
                {/* Beautiful, wide review summary */}
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                  {/* Header card */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--secondary-light)',
                    borderRadius: '14px',
                    padding: '1.5rem 2rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent)' }} />
                        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.25rem', fontWeight: 700 }}>Review Your Information</h3>
                      </div>
                      <div style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>
                        Ensure everything looks correct before previewing the deed
                      </div>
                    </div>
                  </div>

                  {/* Sections grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Property Section */}
                    <div style={{ background: '#FFFFFF', border: '1px solid var(--secondary-light)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>🏠 Property</h4>
                        <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ padding: '0.4rem 0.9rem' }}>Edit</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', color: 'var(--gray-700)' }}>
                        <div><strong>Address:</strong> {display(formData.propertySearch)}</div>
                        <div><strong>APN:</strong> {display(formData.apn)}</div>
                        <div><strong>County:</strong> {display(formData.county)}</div>
                        <div><strong>City/State/ZIP:</strong> {display([formData.city, formData.state, formData.zip].filter(Boolean).join(', '))}</div>
                        <div className="col-span-2" style={{ gridColumn: 'span 2' }}><strong>Legal Description:</strong> {display(formData.legalDescription)}</div>
                      </div>
                    </div>

                    {/* Parties & Recording */}
                    <div style={{ background: '#FFFFFF', border: '1px solid var(--secondary-light)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>👥 Parties & Recording</h4>
                        <button onClick={() => setCurrentStep(3)} className="btn-secondary" style={{ padding: '0.4rem 0.9rem' }}>Edit</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', color: 'var(--gray-700)' }}>
                        <div><strong>Grantor:</strong> {display(formData.grantorName)}</div>
                        <div><strong>Grantee:</strong> {display(formData.granteeName)}</div>
                        <div><strong>Vesting:</strong> {display(formData.vesting)}</div>
                        <div><strong>Deed Date:</strong> {display(formData.deedDate)}</div>
                        <div className="col-span-2" style={{ gridColumn: 'span 2' }}><strong>Recording Requested By:</strong> {display(formData.recordingRequestedBy)}</div>
                        <div className="col-span-2" style={{ gridColumn: 'span 2' }}><strong>Mail To:</strong> {display(formData.mailTo)}</div>
                        <div><strong>Order No.:</strong> {display(formData.orderNo)}</div>
                        <div><strong>Escrow No.:</strong> {display(formData.escrowNo)}</div>
                      </div>
                    </div>

                    {/* Consideration & Tax */}
                    <div style={{ background: '#FFFFFF', border: '1px solid var(--secondary-light)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>🧾 Consideration & Tax</h4>
                        <button onClick={() => setCurrentStep(4)} className="btn-secondary" style={{ padding: '0.4rem 0.9rem' }}>Edit</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', color: 'var(--gray-700)' }}>
                        <div><strong>Sales Price:</strong> {formatCurrency(formData.salesPrice)}</div>
                        <div><strong>Transfer Tax:</strong> {formatCurrency(formData.documentaryTax)}</div>
                        <div><strong>Tax Basis:</strong> {formData.taxComputedFullValue ? '✓ Full Value' : formData.taxComputedLessLiens ? '✓ Less Liens' : '—'}</div>
                        <div><strong>Unincorporated:</strong> {formData.isUnincorporated ? '✓ Yes' : '—'}</div>
                        <div className="col-span-2" style={{ gridColumn: 'span 2' }}><strong>City (if incorporated):</strong> {display(formData.taxCityName)}</div>
                      </div>
                    </div>

                    {/* Notary (only if provided earlier) */}
                    {(formData.notaryCounty || formData.notaryDate || formData.notaryName || formData.appearedBeforeNotary || formData.grantorSignature) && (
                      <div style={{ background: '#FFFFFF', border: '1px solid var(--secondary-light)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h4 style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>🖋️ Notary</h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', color: 'var(--gray-700)' }}>
                          <div><strong>County:</strong> {display(formData.notaryCounty)}</div>
                          <div><strong>Date:</strong> {display(formData.notaryDate)}</div>
                          <div><strong>Notary Name:</strong> {display(formData.notaryName)}</div>
                          <div><strong>Appeared Before:</strong> {display(formData.appearedBeforeNotary)}</div>
                          <div className="col-span-2" style={{ gridColumn: 'span 2' }}><strong>Grantor Signature:</strong> {display(formData.grantorSignature)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Preview Panel */}
                  <DeedPreviewPanel
                    previewHtml={previewHtml}
                    isLoading={isLoadingPreview}
                    onRegeneratePreview={handlePreviewDeed}
                    onEditMode={handleExitPreviewMode}
                    onGenerateFinalDeed={handleGenerateDeed}
                    isGenerating={isGenerating}
                    deedType={formData.deedType || 'Deed'}
                    validation={wizardValidation}
                  />
                  
                  {/* Ready to Generate Section */}
                  {!showPreview && (
                    <div style={{
                      padding: '2rem',
                      background: '#FFFFFF',
                      border: '1px solid var(--secondary-light)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      textAlign: 'center'
                    }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
                        📋 Complete Your Review
                      </h4>
                      <p style={{ margin: '0 0 1rem 0', opacity: 0.9, fontSize: '1.125rem', lineHeight: '1.6' }}>
                        Preview your deed first to ensure everything looks correct, then generate the final document.
                      </p>
                      <button
                        onClick={handleEnterPreviewMode}
                        className="wizard-btn wizard-btn-primary"
                        style={{ display: 'inline-flex' }}
                      >
                        ✨ Preview Your Deed
                      </button>
                    </div>
                  )}
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
                            color: 'var(--primary-dark)', 
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
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-soft)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    color: 'var(--accent)',
                    fontSize: '0.85rem',
                    textAlign: 'center'
                  }}>
                    Free Plan: {deedUsageCount}/5 deeds used this month
                  </div>
                )}
                
                {/* Single primary action for Step 5 */}
                {showPreview ? (
                  <button
                    className="wizard-btn wizard-btn-primary"
                    onClick={handleGenerateFinalDeed}
                    disabled={isGenerating || !!planLimitsError}
                    style={{ 
                      opacity: isGenerating || planLimitsError ? 0.6 : 1,
                      cursor: isGenerating || planLimitsError ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isGenerating ? '⏳ Generating PDF...' : '📄 Generate & Download PDF'}
                  </button>
                ) : (
                  <button
                    className="wizard-btn wizard-btn-primary"
                    onClick={handleEnterPreviewMode}
                    disabled={isLoadingPreview}
                  >
                    {isLoadingPreview ? '⏳ Preparing Preview...' : '✨ Preview Your Deed'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Preview Action - Floating when ready */}
      {/* Remove floating quick-preview to avoid redundancy */}
      
      {/* Debug component for development */}
      {debugData && (
        <PreviewDataDebugger
          formData={formData}
          aiSuggestions={aiSuggestions}
          templateData={debugData.templateData}
          validation={debugData.validation}
        />
      )}
    </div>
  );
} 