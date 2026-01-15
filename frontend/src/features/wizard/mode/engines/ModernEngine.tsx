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
// ✅ PHASE 24-D: Import Lucide icons for modern UI
import { ArrowLeft, ArrowRight, Lightbulb, Loader2 } from 'lucide-react';
// ✅ AI INTEGRATION: Import AI validation components
import { aiAssistant, type AIContext, type AIGuidance as AIGuidanceType } from '@/services/aiAssistant';
import { AIGuidance } from '@/components/AIGuidance';

export default function ModernEngine({ docType }: { docType: string }) {
  const { partners } = usePartners();
  const { hydrated, getWizardData, updateFormData } = useWizardStoreBridge();
  const { mode } = useWizardMode();
  const flow = useMemo(() => promptFlows[docType] || promptFlows['grant-deed'], [docType]);
  const [i, setI] = useState(0);
  const [state, setState] = useState<Record<string, any>>({});

  // ✅ AI INTEGRATION: State for AI validation
  const [aiGuidance, setAIGuidance] = useState<AIGuidanceType[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showAIWarnings, setShowAIWarnings] = useState(false);

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
      // ✅ AI INTEGRATION: Run AI validation before finalizing
      setIsValidating(true);
      
      // Build AI context from wizard state
      const aiContext: AIContext = {
        deedType: docType,
        grantorName: state.grantorName || state.step1?.grantorName || '',
        granteeName: state.granteeName || '',
        vesting: state.vesting || '',
        county: state.county || '',
        legalDescription: state.legalDescription || '',
        dttAmount: state.dtt?.amount || state.transferValue || '',
        dttExempt: state.dtt?.is_exempt || state.isExempt || false,
        dttExemptReason: state.dtt?.exempt_reason || state.exemptionReason || '',
      };

      try {
        // Run AI validation (non-blocking - don't prevent submission)
        const validation = await aiAssistant.validateBeforeSubmit(aiContext);
        setIsValidating(false);
        
        if (!validation.isValid && validation.issues.length > 0) {
          // Show AI warnings but don't block submission
          setAIGuidance(validation.issues);
          setShowAIWarnings(true);
          
          // Track AI validation warnings
          trackWizardEvent('Wizard.AIValidation', { 
            deedType: docType,
            issuesFound: validation.issues.length,
            issues: validation.issues.map(g => g.title)
          });
          
          // Still proceed with finalization - warnings are advisory only
        }
      } catch (aiError) {
        // AI validation failed - proceed anyway
        console.warn('[ModernEngine] AI validation error:', aiError);
        setIsValidating(false);
      }

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
}, [state, docType, mode, i, total, current]); // CRITICAL: All dependencies to prevent stale closures!
  
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
    <div className="min-h-screen">
      <StepShell>
        <ProgressBar current={i + 1} total={total} steps={steps} />
        {current ? (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6 animate-in fade-in duration-300">
          {/* Question heading - LARGER TEXT */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            {current.title || current.question}
          </h1>
          
          {/* Why explanation - Hidden per user request */}
          {/* {current.why && (
            <div className="flex items-start gap-3 mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-base text-slate-700">{current.why}</p>
            </div>
          )} */}

          {/* Input field */}
          {current.type === 'component' ? (
            // Phase 24-H: Render custom component
            <div className="mb-8">
              {current.component && React.createElement(current.component, {
                // For DTT Calculator
                transferValue: state.transferValue || null,
                dttBasis: state.dttBasis || 'full_value',
                areaType: state.areaType || 'unincorporated',
                cityName: state.cityName || '',
                isExempt: state.isExempt || false,
                exemptionReason: state.exemptionReason || '',
                // For Consolidated Parties
                grantorName: state.grantorName || verifiedData?.ownerPrimary || '',
                granteeName: state.granteeName || '',
                vesting: state.vesting || '',
                legalDescription: state.legalDescription || verifiedData?.legalDescription || '',
                // Universal props
                onChange: (field: string, value: any) => onChange(field, value),
                errors: {},
                prefilled: {
                  grantorName: !!verifiedData?.ownerPrimary,
                  legalDescription: !!verifiedData?.legalDescription,
                }
              })}
            </div>
          ) : current.type === 'prefill-combo' ? (
            <div className="mb-8">
              <PrefillCombo
                label={current.label || current.question}
                value={state[current.field] || ''}
                onChange={(v) => onChange(current.field, v)}
                suggestions={current.field === 'grantorName' ? ownerCandidates : []}
                partners={current.field === 'requestedBy' ? partners : []}
                allowNewPartner={current.field === 'requestedBy'}
                onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
                onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
              />
            </div>
          ) : (
            <div className="mb-8">
              <input
                className="w-full px-8 py-6 text-xl md:text-2xl font-medium rounded-lg border-2 border-slate-300
                          focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20
                          transition-all duration-200 placeholder:text-slate-400"
                type="text"
                value={state[current.field] || ''}
                onChange={(e) => onChange(current.field, e.target.value)}
                placeholder={current.placeholder || ''}
                onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
                onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
              />
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between gap-4 pt-6 mt-8 border-t border-slate-200">
            <button 
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg
                        font-semibold hover:bg-slate-50 active:scale-98
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2"
              onClick={onBack} 
              disabled={i === 0}
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button 
              className="px-8 py-3 bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8] hover:from-[#6a3de8] hover:to-[#5a2dd8]
                        text-white font-bold rounded-lg shadow-lg shadow-[#7C4DFF]/30
                        transition-all duration-200 active:scale-98
                        flex items-center gap-2"
              onClick={onNext}
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ✅ AI INTEGRATION: Show AI validation warnings above SmartReview */}
          {showAIWarnings && aiGuidance.length > 0 && (
            <div className="mb-6 space-y-3">
              {aiGuidance.map((guidance, index) => (
                <AIGuidance
                  key={index}
                  guidance={guidance}
                  onDismiss={() => {
                    setAIGuidance(prev => prev.filter((_, i) => i !== index));
                    if (aiGuidance.length === 1) setShowAIWarnings(false);
                  }}
                />
              ))}
            </div>
          )}
          
          {/* ✅ AI INTEGRATION: Show validation loading state */}
          {isValidating && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <span className="text-purple-800 font-medium">AI is reviewing your deed...</span>
            </div>
          )}
          
          <SmartReview
            docType={docType}
            state={state}
            onEdit={(field) => {
              const idx = steps.findIndex(s => s.field === field);
              if (idx >= 0) setI(idx);
            }}
            onConfirm={onNext}
          />
        </>
      )}
      
      {/* MicroSummary - Moved BELOW input for better UX */}
      <MicroSummary data={summaryData} />
      </StepShell>
    </div>
  );
}
