'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DeedTypePropertyStep } from './components/DeedTypePropertyStep';
import { SmartConfirmScreen } from './components/SmartConfirmScreen';
import { SuccessScreen } from './components/SuccessScreen';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import type { EnrichedPropertyData } from '@/components/types/PropertySearchTypes';
import { Loader2 } from 'lucide-react';

// Types
type WizardStep = 'deed-type-property' | 'smart-confirm' | 'generating' | 'success';

interface WizardData {
  deedType?: string;
  propertyData?: EnrichedPropertyData;
  // Full data from SmartConfirmScreen
  property?: {
    address: string;
    city: string;
    county: string;
    state: string;
    zip: string;
    apn: string;
    legalDescription: string;
  };
  grantor?: string;
  grantee?: string;
  vesting?: string;
  dtt?: {
    isExempt: boolean;
    exemptReason: string;
    transferValue: string;
    basis: 'full_value' | 'less_liens';
    areaType: 'city' | 'unincorporated';
    cityName: string;
    amount: string;
  };
  requestedBy?: string;
  returnTo?: string;
}

interface GeneratedDeed {
  id: number;
  pdf_url: string;
}

// Deed type mapping from frontend ID to backend format
const DEED_TYPE_BACKEND_MAP: Record<string, string> = {
  'grant-deed': 'grant_deed_ca',
  'quitclaim-deed': 'quitclaim_deed_ca',
  'interspousal-transfer': 'interspousal_transfer_ca',
  'warranty-deed': 'warranty_deed_ca',
  'tax-deed': 'tax_deed_ca',
};

/**
 * WizardHost2 - The new 3-step wizard orchestrator
 * 
 * Step 1: Deed Type + Property Selection (combined)
 * Step 2: Smart Confirm Screen (all fields on one page)
 * Step 3: Success Screen (with download/share/print actions)
 */
export function WizardHost2() {
  // State
  const [step, setStep] = useState<WizardStep>('deed-type-property');
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [generatedDeed, setGeneratedDeed] = useState<GeneratedDeed | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Step 1 Complete Handler
  const handleDeedTypePropertyComplete = useCallback((data: { 
    deedType: string; 
    propertyData: EnrichedPropertyData 
  }) => {
    setWizardData(prev => ({
      ...prev,
      deedType: data.deedType,
      propertyData: data.propertyData,
    }));
    setStep('smart-confirm');
  }, []);

  // Step 2 Complete Handler - Generate PDF
  const handleSmartConfirmComplete = useCallback(async (data: WizardData) => {
    setWizardData(data);
    setStep('generating');
    setIsGenerating(true);
    setGenerationProgress('Preparing deed data...');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (!token) {
        toast.error('Please log in to generate deeds');
        setStep('smart-confirm');
        return;
      }

      // Map deed type to backend format
      const backendDeedType = DEED_TYPE_BACKEND_MAP[data.deedType || ''] || data.deedType;

      // Prepare payload for backend
      const payload = {
        deed_type: backendDeedType,
        property_address: data.property?.address || '',
        apn: data.property?.apn || '',
        county: data.property?.county || '',
        legal_description: data.property?.legalDescription || '',
        grantor_name: data.grantor || '',
        grantee_name: data.grantee || '',
        vesting: data.vesting || '',
        sales_price: data.dtt?.isExempt ? 0 : parseFloat(data.dtt?.transferValue?.replace(/[^0-9.]/g, '') || '0'),
        requested_by: data.requestedBy || '',
        source: 'wizard-v2',
      };

      setGenerationProgress('Generating PDF...');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/deeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to generate deed');
      }

      const result = await response.json();

      setGenerationProgress('Finalizing...');

      // Extract deed ID and PDF URL from response
      const deedId = result.id || result.deed_id;
      const pdfUrl = result.pdf_url || result.pdf_base64 
        ? `data:application/pdf;base64,${result.pdf_base64}` 
        : '';

      if (!deedId) {
        throw new Error('No deed ID returned from server');
      }

      setGeneratedDeed({
        id: deedId,
        pdf_url: pdfUrl || `${process.env.NEXT_PUBLIC_API_URL}/deeds/${deedId}/pdf`,
      });

      toast.success('Deed generated successfully!');
      setStep('success');

    } catch (error) {
      console.error('Deed generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate deed');
      setStep('smart-confirm');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  }, []);

  // Success Screen Handlers
  const handleCreateAnother = useCallback(() => {
    setWizardData({});
    setGeneratedDeed(null);
    setStep('deed-type-property');
  }, []);

  const handleSamePropertyDifferentDeed = useCallback(() => {
    // Keep property data, clear deed type
    setWizardData(prev => ({
      propertyData: prev.propertyData,
    }));
    setGeneratedDeed(null);
    setStep('deed-type-property');
  }, []);

  const handleGoToDashboard = useCallback(() => {
    window.location.href = '/dashboard';
  }, []);

  // Render Loading State
  if (step === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Deed</h2>
          <p className="text-gray-500">{generationProgress || 'Please wait...'}</p>
        </div>
      </div>
    );
  }

  // Render Current Step
  return (
    <PartnersProvider>
      <div className="min-h-screen bg-gray-50">
        {step === 'deed-type-property' && (
          <DeedTypePropertyStep
            onComplete={handleDeedTypePropertyComplete}
            initialDeedType={wizardData.deedType}
            initialPropertyData={wizardData.propertyData}
          />
        )}

        {step === 'smart-confirm' && wizardData.deedType && wizardData.propertyData && (
          <SmartConfirmScreen
            deedType={wizardData.deedType}
            propertyData={wizardData.propertyData}
            onComplete={handleSmartConfirmComplete}
            onBack={() => setStep('deed-type-property')}
          />
        )}

        {step === 'success' && generatedDeed && wizardData.propertyData && (
          <SuccessScreen
            deedType={wizardData.deedType || ''}
            propertyAddress={wizardData.propertyData.fullAddress}
            pdfUrl={generatedDeed.pdf_url}
            deedId={generatedDeed.id}
            onCreateAnother={handleCreateAnother}
            onSamePropertyDifferentDeed={handleSamePropertyDifferentDeed}
            onGoToDashboard={handleGoToDashboard}
          />
        )}
      </div>
    </PartnersProvider>
  );
}

export default WizardHost2;

