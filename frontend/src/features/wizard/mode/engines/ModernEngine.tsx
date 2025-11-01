import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
import { promptFlows } from '../prompts/promptFlows';
import SmartReview from '../review/SmartReview';
import StepShell from '../components/StepShell';
import ProgressBar from '../components/ProgressBar';
import PrefillCombo from '../components/PrefillCombo';
import MicroSummary from './steps/MicroSummary';
import { toCanonicalFor } from '@/utils/canonicalAdapters';
import { useWizardMode } from '../ModeContext';
import { finalizeDeed } from '@/lib/deeds/finalizeDeed';
import { usePartners } from '@/features/partners/PartnersContext';
import { assertStableSteps } from '@/lib/wizard/invariants';
// ✅ PHASE 19 SESSION FIX: Import Modern Wizard localStorage key
import { WIZARD_DRAFT_KEY_MODERN } from '../bridge/persistenceKeys';
// ✅ PHASE 24-C STEP 8: Telemetry for wizard events
import { trackWizardEvent } from '@/lib/telemetry';

export default function ModernEngine({ docType }: { docType: string }) {
  const { partners } = usePartners();
  const { hydrated, getWizardData, updateFormData } = useWizardStoreBridge();
  const { mode } = useWizardMode();
  const flow = useMemo(() => promptFlows[docType] || promptFlows['grant-deed'], [docType]);
  const [i, setI] = useState(0);
  const [state, setState] = useState<Record<string, any>>({});

  // Keep a ref to the latest onNext to avoid stale-closure issues.
  const onNextRef = useRef<any>(null);

  // Update ref when onNext changes (defined below)
  
// v8.2: one-shot legal hydration (backfill from verified/formData)
const __didHydrateLegal = useRef(false);
useEffect(() => {
  if (!hydrated || __didHydrateLegal.current) return;
  try {
    const data: any = typeof getWizardData === 'function' ? getWizardData() : {};
    // Check both camelCase and snake_case
    const v = data?.formData?.legalDescription 
           ?? data?.verifiedData?.legalDescription 
           ?? data?.verifiedData?.legal_description 
           ?? data?.legalDescription 
           ?? '';
    // backfill only if we have something and current state is empty or 'not available'
    const cur = (state?.legalDescription || '').toString();
    const curNorm = cur.trim().toLowerCase();
    const shouldBackfill = v && (cur === '' || curNorm === 'not available');
    if (shouldBackfill) {
      setState(s => ({ ...s, legalDescription: v }));
    }
  } catch {}
  __didHydrateLegal.current = true;
}, [hydrated, state?.legalDescription]);
useEffect(() => { 
    if (onNext) {
      // @ts-ignore
      onNextRef.current = onNext; 
    }
  }, []);  // Will update after onNext is defined

  // Fallback DOM-event bridge if SmartReview didn't receive onConfirm prop.
  useEffect(() => {
    const handler = () => { 
      try { 
        onNextRef.current?.(); 
      } catch (e) { 
        console.error('[ModernEngine] onNext from smartreview:confirm failed', e); 
      } 
    };
    window.addEventListener('smartreview:confirm', handler);
    return () => window.removeEventListener('smartreview:confirm', handler);
  }, []);

  // ✅ PHASE 24-C STEP 8: Track when wizard starts (once per session)
  const __didTrackStart = useRef(false);
  useEffect(() => {
    if (hydrated && !__didTrackStart.current) {
      trackWizardEvent('Wizard.Started', { mode: 'modern', deedType: docType });
      __didTrackStart.current = true;
    }
  }, [hydrated, docType]);

  useEffect(() => {
    if (!hydrated) return;
    const data = getWizardData();
    
    // FIXED BUG #2 & #3: Merge verifiedData fields + initialize ALL prompt fields
    // This ensures property fields from PropertyStepBridge AND party fields are available
    const initial = { 
      ...(data.formData || {}),
      // Property fields (fallback to verifiedData if formData fields are missing)
      apn: data.formData?.apn || data.verifiedData?.apn || data.apn || '',
      county: data.formData?.county || data.verifiedData?.county || data.county || '',
      propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress || data.propertyAddress || '',
      fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress || data.fullAddress || '',
      legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription || data.verifiedData?.legal_description || data.legalDescription || '',
      // Party fields (ensure they exist even if empty - CRITICAL FIX)
      grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary || data.grantorName || '',
      granteeName: data.formData?.granteeName || '',  // NEW: Explicitly initialize
      vesting: data.formData?.vesting || data.verifiedData?.vestingDetails || data.vesting || '',
      requestedBy: data.formData?.requestedBy || '',  // NEW: Explicitly initialize
    };
    setState(initial);
  }, [hydrated]);

  // Update wizard store with current state (with debouncing to prevent infinite loops)
  const prevStateRef = useRef<string>('');
  useEffect(() => {
    if (!hydrated) return;
    const stateStr = JSON.stringify(state);
    if (stateStr !== prevStateRef.current) {
      updateFormData(state);
      prevStateRef.current = stateStr;
    }
  }, [hydrated, state, updateFormData]);

  const steps = flow.steps.filter(s => !s.showIf || s.showIf(state));
// Foundation v8: assert stability if DIAG is on
assertStableSteps(steps as any[], typeof i==='number'? i : 0, { expectedTotal: steps?.length, label: 'ModernEngine' });
  const current = steps[i];
  const total = steps.length;

  // ✅ PHASE 24-C STEP 8: Track when a step is shown
  const stepStartTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    if (hydrated && current) {
      stepStartTimeRef.current = Date.now();
      const stepName = i === total ? 'SmartReview' : (current.title || current.question || `Step ${i + 1}`);
      trackWizardEvent('Wizard.StepShown', { 
        step: i + 1, 
        stepName,
        deedType: docType 
      });
    }
  }, [i, hydrated, current, total, docType]);

  const onNext = useCallback(async () => {
    // ✅ PHASE 24-C STEP 8: Track step completion with duration
    const duration = Math.round((Date.now() - stepStartTimeRef.current) / 1000);
    const stepName = i === total ? 'SmartReview' : (current?.title || current?.question || `Step ${i + 1}`);
    trackWizardEvent('Wizard.StepCompleted', { 
      step: i + 1, 
      stepName,
      duration,
      deedType: docType 
    });

    // FIX: i < total (not total - 1) to show SmartReview before finalizing
    // When i = total - 1 (last Q&A), increment to total to show SmartReview
    // When i = total (on SmartReview), then finalize
    if (i < total) {
      setI(i + 1);
    } else {
      const payload = toCanonicalFor(docType, state);
      
      try {
        // ✅ PHASE 19 FIX: Pass docType, state, and mode to finalizeDeed
        const result = await finalizeDeed(payload, { docType, state, mode });
        
        if (result.success) {
          // ✅ PHASE 24-C STEP 8: Track wizard completion
          trackWizardEvent('Wizard.Completed', { 
            deedType: docType,
            stepsCompleted: total + 1, // +1 for SmartReview
            mode: 'modern'
          });

          // ✅ PHASE 19 SESSION FIX: Clear Modern Wizard localStorage after successful finalization
          if (typeof window !== 'undefined') {
            localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
            window.location.href = `/deeds/${result.deedId}/preview?mode=${mode}`;
          }
        } else {
          // ✅ PHASE 24-C STEP 8: Track error
          trackWizardEvent('Wizard.Error', { 
            step: total + 1,
            stepName: 'Finalization',
            error: 'Finalize returned success=false',
            deedType: docType 
          });
          console.error('[ModernEngine.onNext] ❌ Finalize returned success=false');
          alert('We could not finalize the deed. Please review and try again.');
        }
      } catch (e) {
        // ✅ PHASE 24-C STEP 8: Track error
        trackWizardEvent('Wizard.Error', { 
          step: total + 1,
          stepName: 'Finalization',
          error: String(e),
          deedType: docType 
        });
        console.error('[ModernEngine.onNext] ❌ Finalize exception:', e);
        alert('We could not finalize the deed. Please try again.');
      }
    }
}, [state, docType, mode, i, total]); // CRITICAL: All dependencies to prevent stale closures!
  
  // Update ref whenever onNext changes (for ref-safe event bridge)
  // @ts-ignore
  onNextRef.current = onNext;

  const onBack = () => setI(Math.max(0, i - 1));

  const onChange = (field: string, value: any) => {
    setState(s => ({ ...s, [field]: value }));
  };

  const { verifiedData = {} } = getWizardData();
  const ownerCandidates: string[] = Array.from(
    new Set(
      [
        verifiedData?.ownerPrimary,
        verifiedData?.ownerSecondary,
        ...(verifiedData?.owners || []),
      ].filter(Boolean)
    )
  );

  // Build summary data for MicroSummary
  const summaryData = {
    deedType: flow.docType || docType,
    property: state.propertyAddress || verifiedData?.address,
    apn: state.apn || verifiedData?.apn,
    grantor: state.grantorName,
    grantee: state.granteeName,
    county: state.county || verifiedData?.county
  };

  return (
    <StepShell>
      <ProgressBar current={i + 1} total={total} />
      <MicroSummary data={summaryData} />
      {current ? (
        <div className="modern-qna">
          <h1 className="modern-qna__title">{current.title || current.question}</h1>
          <p className="modern-qna__why">{current.why || ''}</p>

          {current.type === 'prefill-combo' ? (
            <PrefillCombo
              label={current.label || current.question}
              value={state[current.field] || ''}
              onChange={(v) => onChange(current.field, v)}
              suggestions={current.field === 'grantorName' ? ownerCandidates : []}
              partners={current.field === 'requestedBy' ? partners : []}
              allowNewPartner={current.field === 'requestedBy'}
            
            onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
            onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}/>
          ) : (
            <div className="modern-qna__control">
              <input
                className="modern-input"
                type="text"
                value={state[current.field] || ''}
                onChange={(e) => onChange(current.field, e.target.value)}
                placeholder={current.placeholder || ''}
                onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
                onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
              />
            </div>
          )}

          <div className="modern-qna__nav">
            <button className="btn btn-secondary" onClick={onBack} disabled={i === 0}>Back</button>
            <button className="btn btn-primary" onClick={onNext}>Next</button>
          </div>

          <div className="modern-qna__summary">
          </div>
        </div>
      ) : (
        <SmartReview
          docType={docType}
          state={state}
          onEdit={(field) => {
            const idx = steps.findIndex(s => s.field === field);
            if (idx >= 0) setI(idx);
          }}
          onConfirm={onNext}
        />
      )}
    </StepShell>
  );
}
