'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AIAssistProvider } from '@/contexts/AIAssistContext';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { InputPanel } from '@/components/builder/InputPanel';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { useBuilderMode } from '@/hooks/useBuilderMode';
import { DeedBuilderState, PropertyData, Sourced } from '@/types/builder';
import {
  CandidateField,
  MaterialFieldKey,
  buildProvenancePayload,
  collectCandidateFields,
} from '@/lib/provenance';
import { isDttSuggestionPending } from '@/lib/dttSuggestions';

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
    grantorProvenance: initialProperty?.owner
      ? { value: initialProperty.owner, source: 'sitex', status: 'candidate' }
      : undefined,
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

  // The generation gate: material sourced data fields (apn, legal
  // description, owner, grantor) still in 'candidate' status block
  // generation until confirmed. The gate sits in front of the save →
  // render → store pipeline: a gated deed never renders, never hashes.
  const [confirmationNeeded, setConfirmationNeeded] = useState<CandidateField[] | null>(null);
  // Ticket TT: an undecided DTT suggestion is surfaced in the panel as a
  // decision to make (with a link back to the section) — NEVER a
  // confirm-all item. Confirm-all must never accept a legal choice.
  const [dttNotePending, setDttNotePending] = useState(false);

  const stampConfirmed = (s: DeedBuilderState, keys: MaterialFieldKey[]): DeedBuilderState => {
    let next = s;
    for (const key of keys) {
      // Each field gets its own recorded confirmation timestamp.
      const confirmedAt = new Date().toISOString();
      if (key === 'grantor') {
        next = {
          ...next,
          grantorProvenance: {
            value: next.grantor,
            source: next.grantorProvenance?.source ?? 'sitex',
            status: 'confirmed',
            confirmedAt,
          },
        };
      } else if (next.property) {
        const existing: Sourced<string> = next.property.provenance?.[key] ?? {
          value: (next.property[key] ?? '') as string,
          source: 'sitex',
          status: 'candidate',
        };
        next = {
          ...next,
          property: {
            ...next.property,
            provenance: {
              ...next.property.provenance,
              [key]: { ...existing, status: 'confirmed', confirmedAt },
            },
          },
        };
      }
    }
    return next;
  };

  const handleGenerate = () => {
    const candidates = collectCandidateFields(state);
    const dttPending = isDttSuggestionPending(state);
    if (candidates.length > 0 || dttPending) {
      setConfirmationNeeded(candidates);
      setDttNotePending(dttPending);
      return;
    }
    performGenerate(state);
  };

  const handleConfirmField = (key: MaterialFieldKey) => {
    const next = stampConfirmed(state, [key]);
    setState(next);
    const remaining = collectCandidateFields(next);
    if (remaining.length > 0) {
      setConfirmationNeeded(remaining);
    } else {
      setConfirmationNeeded(null);
      setDttNotePending(false);
      performGenerate(next);
    }
  };

  const handleConfirmAll = () => {
    if (!confirmationNeeded) return;
    // Stamps DATA fields only. A pending DTT suggestion is deliberately left
    // untouched — generating without deciding means the deed carries only
    // what the officer entered, never the unaccepted proposal.
    const next = stampConfirmed(state, confirmationNeeded.map((c) => c.key));
    setState(next);
    setConfirmationNeeded(null);
    setDttNotePending(false);
    performGenerate(next);
  };

  const handleReviewTransferTax = () => {
    setConfirmationNeeded(null);
    setDttNotePending(false);
    setExpandedSection('transferTax');
  };

  const performGenerate = async (genState: DeedBuilderState) => {
    setIsGenerating(true);
    try {
      // Build the payload to match backend expectations
      const payload = {
        doc_type: genState.deedType,
        county: genState.property?.county || '',
        apn: genState.property?.apn || '',
        property_address: genState.property?.address || '',
        legal_description: genState.property?.legalDescription || '',
        grantors_text: genState.grantor,
        grantees_text: genState.grantee,
        vesting: genState.vesting,
        requested_by: genState.requestedBy,
        return_to: genState.returnTo === 'grantee' ? genState.grantee : genState.requestedBy,
        title_order_no: genState.titleOrderNo || '',
        escrow_no: genState.escrowNo || '',
        dtt: {
          transfer_value: genState.dtt?.transferValue?.replace(/[^0-9]/g, '') || '',
          is_exempt: genState.dtt?.isExempt || false,
          exemption_reason: genState.dtt?.exemptReason || '',
          basis: genState.dtt?.basis || 'full_value',
          area_type: genState.dtt?.areaType || 'unincorporated',
          city_name: genState.dtt?.cityName || '',
          calculated_amount: genState.dtt?.calculatedAmount || '',
        },
        // Who-confirmed-what-when, persisted into deeds.metadata.provenance
        // alongside the stored PDF's hash.
        provenance: buildProvenancePayload(genState),
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

      {/* Generation gate: unconfirmed material fields must be confirmed
          before the deed renders and freezes as an immutable PDF. */}
      {confirmationNeeded && (confirmationNeeded.length > 0 || dttNotePending) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {confirmationNeeded.length > 0
                ? `${confirmationNeeded.length} field${confirmationNeeded.length === 1 ? '' : 's'} need${confirmationNeeded.length === 1 ? 's' : ''} confirmation`
                : 'Transfer tax decision pending'}
            </h2>
            {confirmationNeeded.length > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                These values were pulled from external records. Confirm each one is
                correct before the deed is generated — the generated document is final.
              </p>
            )}

            {/* Ticket TT: a pending legal-choice suggestion is a DECISION,
                not a confirmable value — link back to the section only. */}
            {dttNotePending && (
              <div className="p-3 mb-3 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50">
                <p className="text-sm text-gray-900 font-medium">
                  A suggested transfer-tax exemption is awaiting your decision.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  It will not be applied unless you accept it in the Transfer Tax
                  section. Generating now uses only what you entered.
                </p>
                <button
                  type="button"
                  onClick={handleReviewTransferTax}
                  className="mt-2 text-sm font-medium text-violet-700 hover:text-violet-900 underline"
                >
                  Review transfer tax section
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {confirmationNeeded.map(({ key, label, field }) => (
                <div key={key} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                        {label} · {SOURCE_LABELS[field.source] || field.source}
                      </p>
                      <p className="text-sm text-gray-900 break-words">{field.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmField(key)}
                      className="flex-shrink-0 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setConfirmationNeeded(null);
                  setDttNotePending(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAll}
                className="bg-[#7C4DFF] hover:bg-[#6a3de8] text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {confirmationNeeded.length > 0 ? 'Confirm all & generate' : 'Generate as entered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  sitex: 'From SiteX (county records)',
  google: 'From Google',
  titlepoint: 'From TitlePoint',
  user: 'Entered by you',
};

// Wrap with AIAssistProvider
export function DeedBuilder(props: DeedBuilderProps) {
  return (
    <AIAssistProvider>
      <DeedBuilderInner {...props} />
    </AIAssistProvider>
  );
}
