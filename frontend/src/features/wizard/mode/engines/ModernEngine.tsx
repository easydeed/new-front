
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import StepShell from '../components/StepShell';
import ProgressBar from '../components/ProgressBar';
import MicroSummary from '../components/MicroSummary';
import DeedTypeBadge from '../components/DeedTypeBadge';
import SmartSelectInput from '../components/controls/SmartSelectInput';
import SmartReview from '../components/SmartReview';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
import { promptFlows, Prompt, slug } from '../prompts/promptFlows';
import { useWizardMode, WizardModeProvider } from '../ModeContext';
import PartnersSelect from '../../../partners/PartnersSelect';

export default function ModernEngine({ docType }: { docType: string; }) {
  const { getWizardData, updateFormData, isPropertyVerified } = useWizardStoreBridge();
  const { hydrated } = useWizardMode();
  const data = getWizardData();
  const [i, setI] = useState(0);
  const flow = promptFlows[slug(docType)] || promptFlows['grant-deed'];

  // Derived option sources
  const ownerOptions = useMemo(() => {
    const verified = data?.formData?.verifiedData || data?.verifiedData || {};
    const names: string[] = [];
    if (verified?.ownerPrimary) names.push(verified.ownerPrimary);
    if (verified?.ownerSecondary) names.push(verified.ownerSecondary);
    if (Array.isArray(verified?.owners)) names.push(...verified.owners);
    const uniq = Array.from(new Set(names.filter(Boolean)));
    return uniq.map(n => ({ value: n, label: n }));
  }, [data]);

  const partnersOptions = useMemo(() => {
    // PartnersContext provides richer component; this fallback keeps things working without it.
    const arr = (data?.partnersForSelect || []) as any[];
    return arr.map(p => ({ value: p.display, label: p.display }));
  }, [data]);

  const total = flow.steps.length + 1; // +1 for review
  const current = Math.min(i + 1, total);

  // Guard property verification — use existing Step 1 before Modern
  if (hydrated && !isPropertyVerified()) {
    return (
      <StepShell title="Property verification required" question="Please verify the property before continuing.">
        <MicroSummary text="Use the existing property search step. Once verified, Modern questions will appear here." />
        <div className="wiz-actions">
          <button className="wiz-btn primary" onClick={() => { window.scrollTo({top:0, behavior:'smooth'}); }}>
            Go to Property Search
          </button>
        </div>
      </StepShell>
    );
  }

  // End: render review
  if (i >= flow.steps.length) {
    return (
      <div className="wiz-shell">
        <div className="wiz-center">
          <DeedTypeBadge docType={docType} />
          <ProgressBar current={current} total={total} />
          <SmartReview docType={docType} state={data?.formData || {}} />
        </div>
      </div>
    );
  }

  const step: Prompt = flow.steps[i];
  const value = data?.formData?.[step.field] ?? '';

  function renderInput() {
    if (step.type === 'select' && step.optionsFrom === 'owners') {
      return <SmartSelectInput id={step.id} value={value} onChange={(v)=>updateFormData({[step.field]: v})} options={ownerOptions} />;
    }
    if (step.type === 'select' && step.optionsFrom === 'partners') {
      return <PartnersSelect id={step.id} value={value} onChange={(v)=>updateFormData({[step.field]: v})} />;
    }
    return (
      <input
        className="wiz-input"
        id={step.id}
        value={value}
        onChange={(e)=>updateFormData({[step.field]: e.target.value})}
        placeholder={step.placeholder || ''}
      />
    );
  }

  return (
    <div className="wiz-shell">
      <div className="wiz-center">
        <DeedTypeBadge docType={docType} />
        <ProgressBar current={current} total={total} />
        <StepShell question={step.question} why={step.why}>
          {renderInput()}
          <div className="wiz-actions">
            <button className="wiz-btn" onClick={()=> setI(Math.max(0, i-1))}>Back</button>
            <button className="wiz-btn primary" onClick={()=> setI(i+1)}>Next</button>
          </div>
          <MicroSummary text={`So far: ${data?.formData?.property?.address || data?.formData?.propertyAddress || '—'} • ${slug(docType)} • ${data?.formData?.grantorName || '—'} → ${data?.formData?.granteeName || '—'}`} />
        </StepShell>
      </div>
      <div className="wiz-sidebar">
        {/* Optional: <IndustryPartnersPanel /> can be placed here from the page layout */}
      </div>
    </div>
  );
}
