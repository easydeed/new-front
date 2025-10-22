'use client';
import React, { useState, useCallback } from 'react';
import StepShell from './StepShell';
import MicroSummary from './MicroSummary';
import { buildReviewLines } from '../review/smartReviewTemplates';

type Props = {
  docType: string;
  state: any;
  onConfirm?: () => void;
};

/**
 * Presentational SmartReview - PATCH FIX APPLIED
 * - Shows review summary with Back/Confirm buttons
 * - NO direct network calls (removed finalizeDeed)
 * - NO direct redirects
 * - Emits 'smartreview:confirm' event that ModernEngine listens for
 */
export default function SmartReview({ docType, state, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const lines = buildReviewLines({ docType, state });

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    try {
      if (typeof onConfirm === 'function') {
        await onConfirm();
      } else {
        // Fallback: dispatch a DOM event the engine listens for
        window.dispatchEvent(new Event('smartreview:confirm'));
      }
    } catch (e) {
      console.error('[SmartReview] Error during confirm:', e);
      alert('An error occurred while generating the deed.');
      setBusy(false);
    }
  }, [onConfirm]);

  return (
    <StepShell title="Smart Review" question="Please confirm the summary below.">
      <ul style={{lineHeight:1.6, fontSize:16}}>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      <MicroSummary text="Check names, APN, and vesting carefully before generating the deed." />
      <div className="wiz-actions">
        <button className="wiz-btn" onClick={() => history.back()} disabled={busy}>
          Back
        </button>
        <button className="wiz-btn primary" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Generating...' : 'Confirm & Generate'}
        </button>
      </div>
    </StepShell>
  );
}
