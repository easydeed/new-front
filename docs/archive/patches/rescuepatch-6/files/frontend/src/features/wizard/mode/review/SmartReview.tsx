// Presentational SmartReview — no network/redirect side effects.
'use client';
import React, { useCallback } from 'react';
type Props = { onConfirm?: () => void; busy?: boolean; };
export default function SmartReview({ onConfirm, busy }: Props) {
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') return onConfirm();
    window.dispatchEvent(new Event('smartreview:confirm'));
  }, [onConfirm]);
  return (
    <div data-component="SmartReview">
      <button type="button" onClick={handleConfirm} disabled={busy} aria-label="Confirm & Generate">
        Confirm & Generate
      </button>
    </div>
  );
}
