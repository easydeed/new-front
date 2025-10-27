'use client';
import React, { useMemo, useState } from 'react';
import StepShell from './steps/StepShell';
import MicroSummary from './steps/MicroSummary';
import SmartReview from './steps/SmartReview';
import DeedTypeBadge from '../components/DeedTypeBadge';
import { promptFlows, Prompt } from '../prompts/promptFlows';

export default function ModernEngine({ docType }: { docType: string }) {
  const slug = (docType || '').toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');
  const flow = promptFlows[slug] || promptFlows['grant-deed'];
  const prompts = flow.steps;
  const [state, setState] = useState<any>({ propertyAddress:'', apn:'', grantorName:'', granteeName:'', county:'Los Angeles', vesting:'', dttExemptReason:'', covenants:'', taxSaleRef:'' });
  const reviewCtx = useMemo(() => ({ docType: flow.docType, grantor: state.grantorName, grantee: state.granteeName, property: state.propertyAddress, apn: state.apn, county: state.county, vesting: state.vesting, dttExemptReason: state.dttExemptReason, covenants: state.covenants, taxSaleRef: state.taxSaleRef }), [flow.docType, state]);
  const [i, setI] = useState(0); const total = prompts.length + 1;
  if (i === total - 1) {
    return (<div className="p-4 space-y-2"><div className="flex items-center justify-between"><DeedTypeBadge docType={flow.docType} /></div><MicroSummary data={reviewCtx} /><SmartReview data={reviewCtx} onEdit={()=>setI(0)} onConfirm={()=>{ if (typeof window!=='undefined') window.location.href='/create-deed/finalize'; }} /></div>);
  }
  const goNext=()=>setI(x=>Math.min(total-1,x+1)); const goBack=()=>setI(x=>Math.max(0,x-1));
  const p: Prompt = prompts[i]; const onChange=(v:string)=>setState((s:any)=>({...s,[p.field]:v}));
  const renderField=()=>(<input value={state[p.field]||''} onChange={e=>onChange(e.target.value)} placeholder={p.placeholder||''} className="border rounded px-3 py-2 w-full"/>);
  const visible=!p.showIf||p.showIf(state); const stepTitle=p.title||'Question';
  return (<div className="p-4"><div className="flex items-center justify-between mb-2"><DeedTypeBadge docType={flow.docType} /></div><MicroSummary data={reviewCtx} />{visible?(<StepShell step={i} total={total} title={stepTitle} question={p.question} onNext={goNext} onBack={i>0?goBack:undefined} why={p.why} showNotSure>{renderField()}</StepShell>):(<div className="text-sm text-gray-500">Skipping inapplicable question…</div>)}</div>);
}
