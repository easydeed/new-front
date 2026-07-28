'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AIAssistProvider } from '@/contexts/AIAssistContext';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { InputPanel } from '@/components/builder/InputPanel';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { useBuilderMode } from '@/hooks/useBuilderMode';
import { DeedBuilderState, PropertyData, Sourced } from '@/types/builder';
import {
  MaterialFieldKey,
  buildPreflightOverridesPayload,
  buildProvenancePayload,
  collectCandidateFields,
} from '@/lib/provenance';
import {
  evaluateRecorderPreflight,
  evaluateSubstantive,
  unresolvedPreflight,
} from '@/lib/deedValidation';
import { ValidationPanel } from '@/components/builder/ValidationPanel';

interface DeedBuilderProps {
  deedType: string;
  initialProperty?: PropertyData;
  /** Ticket R: id of a saved draft to hydrate into the builder. */
  resumeDeedId?: string;
}

const DEED_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

function DeedBuilderInner({ deedType, initialProperty, resumeDeedId }: DeedBuilderProps) {
  const router = useRouter();
  useBuilderMode();

  const [isResuming, setIsResuming] = useState(!!resumeDeedId);

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

  // Ticket R: hydrate a resumed draft. The mapper restores the officer's
  // RECORDED provenance and legal-choice decisions — fields without a
  // recorded confirmation come back as candidates the gate re-asks.
  useEffect(() => {
    if (!resumeDeedId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const res = await fetch(`/api/deeds/${resumeDeedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Could not load draft (${res.status})`);
        }
        const row = await res.json();
        if ((row.status || 'draft') !== 'draft') {
          throw new Error('This deed is already completed — open it from Past Deeds instead.');
        }
        const { hydrateStateFromDeedRow } = await import('@/lib/deedResume');
        const { state: restored, gaps } = hydrateStateFromDeedRow(row);
        if (cancelled) return;
        setState(restored);
        if (gaps.length > 0) {
          toast.info(`Draft restored. Not recoverable: ${gaps.join(' · ')}`, { duration: 9000 });
        } else {
          toast.success('Draft restored — pick up where you left off.');
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not resume this draft.');
        }
      } finally {
        if (!cancelled) setIsResuming(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeDeedId]);

  const handleChange = useCallback((updates: Partial<DeedBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // The generation gate (Tickets B + TT + V): sits in front of the save →
  // render → store pipeline — a gated deed never renders, never hashes.
  // Three groups, three doctrines:
  //   1. Candidate DATA fields — confirmable (confirm-all allowed).
  //   2. Substantive readiness — must be completed; hard block, fix links.
  //      (Ticket V: an undecided DTT suggestion fails 'Transfer tax decided'
  //      here — a decision to make, never a confirm-all item.)
  //   3. Recorder preflight — formatting warnings, explicitly overridable;
  //      overrides are recorded in metadata like other confirmations.
  const [gateOpen, setGateOpen] = useState(false);

  const gateBlocked = (s: DeedBuilderState): boolean =>
    collectCandidateFields(s).length > 0 ||
    evaluateSubstantive(s).some((c) => !c.ok) ||
    unresolvedPreflight(s).length > 0;

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
    if (gateBlocked(state)) {
      setGateOpen(true);
      return;
    }
    performGenerate(state);
  };

  const handleConfirmField = (key: MaterialFieldKey) => {
    const next = stampConfirmed(state, [key]);
    setState(next);
    if (!gateBlocked(next)) {
      setGateOpen(false);
      performGenerate(next);
    }
  };

  const handleConfirmAll = () => {
    // Stamps DATA fields only — never a substantive item, never a legal
    // choice, never a preflight override.
    const next = stampConfirmed(state, collectCandidateFields(state).map((c) => c.key));
    setState(next);
    if (!gateBlocked(next)) {
      setGateOpen(false);
      performGenerate(next);
    }
  };

  const handleOverridePreflight = (id: string) => {
    setState((prev) => ({
      ...prev,
      preflightOverrides: { ...prev.preflightOverrides, [id]: new Date().toISOString() },
    }));
  };

  const handleNavigateFromGate = (sectionId: string) => {
    setGateOpen(false);
    setExpandedSection(sectionId);
  };

  const performGenerate = async (genState: DeedBuilderState) => {
    setIsGenerating(true);
    try {
      // Build the payload to match backend expectations
      const payload = {
        // Ticket R: a resumed draft regenerates into its own row.
        ...(resumeDeedId ? { deed_id: Number(resumeDeedId) } : {}),
        doc_type: genState.deedType,
        county: genState.property?.county || '',
        apn: genState.property?.apn || '',
        property_address: genState.property?.address || '',
        property_city: genState.property?.city || '',
        property_state: genState.property?.state || '',
        property_zip: genState.property?.zip || '',
        current_owner: genState.property?.owner || '',
        legal_description: genState.property?.legalDescription || '',
        grantors_text: genState.grantor,
        grantees_text: genState.grantee,
        vesting: genState.vesting,
        requested_by: genState.requestedBy,
        // Mail-to: when the deed returns to the grantee, it mails to the
        // grantee AT THE PROPERTY (the standard default) — send the full
        // address block so the recorded deed shows where to mail it.
        // Requester-return stays name-only (partner mailing addresses live
        // in the partner record; not yet collected in the builder).
        return_to: genState.returnTo === 'grantee'
          ? {
              name: genState.grantee,
              address1: genState.property?.address || '',
              city: genState.property?.city || '',
              state: genState.property?.state || '',
              zip: genState.property?.zip || '',
            }
          : genState.requestedBy,
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
        provenance: {
          ...buildProvenancePayload(genState),
          ...(buildPreflightOverridesPayload(genState)
            ? { preflight_overrides: buildPreflightOverridesPayload(genState) }
            : {}),
        },
      };

      const response = await fetch('/api/deeds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // G1: AuthManager stores the session under 'access_token'; the bare
          // 'token' key is a pre-AuthManager fossil nothing writes anymore.
          // This was the only call site reading it without the fallback —
          // every fresh session generated with "Bearer null" (demo blocker).
          'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Generation failed' }));
        throw new Error(error.detail || 'Failed to generate deed');
      }
      
      const result = await response.json();
      const generatedDeedId = result.id || result.deed_id;
      // H1 (invariant #4): a save whose PDF store failed is not a success —
      // say so instead of celebrating a half-failure.
      if (result.pdf_error) {
        toast.warning(
          result.pdf_error_detail
            ? `${result.pdf_error} (${result.pdf_error_detail})`
            : result.pdf_error,
          { duration: 12000 }
        );
      } else {
        toast.success('Deed generated successfully!');
      }
      router.push(`/deed-builder/${deedType}/success?id=${generatedDeedId}`);
    } catch (err) {
      console.error('Generation failed:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isResuming) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent" />
        <p className="text-gray-600">Restoring your draft&hellip;</p>
      </div>
    );
  }

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
      {gateOpen && (() => {
        const candidates = collectCandidateFields(state);
        const substantive = evaluateSubstantive(state);
        const preflight = evaluateRecorderPreflight(state);
        const overrides = state.preflightOverrides ?? {};
        const substantiveBlocked = substantive.some((c) => !c.ok);
        const preflightBlocked = unresolvedPreflight(state).length > 0;
        const primaryLabel = candidates.length > 0 ? 'Confirm all & generate' : 'Generate';
        const primaryDisabled = substantiveBlocked || (candidates.length === 0 && preflightBlocked);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Ready to generate?</h2>
              <p className="text-sm text-gray-500 mb-4">
                The generated document is final and stored immutably. Resolve the
                items below first.
              </p>

              <ValidationPanel
                substantive={substantive}
                preflight={preflight}
                overrides={overrides}
                onOverride={handleOverridePreflight}
                onNavigate={handleNavigateFromGate}
              />

              {candidates.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    External data awaiting confirmation
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {candidates.map(({ key, label, field }) => (
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
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setGateOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={primaryDisabled}
                  onClick={() => {
                    if (candidates.length > 0) {
                      handleConfirmAll();
                    } else if (!gateBlocked(state)) {
                      setGateOpen(false);
                      performGenerate(state);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                    primaryDisabled
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#7C4DFF] hover:bg-[#6a3de8]'
                  }`}
                  title={
                    substantiveBlocked
                      ? 'Complete the substantive items first'
                      : preflightBlocked && candidates.length === 0
                        ? 'Fix or override the preflight items first'
                        : undefined
                  }
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  sitex: 'From county records',
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
