'use client';

import React from 'react';

export function FieldGroupV0({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm" style={{fontWeight:600}}>{label}</div>
      <div>{children}</div>
      {hint ? <div className="mt-1 v0-muted text-xs">{hint}</div> : null}
    </label>
  );
}
