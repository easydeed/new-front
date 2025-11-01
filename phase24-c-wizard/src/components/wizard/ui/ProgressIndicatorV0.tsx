'use client';
import * as React from 'react';

export default function ProgressIndicatorV0({ current, total }: { current: number; total: number; }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(1,total)) * 100)));
  return (
    <div className="v0-section">
      <div className="w-full rounded-full bg-gray-200 h-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} className="h-2 rounded-full bg-blue-600 transition-[width]"></div>
      </div>
      <div className="mt-2 text-sm text-gray-600">{current} of {total} steps</div>
    </div>
  );
}
