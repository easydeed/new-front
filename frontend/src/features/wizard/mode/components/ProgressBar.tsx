
'use client';
import React from 'react';

export default function ProgressBar({ current, total }: { current: number; total: number; }) {
  const pct = Math.max(0, Math.min(100, Math.round((current/Math.max(total,1))*100)));
  return (
    <div className="wiz-progress" aria-label={`Progress ${pct}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} role="progressbar">
      <span style={{ width: pct + '%' }} />
    </div>
  );
}

