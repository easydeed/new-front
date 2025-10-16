
'use client';
import React from 'react';
import { buildReviewLines } from './smartReviewTemplates';

export default function SmartReview({ docType, state, onConfirm, onEdit }: { docType: string; state: any; onConfirm: () => void; onEdit: (field: string) => void; }) {
  const lines = buildReviewLines({ docType, state });
  return (
    <div className="dp-smart-review">
      <h2>Smart Review</h2>
      <ul>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      <div style={{ marginTop: 16 }}>
        <label><input type="checkbox" required /> I confirm the above is correct.</label>
      </div>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onConfirm}>Generate Deed</button>
    </div>
  );
}
