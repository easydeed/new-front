'use client';
import React, { useCallback } from 'react';

type Props = {
  onConfirm?: () => void;
  busy?: boolean;
};

/**
 * Presentational SmartReview
 * - NO direct network calls
 * - NO redirects
 * - Emits 'smartreview:confirm' if onConfirm is not provided
 */
export default function SmartReview({ onConfirm, busy }: Props) {
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') return onConfirm();
    // Fallback: dispatch a DOM event the engine listens for
    window.dispatchEvent(new Event('smartreview:confirm'));
  }, [onConfirm]);

  return (
    <div data-component="SmartReview">
      {/* Keep your existing summary UI here */}
      <button type="button" onClick={handleConfirm} disabled={busy} aria-label="Confirm & Generate">
        Confirm & Generate
      </button>
    </div>
  );
}
