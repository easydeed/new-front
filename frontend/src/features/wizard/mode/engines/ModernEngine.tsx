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

export default function ModernEngine({ docType }: { docType: string }) {
  const { partners } = usePartners();
  const { hydrated, getWizardData, updateFormData } = useWizardStoreBridge();
  const { mode } = useWizardMode();
  const flow = useMemo(() => promptFlows[docType] || promptFlows['grant-deed'], [docType]);
  const [i, setI] = useState(0);
  const [state, setState] = useState<Record<string, any>>({});

  // DEBUG: Log partners data whenever it changes
  useEffect(() => {
    console.log('[ModernEngine] 🔵 Partners data updated:', {
      partnersLength: partners?.length ?? 0,
      partners: partners,
      firstPartner: partners?.[0]
    });
  }, [partners]);

  // Keep a ref to the latest onNext to avoid stale-closure issues.
  const onNextRef = useRef<any>(null);

  // Update ref when onNext changes (defined below)
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

  useEffect(() => {
    if (!hydrated) return;
    const data = getWizardData();
    console.log('[ModernEngine] 🔵 Initializing state from wizard data:', data);
    
    // FIXED BUG #2 & #3: Merge verifiedData fields + initialize ALL prompt fields
    // This ensures property fields from PropertyStepBridge AND party fields are available
    const initial = { 
      ...(data.formData || {}),
      // Property fields (fallback to verifiedData if formData fields are missing)
      apn: data.formData?.apn || data.verifiedData?.apn || data.apn || '',
      county: data.formData?.county || data.verifiedData?.county || data.county || '',
      propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress || data.propertyAddress || '',
      fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress || data.fullAddress || '',
      // ISSUE #2 FIX: Prefill legal description from SiteX data
      legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription || data.verifiedData?.legal_description || data.legalDescription || '',
      // Party fields (ensure they exist even if empty - CRITICAL FIX)
      grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary || data.grantorName || '',
      granteeName: data.formData?.granteeName || '',  // NEW: Explicitly initialize
      vesting: data.formData?.vesting || data.verifiedData?.vestingDetails || data.vesting || '',
      requestedBy: data.formData?.requestedBy || '',  // NEW: Explicitly initialize
    };
    
    console.log('[ModernEngine] 🔵 Initial state:', {
      ...initial,
      legalDescriptionLength: initial.legalDescription?.length ?? 0,
      legalDescriptionPreview: initial.legalDescription?.substring(0, 100)
    });
    
    setState(initial);
  }, [hydrated]);

  // Update wizard store with current state (with debouncing to prevent infinite loops)
  const prevStateRef = useRef<string>('');
  useEffect(() => {
    if (!hydrated) return;
    const stateStr = JSON.stringify(state);
    if (stateStr !== prevStateRef.current) {
      console.log('[ModernEngine] 🔄 Syncing state to wizard store:', state);
      updateFormData(state);
      prevStateRef.current = stateStr;
    }
  }, [hydrated, state, updateFormData]);

  const steps = flow.steps.filter(s => !s.showIf || s.showIf(state));
// Foundation v8: assert stability if DIAG is on
assertStableSteps(steps as any[], typeof i==='number'? i : 0, { expectedTotal: steps?.length, label: 'ModernEngine' });
  const current = steps[i];
  const total = steps.length;

  // DEBUG: Log current step info
  useEffect(() => {
    if (current) {
      console.log('[ModernEngine] 🔵 Current step:', {
        stepIndex: i,
        stepId: current.id,
        stepField: current.field,
        stepFieldType: typeof current.field,
        stepFieldCharCodes: current.field ? current.field.split('').map((c: string) => c.charCodeAt(0)) : 'N/A',
        stepTitle: current.title,
        stepQuestion: current.question,
        stepType: current.type,
        EXACT_MATCH_requestedBy: current.field === 'requestedBy',
        EXACT_MATCH_requested_by: current.field === 'requested_by',
        partnersArray: partners,
        partnersLength: partners?.length ?? 0,
        partnersFirstItem: partners?.[0],
        willPassPartners: current.field === 'requestedBy' ? partners : []
      });
      
      // Extra check: What partners will actually be passed?
      const partnersToPass = current.field === 'requestedBy' ? partners : [];
      console.log('[ModernEngine] 🔴 PARTNERS TO PASS TO PREFILLCOMBO:', partnersToPass);
    }
  }, [i, current, partners]);

  const onNext = useCallback(async () => {

    console.log('[ModernEngine.onNext] ========== START ==========');
    console.log('[ModernEngine.onNext] Current step:', i + 1, '/', total);
    console.log('[ModernEngine.onNext] Current state:', state);
    console.log('[ModernEngine.onNext] State keys:', Object.keys(state));
    console.log('[ModernEngine.onNext] 🔴 grantorName:', state.grantorName);
    console.log('[ModernEngine.onNext] 🔴 granteeName:', state.granteeName);
    console.log('[ModernEngine.onNext] 🔴 legalDescription:', state.legalDescription);
    console.log('[ModernEngine.onNext] 🔴 requestedBy:', state.requestedBy);
    console.log('[ModernEngine.onNext] 🔴 vesting:', state.vesting);
    
    // FIX: i < total (not total - 1) to show SmartReview before finalizing
    // When i = total - 1 (last Q&A), increment to total to show SmartReview
    // When i = total (on SmartReview), then finalize
    if (i < total) {
      console.log('[ModernEngine.onNext] Moving to next step');
      setI(i + 1);
    } else {
      console.log('[ModernEngine.onNext] 🟢 FINAL STEP - Starting finalization');
      console.log('[ModernEngine.onNext] docType:', docType);
      console.log('[ModernEngine.onNext] state before transform:', state);
      
      const payload = toCanonicalFor(docType, state);
      console.log('[ModernEngine.onNext] 🟢 Canonical payload created:', JSON.stringify(payload, null, 2));
      
      try {
        console.log('[ModernEngine.onNext] 🟢 Calling finalizeDeed...');
        const result = await finalizeDeed(payload);
        console.log('[ModernEngine.onNext] 🟢 finalizeDeed returned:', result);
        
        if (result.success) {
          if (typeof window !== 'undefined') {
            console.log('[ModernEngine.onNext] 🟢 Redirecting to preview page:', `/deeds/${result.deedId}/preview?mode=${mode}`);
            window.location.href = `/deeds/${result.deedId}/preview?mode=${mode}`;
          }
        } else {
          console.error('[ModernEngine.onNext] ❌ Finalize returned success=false');
          alert('We could not finalize the deed. Please review and try again.');
        }
      } catch (e) {
        console.error('[ModernEngine.onNext] ❌ Finalize exception:', e);
        alert('We could not finalize the deed. Please try again.');
      }
    }
    console.log('[ModernEngine.onNext] ========== END ==========');
}, [state, docType, mode, i, total]); // CRITICAL: All dependencies to prevent stale closures!
  
  // Update ref whenever onNext changes (for ref-safe event bridge)
  // @ts-ignore
  onNextRef.current = onNext;

  const onBack = () => setI(Math.max(0, i - 1));

  const onChange = (field: string, val: any) => {
    console.log(`[ModernEngine.onChange] 🔵 field="${field}" value="${val}"`);
    setState(s => ({ ...s, [field]: val }));
  };

  // Derive owner candidates for PrefillCombo suggestions:
  const data = hydrated ? getWizardData() : { verifiedData: {} };
  const ownerCandidates = useMemo(() => {
    const v = data.verifiedData || {};
    const names: string[] = [];
    if (v.currentOwnerPrimary) names.push(v.currentOwnerPrimary);
    if (v.currentOwnerSecondary) names.push(v.currentOwnerSecondary);
    if (v.additionalOwners && Array.isArray(v.additionalOwners)) {
      names.push(...v.additionalOwners);
    }
    return names.map(n => ({ label: n }));
  }, [data.verifiedData]);

  const summaryData = useMemo(() => ({
    property: state.fullAddress || state.propertyAddress || '—',
    apn: state.apn || '—',
    grantor: state.grantorName || '—',
    grantee: state.granteeName || '—',
  }), [state]);

  // PATCH6: Add refs to enable SmartReview to read them
  useEffect(() => {
    // @ts-ignore
    window.__wizardInternalState = state;
    // @ts-ignore
    window.__wizardInternalDocType = docType;
  }, [state, docType]);

  if (!hydrated) {
    return (
      <StepShell>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '16px', color: '#555' }}>Loading wizard…</p>
        </div>
      </StepShell>
    );
  }

  if (i >= total) {
    return (
      <StepShell>
        <MicroSummary data={summaryData} />
        <SmartReview state={state} docType={docType} onConfirm={onNext} onBack={onBack} />
      </StepShell>
    );
  }

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
              onChange={(v) => {
                console.log(`[ModernEngine.PrefillCombo.onChange] 🔵 field="${current.field}" value="${v}"`);
                onChange(current.field, v);
              }}
              suggestions={current.field === 'grantorName' ? ownerCandidates : []}
              partners={(current.field === 'requestedBy' || current.id === 'requestedBy') ? partners : []}
              allowNewPartner={(current.field === 'requestedBy' || current.id === 'requestedBy')}
            
            onFocus={() => { 
              console.log(`[ModernEngine.PrefillCombo.onFocus] 🔵 field="${current.field}"`);
              if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); 
            }}
            onBlur={() => { 
              console.log(`[ModernEngine.PrefillCombo.onBlur] 🔵 field="${current.field}"`);
              if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); 
            }}/>
          ) : (
            <div className="modern-qna__control">
              {current.type === 'textarea' ? (
                <textarea
                  value={state[current.field] || ''}
                  onChange={(e) => onChange(current.field, e.target.value)}
                  placeholder={current.placeholder || ''}
                  className="modern-textarea"
                />
              ) : (
                <input
                  type="text"
                  value={state[current.field] || ''}
                  onChange={(e) => onChange(current.field, e.target.value)}
                  placeholder={current.placeholder || ''}
                  className="modern-input"
                />
              )}
            </div>
          )}

          <div className="modern-qna__actions">
            <button onClick={onBack} disabled={i === 0} className="modern-btn-back">
              ← Back
            </button>
            <button onClick={onNext} className="modern-btn-next">
              {i < total - 1 ? 'Next →' : 'Review'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p>No prompt found. Please contact support.</p>
        </div>
      )}
    </StepShell>
  );
}
