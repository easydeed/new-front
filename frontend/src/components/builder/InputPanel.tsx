'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { InputSection, SectionStatus } from './InputSection';
import { PropertySection } from './sections/PropertySection';
import { GrantorSection } from './sections/GrantorSection';
import { GranteeSection } from './sections/GranteeSection';
import { VestingSection } from './sections/VestingSection';
import { TransferTaxSection } from './sections/TransferTaxSection';
import { RecordingSection } from './sections/RecordingSection';
import { DeedBuilderState } from '@/types/builder';

interface InputPanelProps {
  state: DeedBuilderState;
  onChange: (updates: Partial<DeedBuilderState>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  expandedSection: string;
  onSectionChange: (section: string) => void;
}

export function InputPanel({
  state,
  onChange,
  onGenerate,
  isGenerating,
  expandedSection,
  onSectionChange,
}: InputPanelProps) {
  
  const statuses = useMemo(() => {
    const getStatus = (section: string): SectionStatus => {
      switch (section) {
        case 'property':
          return state.property?.address ? 'complete' : 'empty';
        case 'grantor':
          return state.grantor?.trim() ? 'complete' : 'empty';
        case 'grantee':
          if (!state.grantee?.trim()) return 'empty';
          if (state.grantee.trim().toUpperCase() === state.grantor?.trim().toUpperCase()) return 'warning';
          return 'complete';
        case 'vesting':
          return state.vesting ? 'complete' : 'empty';
        case 'transferTax':
          if (state.dtt?.isExempt && state.dtt?.exemptReason) return 'complete';
          if (state.dtt?.transferValue) return 'complete';
          return 'empty';
        case 'recording':
          return state.requestedBy?.trim() ? 'complete' : 'empty';
        default:
          return 'empty';
      }
    };

    return {
      property: getStatus('property'),
      grantor: getStatus('grantor'),
      grantee: getStatus('grantee'),
      vesting: getStatus('vesting'),
      transferTax: getStatus('transferTax'),
      recording: getStatus('recording'),
    };
  }, [state]);

  const completedCount = Object.values(statuses).filter(s => s === 'complete').length;
  const totalSections = 6;
  const isReady = completedCount === totalSections;

  const toggleSection = (section: string) => {
    onSectionChange(expandedSection === section ? '' : section);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Deed Information</h2>
            <p className="text-sm text-gray-500">
              {completedCount} of {totalSections} sections complete
            </p>
          </div>
          
          <div className="flex items-center gap-1.5">
            {Object.values(statuses).map((status, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  status === 'complete' ? 'bg-emerald-500' :
                  status === 'warning' ? 'bg-amber-500' :
                  'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <InputSection
          id="property"
          title="Property"
          status={statuses.property}
          preview={state.property?.address || 'Search for a property'}
          isExpanded={expandedSection === 'property'}
          onToggle={() => toggleSection('property')}
          badge="Auto-filled"
        >
          <PropertySection
            value={state.property}
            onChange={(property) => onChange({ property })}
            onComplete={() => toggleSection('grantor')}
          />
        </InputSection>

        <InputSection
          id="grantor"
          title="Grantor"
          status={statuses.grantor}
          preview={state.grantor || 'Current property owner'}
          isExpanded={expandedSection === 'grantor'}
          onToggle={() => toggleSection('grantor')}
          badge="From Records"
        >
          <GrantorSection
            value={state.grantor}
            onChange={(grantor) => onChange({ grantor })}
            suggestedName={state.property?.owner}
          />
        </InputSection>

        <InputSection
          id="grantee"
          title="Grantee"
          status={statuses.grantee}
          preview={state.grantee || 'Enter the new owner'}
          isExpanded={expandedSection === 'grantee'}
          onToggle={() => toggleSection('grantee')}
        >
          <GranteeSection
            value={state.grantee}
            onChange={(grantee) => onChange({ grantee })}
            grantorName={state.grantor}
          />
        </InputSection>

        <InputSection
          id="vesting"
          title="Vesting"
          status={statuses.vesting}
          preview={state.vesting || 'How title will be held'}
          isExpanded={expandedSection === 'vesting'}
          onToggle={() => toggleSection('vesting')}
        >
          <VestingSection
            value={state.vesting}
            onChange={(vesting) => onChange({ vesting })}
            granteeCount={countGrantees(state.grantee)}
            deedType={state.deedType}
            grantee={state.grantee}
          />
        </InputSection>

        <InputSection
          id="transferTax"
          title="Transfer Tax"
          status={statuses.transferTax}
          preview={
            state.dtt?.isExempt
              ? `Exempt - ${state.dtt.exemptReason || 'Select reason'}`
              : state.dtt?.calculatedAmount
                ? `$${state.dtt.transferValue} → $${state.dtt.calculatedAmount} DTT`
                : 'Calculate or mark exempt'
          }
          isExpanded={expandedSection === 'transferTax'}
          onToggle={() => toggleSection('transferTax')}
        >
          <TransferTaxSection
            value={state.dtt}
            onChange={(dtt) => onChange({ dtt })}
            city={state.property?.city}
            deedType={state.deedType}
            grantor={state.grantor}
            grantee={state.grantee}
          />
        </InputSection>

        <InputSection
          id="recording"
          title="Recording Info"
          status={statuses.recording}
          preview={state.requestedBy || 'Who is requesting recording'}
          isExpanded={expandedSection === 'recording'}
          onToggle={() => toggleSection('recording')}
        >
          <RecordingSection
            requestedBy={state.requestedBy}
            returnTo={state.returnTo}
            onChange={(updates) => onChange(updates)}
          />
        </InputSection>
      </div>

      {/* Generate Button */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onGenerate}
          disabled={!isReady || isGenerating}
          className={`
            w-full flex items-center justify-center gap-3
            py-4 rounded-xl font-semibold text-lg
            transition-all duration-200
            ${isReady
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Deed
            </>
          )}
        </button>

        {!isReady && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Complete all sections to generate
          </p>
        )}
      </div>
    </div>
  );
}

function countGrantees(grantee: string | undefined): number {
  if (!grantee?.trim()) return 0;
  return (grantee.match(/\s+and\s+/gi) || []).length + 1;
}

