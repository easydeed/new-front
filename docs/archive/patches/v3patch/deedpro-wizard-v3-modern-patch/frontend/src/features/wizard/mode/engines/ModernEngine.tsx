
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StepShellModern from '../components/StepShellModern';
import DeedTypeBadge from '../components/DeedTypeBadge';
import ProgressMinimal from '../components/ProgressMinimal';
import OwnerSelect from '../components/OwnerSelect';
import IndustryPartnersSelect from '../components/IndustryPartnersSelect';
import SmartReview from '../review/SmartReview';
import { useWizardMode } from '../ModeContext';
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
import { promptFlows, Prompt } from '../prompts/promptFlows';
import { fromCanonicalFor } from '../adapters';
import { finalizeDeed } from '@/lib/api/deeds';

type FieldRendererProps = { prompt: Prompt; state: any; setState: (s: any) => void; verifiedOwners?: string[]; };
function FieldRenderer({ prompt, state, setState, verifiedOwners }: FieldRendererProps) {
  const v = state[prompt.field] ?? '';
  switch (prompt.type) {
    case 'select':
      return (
        <select className="form-select form-select-lg" value={v} onChange={(e)=> setState({ ...state, [prompt.field]: e.target.value })}>
          <option value="">Select…</option>
          {(prompt.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    case 'owner':
      return <OwnerSelect verifiedOwners={verifiedOwners} value={v} onChange={(val)=> setState({ ...state, [prompt.field]: val })} />;
    case 'partner':
      return <IndustryPartnersSelect value={v} onChange={(val)=> setState({ ...state, [prompt.field]: val })} />;
    default:
      return <input className="form-control form-control-lg" placeholder={prompt.placeholder || ''} value={v} onChange={(e)=> setState({ ...state, [prompt.field]: e.target.value })} />;
  }
}

export default function ModernEngine({ docType }: { docType: string }) {
  const { mode } = useWizardMode();
  const bridge = useWizardStoreBridge('modern');
  const flow = (promptFlows as any)[(docType || '').replace('_','-')] || (promptFlows as any)['grant-deed'];
  const total = flow.steps.length + 1; // +1 for review

  // Seed from canonical store (if any), but only after hydration
  const [state, setState] = useState<any>({});
  useEffect(() => {
    if (!bridge.hydrated) return;
    const wd = bridge.getWizardData();
    const canonical = wd?.formData || {};
    const seeded = fromCanonicalFor(docType, canonical);
    setState(prev => ({ ...seeded, ...prev }));
  }, [bridge.hydrated]);

  // Verified owners pulled from verifiedData (SiteX/TitlePoint result)
  const verifiedOwners = useMemo(() => {
    const wd = bridge.getWizardData();
    const owners = wd?.verifiedData?.owners || wd?.formData?.verifiedData?.owners || [];
    if (Array.isArray(owners)) {
      return owners.map((o: any) => (typeof o === 'string' ? o : (o?.name || '') )).filter(Boolean);
    }
    return [];
  }, [bridge.hydrated]);

  // step index
  const [i, setI] = useState(0);
  const prompts: Prompt[] = flow.steps.filter((p: Prompt) => !p.showIf || p.showIf(state));

  const next = useCallback(() => setI(s => Math.min(s + 1, prompts.length)), [prompts.length]);
  const back = useCallback(() => setI(s => Math.max(0, s - 1)), []);

  // Persist to store on change
  useEffect(() => {
    if (!bridge.hydrated) return;
    bridge.updateFormData({ ...state, docType: docType });
  }, [state, bridge.hydrated, docType]);

  // Finalize action (replaces redirect to classic)
  const onConfirm = useCallback(async () => {
    const id = await finalizeDeed(docType, state);
    if (typeof window !== 'undefined') {
      window.location.href = `/deeds/${id}/preview?mode=modern`;
    }
  }, [docType, state]);

  // Render review
  if (i >= prompts.length) {
    return (
      <StepShellModern title="Review & Generate" subtitle="Confirm details below, then generate the deed.">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: 12 }}>
          <DeedTypeBadge docType={docType} />
        </div>
        <SmartReview docType={docType} state={state} onConfirm={onConfirm} onEdit={(field)=> {
          const idx = prompts.findIndex(p => p.field === field);
          if (idx >= 0) setI(idx);
        }} />
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={back}>Back</button>
        </div>
      </StepShellModern>
    );
  }

  const p: Prompt = prompts[i];
  return (
    <StepShellModern
      title={p.title || 'Question'}
      subtitle={p.why}
      footer={<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={back} disabled={i===0}>Back</button>
        <div style={{ flex:1, margin:'0 16px' }}>
          <ProgressMinimal step={i} total={total} />
        </div>
        <button className="btn btn-primary" onClick={next}>Next</button>
      </div>}
    >
      <div className="dp-modern-question">
        <h2 style={{ textAlign:'center', marginBottom: 16 }}>{p.question}</h2>
        <div className="dp-modern-input">
          <FieldRenderer prompt={p} state={state} setState={setState} verifiedOwners={verifiedOwners} />
        </div>
      </div>
    </StepShellModern>
  );
}
