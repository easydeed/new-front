// frontend/src/features/wizard/mode/review/SmartReview.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
// IMPORTANT: Adjust this import path if your project locates the store elsewhere
import { useWizardStoreBridge } from '@/features/wizard/mode/bridge/useWizardStoreBridge';
import { useFinalizeValidator, mapErrorToStep, labelFor } from '@/features/wizard/validation';
// IMPORTANT: Adjust this import path if your finalize() helper lives elsewhere
import { finalizeDeed } from '@/features/wizard/mode/bridge/finalizeDeed';

type Issue = { path: string; message: string };

export default function SmartReview({ docType: docTypeProp }: { docType?: string }) {
  const { getWizardData } = useWizardStoreBridge();
  const validator = useFinalizeValidator(getWizardData);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  const wd = getWizardData();
  const docType = wd?.docType || docTypeProp || 'grant-deed';

  const onConfirm = useCallback(async () => {
    setBusy(true);
    try {
      const { canonical, result } = validator.run(docType);
      if (!result.ok) {
        const errs = (result as any).errors as Issue[];
        setIssues(errs);
        setOk(false);
        return; // block finalize
      }
      setOk(true);
      const deedId = await finalizeDeed(docType, wd);
      if (deedId) {
        const url = `/deeds/${deedId}/preview?mode=modern`;
        window.location.href = url;
      }
    } finally {
      setBusy(false);
    }
  }, [validator, docType, wd]);

  const grouped = useMemo(() => {
    const byStep = new Map<number, Issue[]>();
    for (const e of issues) {
      const step = mapErrorToStep(e.path);
      if (!byStep.has(step)) byStep.set(step, []);
      byStep.get(step)!.push(e);
    }
    return byStep;
  }, [issues]);

  const scrollToStep = (idx: number) => {
    // This assumes each step container has an id like "#wizard-step-{idx}"
    const el = document.querySelector(`#wizard-step-${idx}`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="smart-review">
      <div className="card">
        <h2>Final Review</h2>
        <p>Make sure all required details are complete before generating your deed.</p>

        {ok === false && issues.length > 0 && (
          <div className="validation-errors">
            <h3>We found some things to fix</h3>
            {[...grouped.entries()].map(([step, list]) => (
              <div key={step} className="issue-block">
                <div className="issue-header">
                  <strong>Step {step + 1}</strong>
                  <button type="button" onClick={() => scrollToStep(step)} className="link-btn">Go to step</button>
                </div>
                <ul>
                  {list.map((e, i) => (
                    <li key={i}><span className="label">{labelFor(e.path)}:</span> {e.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="primary-btn"
            aria-busy={busy}
          >
            {busy ? 'Checking…' : 'Confirm & Generate'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .smart-review { display: flex; justify-content: center; padding: 24px; }
        .card { width: 100%; max-width: 920px; background: var(--bg, #fff); border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        h2 { margin: 0 0 8px; }
        .validation-errors { margin-top: 16px; padding: 12px; background: #fff7f7; border: 1px solid #ffd0d0; border-radius: 8px; }
        .issue-block { margin: 10px 0; }
        .issue-header { display:flex; align-items:center; gap:12px; margin-bottom: 6px; }
        .link-btn { background: none; border: none; text-decoration: underline; cursor: pointer; padding: 0; }
        .label { font-weight: 600; }
        .actions { margin-top: 20px; display:flex; justify-content:flex-end; }
        .primary-btn { padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; }
      `}</style>
    </div>
  );
}
