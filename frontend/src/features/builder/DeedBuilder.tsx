'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AIAssistProvider } from '@/contexts/AIAssistContext';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { InputPanel } from '@/components/builder/InputPanel';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { useBuilderMode } from '@/hooks/useBuilderMode';
import { DeedBuilderState, PropertyData } from '@/types/builder';

interface DeedBuilderProps {
  deedType: string;
  initialProperty?: PropertyData;
}

const DEED_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

function DeedBuilderInner({ deedType, initialProperty }: DeedBuilderProps) {
  const router = useRouter();
  useBuilderMode();

  const [state, setState] = useState<DeedBuilderState>({
    deedType,
    property: initialProperty || null,
    grantor: initialProperty?.owner || '',
    grantee: '',
    vesting: '',
    dtt: null,
    requestedBy: '',
    returnTo: '',
    titleOrderNo: '',
    escrowNo: '',
  });

  const [expandedSection, setExpandedSection] = useState('property');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = useCallback((updates: Partial<DeedBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Build the payload to match backend expectations
      const payload = {
        doc_type: state.deedType,
        county: state.property?.county || '',
        apn: state.property?.apn || '',
        property_address: state.property?.address || '',
        legal_description: state.property?.legalDescription || '',
        grantors_text: state.grantor,
        grantees_text: state.grantee,
        vesting: state.vesting,
        requested_by: state.requestedBy,
        return_to: state.returnTo === 'grantee' ? state.grantee : state.requestedBy,
        title_order_no: state.titleOrderNo || '',
        escrow_no: state.escrowNo || '',
        dtt: {
          transfer_value: state.dtt?.transferValue?.replace(/[^0-9]/g, '') || '',
          is_exempt: state.dtt?.isExempt || false,
          exemption_reason: state.dtt?.exemptReason || '',
          basis: state.dtt?.basis || 'full_value',
          area_type: state.dtt?.areaType || 'unincorporated',
          city_name: state.dtt?.cityName || '',
          calculated_amount: state.dtt?.calculatedAmount || '',
        },
      };

      const response = await fetch('/api/deeds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Generation failed' }));
        throw new Error(error.detail || 'Failed to generate deed');
      }
      
      const result = await response.json();
      const generatedDeedId = result.id || result.deed_id;
      toast.success('Deed generated successfully!');
      router.push(`/deed-builder/${deedType}/success?id=${generatedDeedId}`);
    } catch (err) {
      console.error('Generation failed:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <BuilderHeader deedType={DEED_LABELS[deedType] || deedType} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[420px] flex-shrink-0 border-r border-gray-300">
          <InputPanel
            state={state}
            onChange={handleChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            expandedSection={expandedSection}
            onSectionChange={setExpandedSection}
          />
        </div>

        <div className="flex-1">
          <PreviewPanel state={state} activeSection={expandedSection} />
        </div>
      </div>
    </div>
  );
}

// Wrap with AIAssistProvider
export function DeedBuilder(props: DeedBuilderProps) {
  return (
    <AIAssistProvider>
      <DeedBuilderInner {...props} />
    </AIAssistProvider>
  );
}
