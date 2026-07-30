'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { InputSection, SectionStatus } from './InputSection';
import { deriveSectionTruth } from '@/lib/deedValidation';
import { PropertySection } from './sections/PropertySection';
import { GrantorSection } from './sections/GrantorSection';
import { GranteeSection } from './sections/GranteeSection';
import { VestingSection } from './sections/VestingSection';
import { TransferTaxSection } from './sections/TransferTaxSection';
import { RecordingSection } from './sections/RecordingSection';
import { AffidavitSection } from './sections/AffidavitSection';
import { formFamily, hasPropertySection, hasVestingInput, usesFactsSection } from '@/lib/formRegistry';
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
  
  // U0: ONE TRUTH — section status derives from the generation gate's own
  // math (deriveSectionTruth), so the counter can never claim "complete"
  // for a section the gate would still stop. The Generate button enables
  // once sections are filled and substantive checks pass; unconfirmed
  // candidates don't disable it — the gate modal is their confirm-all
  // affordance, and the hint below the button says they're coming.
  const truth = useMemo(() => deriveSectionTruth(state), [state]);
  const statuses = truth.statuses as Record<string, SectionStatus>;
  const completedCount = truth.completedCount;
  const totalSections = truth.totalSections;
  const isReady = truth.readyForGate;

  const toggleSection = (section: string) => {
    onSectionChange(expandedSection === section ? '' : section);
  };

  // D2: typed sections get a "Next" button — same forward momentum as
  // confirm-advance, with NO fake confirmations: the officer's own typing
  // is their act; "Confirm" stays reserved for external-source data.
  const SectionNext = ({ to, label }: { to: string; label: string }) => (
    <div className="pt-3 flex justify-end">
      <button
        type="button"
        onClick={() => onSectionChange(to)}
        className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {label}
      </button>
    </div>
  );

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

      {/* Sections - overflow-visible allows dropdowns to extend outside */}
      <div className="flex-1 p-4 space-y-3 overflow-visible" style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {/* Property-less instruments (certification of trust) reference no
            parcel — the builder opens on the typed-facts section instead. */}
        {hasPropertySection(state.deedType) && (
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
            onComplete={() => toggleSection(usesFactsSection(state.deedType) ? 'affidavit' : 'grantor')}
          />
        </InputSection>
        )}

        {usesFactsSection(state.deedType) ? (
        <InputSection
          id="affidavit"
          title={formFamily(state.deedType) === 'declaration' ? 'Declaration Facts' : 'Affidavit Facts'}
          status={statuses.affidavit}
          preview={state.affidavit?.declarantName || state.affidavit?.decedentName || 'The instrument’s typed facts'}
          isExpanded={expandedSection === 'affidavit'}
          onToggle={() => toggleSection('affidavit')}
        >
          <AffidavitSection
            deedType={state.deedType}
            value={state.affidavit}
            onChange={(affidavit) => onChange({ affidavit })}
          />
          <SectionNext to="recording" label="Next: Recording Info" />
        </InputSection>
        ) : (<>
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
            onChange={(grantor, grantorProvenance) => onChange({ grantor, grantorProvenance })}
            suggestedName={state.property?.owner}
            provenance={state.grantorProvenance}
            onComplete={() => onSectionChange('grantee')}
          />
          {/* Wave 2 #6 — entity grantors: typed facts completing the
              entity recital (Flag-3 furniture prints the recital; these
              blanks are the officer's transcription, tolerated blank). */}
          {['grant-deed-corp', 'grant-deed-partnership'].includes(state.deedType) && (
            <div className="mt-4 space-y-4">
              {state.deedType === 'grant-deed-partnership' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partnership type (as stated in the partnership agreement)
                  </label>
                  <input
                    type="text"
                    data-builder-field="affidavit-partnershipType"
                    value={state.affidavit?.partnershipType ?? ''}
                    onChange={(e) => onChange({ affidavit: { ...(state.affidavit ?? { affiantName: '', decedentName: '', recordingDate: '', instrumentNo: '' }), partnershipType: e.target.value } })}
                    placeholder="general"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State of organization
                </label>
                <input
                  type="text"
                  data-builder-field="affidavit-entityState"
                  value={state.affidavit?.entityState ?? ''}
                  onChange={(e) => onChange({ affidavit: { ...(state.affidavit ?? { affiantName: '', decedentName: '', recordingDate: '', instrumentNo: '' }), entityState: e.target.value } })}
                  placeholder="California"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          )}
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
          {hasVestingInput(state.deedType)
            ? <SectionNext to="vesting" label="Next: Vesting" />
            : <SectionNext to="transferTax" label="Next: Transfer Tax" />}
        </InputSection>

        {/* Fixed-vesting variants (JT / CP w/ROS grant deeds) print their
            vesting on the instrument's face — no vesting input, no
            vestingDecision: choosing the form IS the decision (Flag-3). */}
        {hasVestingInput(state.deedType) && (
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
            onChange={(vesting, vestingDecision) =>
              onChange(vestingDecision ? { vesting, vestingDecision } : { vesting })
            }
            decision={state.vestingDecision}
            granteeCount={countGrantees(state.grantee)}
            deedType={state.deedType}
            grantee={state.grantee}
          />
          <SectionNext to="transferTax" label="Next: Transfer Tax" />
        </InputSection>
        )}

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
            onChange={(dtt, dttDecision) =>
              onChange(dttDecision ? { dtt, dttDecision } : { dtt })
            }
            city={state.property?.city}
            deedType={state.deedType}
            grantor={state.grantor}
            grantee={state.grantee}
            decision={state.dttDecision}
            suggestionDismissed={state.dttSuggestionDismissed}
            onDismissSuggestion={() => onChange({ dttSuggestionDismissed: true })}
          />
          <SectionNext to="recording" label="Next: Recording Info" />
        </InputSection>
        </>)}

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
            requestedByAddress={state.requestedByAddress}
            returnTo={state.returnTo}
            titleOrderNo={state.titleOrderNo}
            escrowNo={state.escrowNo}
            onChange={(updates) => onChange(updates)}
          />
          <SectionNext to="" label="Done — review your deed" />
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
        {isReady && truth.pendingConfirmations > 0 && (
          <p className="text-center text-sm text-amber-600 mt-2">
            {truth.pendingConfirmations} county-record field{truth.pendingConfirmations === 1 ? '' : 's'} await
            confirmation — you&apos;ll confirm before the PDF generates.
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

