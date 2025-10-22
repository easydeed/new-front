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
 * Presentational SmartReview
 * - Shows summary of wizard state with edit buttons
 * - NO direct network calls
 * - NO redirects
 * - Emits 'smartreview:confirm' event that ModernEngine listens for
 */
export default function SmartReview({ docType, state, onEdit, onConfirm, busy }: Props) {
  // Debug: Log what state we're receiving
  console.log('[SmartReview/components] Rendered with state:', state);
  console.log('[SmartReview/components] docType:', docType);
  
  const handleConfirm = useCallback(() => {
    console.log('[SmartReview/components] Confirm clicked with state:', state);
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else {
      // Fallback: dispatch a DOM event the engine listens for
      window.dispatchEvent(new Event('smartreview:confirm'));
    }
  }, [onConfirm, state]);

  // Field labels for better display
  const fieldLabels: Record<string, string> = {
    grantorName: 'Grantor (Transferring Title)',
    granteeName: 'Grantee (Receiving Title)',
    requestedBy: 'Requested By',
    vesting: 'Vesting',
    propertyAddress: 'Property Address',
    fullAddress: 'Property Address',
    apn: 'APN',
    county: 'County',
    legalDescription: 'Legal Description',
  };

  // Important fields to show - show ALL of them, even if empty
  const importantFields = ['grantorName', 'granteeName', 'requestedBy', 'vesting', 'propertyAddress', 'fullAddress', 'apn', 'county', 'legalDescription'];
  
  // Check if we have ANY state data at all
  const hasAnyData = state && Object.keys(state).length > 0;
  const hasImportantData = importantFields.some(k => state?.[k] && String(state[k]).trim() !== '');

  console.log('[SmartReview/components] hasAnyData:', hasAnyData, 'hasImportantData:', hasImportantData);

  return (
    <div className="modern-qna" data-component="SmartReview">
      <h1 className="modern-qna__title">Review Your Deed</h1>
      <p className="modern-qna__why">Please review the information below before generating the deed.</p>
      
      {hasAnyData ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          {importantFields.map((k) => {
            const value = state?.[k];
            const hasValue = value && String(value).trim() !== '';
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6', gap: '16px' }}>
                <div style={{ fontWeight: 600, minWidth: '180px' }}>{fieldLabels[k] || k}</div>
                <div style={{ flex: 1, textAlign: 'right', color: hasValue ? '#374151' : '#9ca3af', fontStyle: hasValue ? 'normal' : 'italic' }}>
                  {hasValue ? String(value) : 'Not provided'}
                </div>
                {onEdit && (
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => onEdit(k)}>
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 16, marginBottom: 24, color: '#991b1b' }}>
          <strong>Warning:</strong> No data to review. State is empty or undefined.
        </div>
      )}
      
      <div className="modern-qna__nav">
        <button 
          className="btn btn-primary" 
          onClick={handleConfirm}
          disabled={busy || !hasImportantData}
          aria-label="Confirm & Generate"
        >
          {busy ? 'Generating...' : 'Confirm & Generate'}
        </button>
      </div>
    </div>
  );
}
