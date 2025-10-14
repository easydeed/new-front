'use client';
import React, { useEffect, useMemo, useState } from 'react';
import StepShell from './steps/StepShell';
import MicroSummary from './steps/MicroSummary';
import SmartReview from './steps/SmartReview';
import DeedTypeBadge from '../components/DeedTypeBadge';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
import { finalizeDeed } from '../finalize/finalizeBridge';
import { toCanonicalFor } from '@/features/wizard/adapters';
import { promptFlows, Prompt } from '../prompts/promptFlows';
import { usePromptValidation } from '../validation/usePromptValidation';

type AnyState = Record<string, any>;

export default function ModernEngine({ docType }: { docType: string }) {
  const slug = (docType || '').toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');
  const flow = promptFlows[slug] || promptFlows['grant-deed'];
  const prompts = flow.steps;

  const { get, set } = useWizardStoreBridge();
  const existing = get()?.formData || {};
  const [state, setState] = useState<AnyState>({ 
    grantorName: existing?.parties?.grantor?.name || existing?.grantorName || '',
    granteeName: existing?.parties?.grantee?.name || existing?.granteeName || '',
    county: existing?.property?.county || existing?.county || '',
    apn: existing?.property?.apn || existing?.apn || '',
    propertyAddress: existing?.property?.address || existing?.propertyAddress || '',
    vesting: existing?.vesting?.description || existing?.vesting || '',
    dttExemptReason: existing?.transferTax?.exemption || existing?.dttExemptReason || '',
    covenants: existing?.covenants || '',
    taxSaleRef: existing?.taxSale?.reference || '',
  });
  const [i, setI] = useState(0);
  const total = prompts.length + 1;

  // Sync to canonical in the shared store (only on step changes to prevent infinite loop)
  useEffect(()=>{
    const canonical = toCanonicalFor(docType, state);
    set(canonical);
  }, [i, docType]); // Only sync when step index changes, not on every state change

  const summary = useMemo(()=> ({
    docType: flow.docType,
    grantor: state.grantorName,
    grantee: state.granteeName,
    property: state.propertyAddress,
    apn: state.apn,
    county: state.county,
    vesting: state.vesting,
    dttExemptReason: state.dttExemptReason,
    covenants: state.covenants,
    taxSaleRef: state.taxSaleRef
  }), [flow.docType, state]);

  // Final review step
  if (i === total - 1) {
    const issues: string[] = [];
    if (!state.grantorName) issues.push('Grantor is missing');
    if (!state.granteeName) issues.push('Grantee is missing');
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <DeedTypeBadge docType={flow.docType} />
        </div>
        <MicroSummary data={summary} />
        <SmartReview
          data={summary}
          issues={issues}
          onEdit={() => setI(0)}
          onConfirm={async () => {
            const canonical = toCanonicalFor(docType, state);
            await finalizeDeed(canonical);
          }}
        />
      </div>
    );
  }

  const p: Prompt = prompts[i];
  const { error, run, setError } = usePromptValidation();

  const onChange = (v: string) => setState((s:any)=> ({ ...s, [p.field]: v }));
  const renderField = () => (
    <input
      value={state[p.field] || ''}
      onChange={e => { setError(null); onChange(e.target.value); }}
      placeholder={p.placeholder || ''}
      className="border rounded px-3 py-2 w-full"
    />
  );

  const goNext = () => {
    const ok = run(p.validate, state[p.field], state);
    if (!ok) return;
    setI(x => Math.min(total - 1, x + 1));
  };
  const goBack = () => setI(x => Math.max(0, x - 1));
  const visible = !p.showIf || p.showIf(state);
  const stepTitle = p.title || 'Question';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <DeedTypeBadge docType={flow.docType} />
      </div>
      <MicroSummary data={summary} />
      {visible ? (
        <StepShell
          step={i}
          total={total}
          title={stepTitle}
          question={p.question}
          onNext={goNext}
          onBack={i>0 ? goBack : undefined}
          why={p.why}
          showNotSure
          error={error}
        >
          {renderField()}
        </StepShell>
      ) : (
        <div className="text-sm text-gray-500">Skipping inapplicable question…</div>
      )}
    </div>
  );
}
