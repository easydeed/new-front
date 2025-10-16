'use client';
import React, { useEffect, useMemo, useState } from 'react';
import WizardProgressBarUnified from '@/features/wizard/mode/components/WizardProgressBarUnified';
import Combobox, { ComboOption } from '@/features/wizard/mode/components/Combobox';
import SmartReview from '@/features/wizard/mode/review/SmartReview';
import IndustryPartnersSidebar from '@/features/wizard/mode/components/IndustryPartnersSidebar';
import { useWizardStoreBridge } from '@/features/wizard/mode/bridge/useWizardStoreBridge';
import { promptFlows, toCanonicalFor } from '@/features/wizard/mode/prompts/promptFlows';

export default function ModernEngine({ docType }: { docType: string }) {
  const { hydrated, getWizardData, updateFormData, ownerCandidates } = useWizardStoreBridge('modern');
  const [partners, setPartners] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const data = hydrated ? getWizardData() : { formData: {}, verifiedData: {} };
  const state = data.formData || {};
  const verified = data.verifiedData || {};

  const flow = promptFlows[docType] || promptFlows['grant-deed'];
  const steps = flow.steps;
  const current = steps[idx];

  // Load partners (org-scoped) once
  useEffect(() => {
    if (!hydrated) return;
    fetch('/api/partners', { credentials: 'include' })
      .then(r => r.json()).then(d => setPartners(d.items || d || []))
      .catch(() => setPartners([]));
  }, [hydrated]);

  // Compose prompt context (for option providers)
  const promptCtx = useMemo(() => ({
    ownerCandidates: ownerCandidates(),
    partners
  }), [partners, ownerCandidates]);

  function onNext() {
    if (idx < steps.length) setIdx(idx + 1);
  }
  function onBack() {
    if (idx > 0) setIdx(idx - 1);
  }

  function onEdit(path: string) {
    // naive mapping
    if (path === 'property') setIdx(0);
    if (path === 'parties') setIdx(Math.max(0, steps.findIndex(s => s.field === 'grantorName')));
  }

  function setField(field: string, value: any) {
    updateFormData({ [field]: value });
  }

  const main = (
    <div style={{ flex: 1, padding: 24 }}>
      <WizardProgressBarUnified currentStepIndex={Math.min(idx, steps.length)} steps={steps.map(s => ({ key: s.id, label: s.question }))} />
      {idx < steps.length ? (
        <div style={{ maxWidth: 720, margin: '48px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{current.question}</div>
          {current.why ? <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>{current.why}</div> : null}
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {current.type === 'combobox' ? (
              <Combobox
                value={(state as any)[current.field] || ''}
                onChange={(v) => setField(current.field, v)}
                options={(current.optionsProvider?.(promptCtx) as ComboOption[]) || []}
                placeholder={current.placeholder}
              />
            ) : (
              <input
                style={{ width: '100%', padding: '16px 14px', fontSize: 16, borderRadius: 12, border: '1px solid #cbd5e1' }}
                value={(state as any)[current.field] || ''}
                onChange={(e) => setField(current.field, e.target.value)}
                placeholder={current.placeholder}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={onBack} disabled={idx===0} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Back</button>
            <button onClick={onNext} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer' }}>Next</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: '24px auto' }}>
          <SmartReview docType={docType} data={state} onEdit={onEdit} toCanonical={toCanonicalFor} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '70vh' }}>
      {main}
      <IndustryPartnersSidebar onPick={(p) => {
        updateFormData({ requestedByName: p?.contact_name || p?.company_name || '' });
      }} />
    </div>
  );
}
