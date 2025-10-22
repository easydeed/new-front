'use client';
import React, { useCallback } from 'react';

type Props = {
  docType?: string;
  state?: Record<string, any>;
  onEdit?: (field: string) => void;
  onConfirm?: () => void;
  busy?: boolean;
};

/**
 * Presentational SmartReview - PATCH FIX APPLIED
 * - Shows summary of wizard state with edit buttons
 * - NO direct network calls
 * - NO redirects
 * - Emits 'smartreview:confirm' event that ModernEngine listens for
 */
export default function SmartReview({ docType, state, onEdit, onConfirm, busy }: Props) {
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else {
      // Fallback: dispatch a DOM event the engine listens for
      window.dispatchEvent(new Event('smartreview:confirm'));
    }
  }, [onConfirm]);

  return (
    <div className="modern-qna" data-component="SmartReview">
      <h1 className="modern-qna__title">Smart Review</h1>
      <p className="modern-qna__why">Confirm the details below.</p>
      
      {state && Object.keys(state).length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          {Object.entries(state).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', gap: '16px' }}>
              <div><strong>{k}</strong></div>
              <div style={{ flex: 1, textAlign: 'right' }}>{String(v)}</div>
              {onEdit && (
                <button className="btn btn-secondary" onClick={() => onEdit(k)}>Edit</button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="modern-qna__nav">
        <button 
          className="btn btn-primary" 
          onClick={handleConfirm}
          disabled={busy}
          aria-label="Confirm & Generate"
        >
          {busy ? 'Generating...' : 'Confirm & Generate'}
        </button>
      </div>
    </div>
  );
}
