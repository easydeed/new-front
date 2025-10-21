import React, { useEffect, useMemo, useState } from 'react';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
import { promptFlows } from '../prompts/promptFlows';
import SmartReview from '../review/SmartReview';
import StepShell from '../components/StepShell';
import ProgressBar from '../components/ProgressBar';
import PrefillCombo from '../components/PrefillCombo';
import MicroSummary from './steps/MicroSummary';
import { toCanonicalFor } from '@/utils/canonicalAdapters';
import { useWizardMode } from '../ModeContext';

let finalizeDeed: null | ((payload: any) => Promise<{ success: boolean; deedId?: string }>) = null;
try {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/lib/deeds/finalizeDeed');
  finalizeDeed = mod?.finalizeDeed || null;
} catch {}

export default function ModernEngine({ docType }: { docType: string }) {
  const { hydrated, getWizardData, updateFormData } = useWizardStoreBridge();
  const { mode } = useWizardMode();
  const flow = useMemo(() => promptFlows[docType] || promptFlows['grant-deed'], [docType]);
  const [i, setI] = useState(0);
  const [state, setState] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!hydrated) return;
    const data = getWizardData();
    // FIXED BUG #2: Merge verifiedData fields into initial state
    // This ensures property fields from PropertyStepBridge are available
    const initial = { 
      ...(data.formData || {}),
      // Fallback to verifiedData if formData fields are missing
      apn: data.formData?.apn || data.verifiedData?.apn || data.apn,
      county: data.formData?.county || data.verifiedData?.county || data.county,
      propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress || data.propertyAddress,
      fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress || data.fullAddress,
      legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription || data.legalDescription,
      grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary || data.grantorName,
      vesting: data.formData?.vesting || data.verifiedData?.vestingDetails || data.vesting,
    };
    setState(initial);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    updateFormData(state);
  }, [hydrated, state, updateFormData]);

  const steps = flow.steps.filter(s => !s.showIf || s.showIf(state));
  const current = steps[i];
  const total = steps.length;

  const onNext = async () => {
    if (i < total - 1) {
      setI(i + 1);
    } else {
      const payload = toCanonicalFor(docType, state);
      try {
        let result: { success: boolean; deedId?: string } = { success: false };
        if (finalizeDeed) {
          result = await finalizeDeed(payload);
        } else {
          const res = await fetch('/api/deeds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          result = { success: !!json?.success, deedId: json?.deedId };
        }
        if (result.success) {
          if (typeof window !== 'undefined') {
            window.location.href = `/deeds/${result.deedId}/preview?mode=${mode}`;
          }
        } else {
          alert('We could not finalize the deed. Please review and try again.');
        }
      } catch (e) {
        console.error('Finalize failed', e);
        alert('We could not finalize the deed. Please try again.');
      }
    }
  };

  const onBack = () => setI(Math.max(0, i - 1));

  const onChange = (field: string, value: any) => setState(s => ({ ...s, [field]: value }));

  const { verifiedData = {}, partners = [] } = getWizardData();
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
            />
          ) : (
            <div className="modern-qna__control">
              <input
                className="modern-input"
                type="text"
                value={state[current.field] || ''}
                onChange={(e) => onChange(current.field, e.target.value)}
                placeholder={current.placeholder || ''}
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
