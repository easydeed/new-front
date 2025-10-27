import React from 'react';

export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(total, 1)) * 100)));
  return (
    <div className="progress slim">
      <div className="progress__bar" style={{ width: `${pct}%` }} />
      <span className="progress__text">{current} of {total}</span>
    </div>
  );
}
