'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AIAssistProvider } from '@/contexts/AIAssistContext';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { InputPanel } from '@/components/builder/InputPanel';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { useBuilderMode } from '@/hooks/useBuilderMode';
import { DeedBuilderState, PropertyData, Sourced } from '@/types/builder';
import { buildDeedPayload, hasMeaningfulData } from '@/lib/deedPayload';
import { DEED_LABELS } from '@/lib/deedTypes';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import {
  MaterialFieldKey,
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
    requestedByAddress: '',
    returnTo: '',
    titleOrderNo: '',
    escrowNo: '',
  });

  const [expandedSection, setExpandedSection] = useState('property');
  const [isGenerating, setIsGenerating] = useState(false);

  // ── U1 autosave ────────────────────────────────────────────────
  // Builder state persists to a real deed row (the resume serializer's
  // write path) so a closed tab never silently destroys work. First save
  // mints the row; every later save AND generate reuse its id, so autosave
  // and generate converge on one row — never a duplicate.
  const draftIdRef = useRef<number | null>(resumeDeedId ? Number(resumeDeedId) : null);
  const lastSavedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightSaveRef = useRef<Promise<void> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistDraft = useCallback((s: DeedBuilderState, serialized: string): Promise<void> => {
    const run = (async () => {
      try {
        // X1: silent for ordinary failures (background save; the exit prompt
        // is the surface) — but a 401 is NEVER silent: the audited disaster
        // was typing into a dead session with no warning at all.
        const res = await apiFetch('/api/deeds/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(draftIdRef.current ? { deed_id: draftIdRef.current } : {}),
            ...buildDeedPayload(s),
          }),
        }, { label: 'Autosave', silent: true });
        if (res.ok) {
          const row = await res.json();
          if (row.id) draftIdRef.current = row.id;
          lastSavedRef.current = serialized;
        } else {
          // No fake success: lastSavedRef stays stale, so the unsaved-work
          // prompt still fires on exit — that is the honest surface here.
          console.warn(`[autosave] draft save failed (${res.status})`);
        }
      } catch (err) {
        if (!(err instanceof SessionExpiredError)) {
          console.warn('[autosave] draft save failed:', err);
        }
      } finally {
        inflightSaveRef.current = null;
      }
    })();
    inflightSaveRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    if (isResuming || isGenerating) return;
    if (!hasMeaningfulData(state)) return;
    const serialized = JSON.stringify(buildDeedPayload(state));
    if (serialized === lastSavedRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(state, serialized);
    }, 2500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, isResuming, isGenerating, persistDraft]);

  // X2.6 — duplicate-parcel awareness: a PASSIVE notice (never a block)
  // when the loaded APN already has a completed deed. Legitimate reasons
  // to proceed exist (corrections, new transfers) — the officer just
  // shouldn't discover the earlier document after recording.
  const dupeCheckedApnRef = useRef<string | null>(null);
  useEffect(() => {
    const apn = state.property?.apn?.trim();
    if (!apn || dupeCheckedApnRef.current === apn) return;
    dupeCheckedApnRef.current = apn;
    (async () => {
      try {
        const res = await apiFetch('/deeds', {}, { label: 'Checking parcel history', silent: true });
        if (!res.ok) return;
        const data = await res.json();
        const existing = (data.deeds || []).find(
          (d: { id: number; apn?: string; status?: string; updated_at?: string; created_at?: string }) =>
            d.apn === apn && d.status === 'completed' && d.id !== draftIdRef.current
        );
        if (existing) {
          const when = existing.updated_at || existing.created_at;
          toast.info(
            `Heads up: this parcel (APN ${apn}) already has a completed deed — Doc #${existing.id}` +
              (when ? `, ${new Date(when).toLocaleDateString()}` : '') +
              `. Continuing creates a separate document.`,
            { duration: 10000 }
          );
        }
      } catch {
        // Passive awareness only — a failed check never interrupts the flow.
      }
    })();
  }, [state.property?.apn]);

  // Exit prompt ONLY when there are changes autosave hasn't landed yet —
  // a clean builder or a fully saved draft leaves without friction.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const s = stateRef.current;
      if (!hasMeaningfulData(s)) return;
      if (JSON.stringify(buildDeedPayload(s)) !== lastSavedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Ticket R: hydrate a resumed draft. The mapper restores the officer's
  // RECORDED provenance and legal-choice decisions — fields without a
  // recorded confirmation come back as candidates the gate re-asks.
  useEffect(() => {
    if (!resumeDeedId) return;
    let cancelled = false;
    (async () => {
      try {
        // X1: apiFetch attaches auth and makes failures loud (401 = expired).
        const res = await apiFetch(`/api/deeds/${resumeDeedId}`, {}, { label: 'Loading draft', silent: true });
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
        // Hydration is not an edit: seed the saved-state marker so autosave
        // fires on the officer's next change, not on the restore itself.
        lastSavedRef.current = JSON.stringify(buildDeedPayload(restored));
        if (gaps.length > 0) {
          toast.info(`Draft restored. Not recoverable: ${gaps.join(' · ')}`, { duration: 9000 });
        } else {
          toast.success('Draft restored — pick up where you left off.');
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
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

  // D3 click-to-fix: a click on a preview data region opens its section;
  // where a plain input exists it also receives focus (data-builder-field
  // anchors). Provenance-card fields open at section level — the card is
  // the affordance there.
  const handleRegionClick = useCallback((section: string, field?: string) => {
    setExpandedSection(section);
    if (!field) return;
    // Wait out the accordion expansion before focusing.
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-builder-field="${field}"]`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350);
  }, []);

  const performGenerate = async (genState: DeedBuilderState) => {
    setIsGenerating(true);
    try {
      // A first-save may be mid-flight; let it land so generate reuses its
      // row id instead of racing it into a duplicate.
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (inflightSaveRef.current) await inflightSaveRef.current;

      const serialized = buildDeedPayload(genState);
      const payload = {
        // Ticket R + U1: a resumed OR autosaved draft regenerates into its
        // own row — draftIdRef covers both (resume seeds it, autosave mints it).
        ...(draftIdRef.current ? { deed_id: draftIdRef.current } : {}),
        ...serialized,
      };

      // X1: apiFetch attaches the session token (G1's fossil-key fallback
      // included) and handles 401 as session-expired. silent — this catch
      // block already surfaces failures with the backend's detail.
      const response = await apiFetch('/api/deeds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, { label: 'Generating deed', silent: true });

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
      // The row is saved (whatever the PDF outcome) — don't prompt on the
      // redirect away.
      lastSavedRef.current = JSON.stringify(serialized);
      router.push(`/deed-builder/${deedType}/success?id=${generatedDeedId}`);
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
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
          <PreviewPanel
            state={state}
            activeSection={expandedSection}
            onRegionClick={handleRegionClick}
          />
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
                The generated document is final and stored immutably. Need
                changes? Generate a corrected deed — the record keeps both.
                Resolve the items below first.
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
