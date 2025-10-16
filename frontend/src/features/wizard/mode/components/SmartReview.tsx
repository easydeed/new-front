
'use client';
import React, { useState } from 'react';
import StepShell from './StepShell';
import MicroSummary from './MicroSummary';
import { buildReviewLines } from '../review/smartReviewTemplates';
import { toCanonicalFor } from '../../adapters';
import finalizeDeed from '../../../services/finalizeDeed';

export default function SmartReview({ docType, state }: { docType: string; state: any; }) {
  const [busy, setBusy] = useState(false);
  const lines = buildReviewLines({ docType, state });

  return (
    <StepShell title="Smart Review" question="Please confirm the summary below.">
      <ul style={{lineHeight:1.6, fontSize:16}}>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      <MicroSummary text="Check names, APN, and vesting carefully before generating the deed." />
      <div className="wiz-actions">
        <button className="wiz-btn" onClick={() => history.back()} disabled={busy}>Back</button>
        <button className="wiz-btn primary" onClick={async () => {
          try {
            setBusy(true);
            const payload = toCanonicalFor(docType, state);
            const res = await finalizeDeed(payload);
            if (res?.success && res?.deedId) {
              window.location.href = `/deeds/${res.deedId}/preview`;
            } else {
              alert('Failed to generate deed. Please try again.');
            }
          } catch (e:any) {
            console.error(e);
            alert('An error occurred while generating the deed.');
          } finally {
            setBusy(false);
          }
        }} disabled={busy}>
          {busy ? 'Generating…' : 'Confirm & Generate'}
        </button>
      </div>
    </StepShell>
  );
}

