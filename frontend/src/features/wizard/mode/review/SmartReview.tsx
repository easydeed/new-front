import React from 'react';

export default function SmartReview({
  docType,
  state,
  onEdit,
  onConfirm,
}: {
  docType: string;
  state: Record<string, any>;
  onEdit: (field: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modern-qna">
      <h1 className="modern-qna__title">Smart Review</h1>
      <p className="modern-qna__why">Confirm the details below.</p>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        {Object.entries(state).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <div><strong>{k}</strong></div>
            <div>{String(v)}</div>
            <button className="btn btn-secondary" onClick={() => onEdit(k)}>Edit</button>
          </div>
        ))}
      </div>
      <div className="modern-qna__nav">
        <button className="btn btn-primary" onClick={onConfirm}>Confirm & Generate</button>
      </div>
    </div>
  );
}
