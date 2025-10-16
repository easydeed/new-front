
'use client';
import React from 'react';

export default function ProgressMinimal({ step, total }: { step: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(((step+1) / Math.max(1,total)) * 100)));
  return (
    <div className="dp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="bar" style={{ width: pct + '%' }} />
      <div className="label">Step {step+1} of {total}</div>
    </div>
  );
}
