'use client';

import React from 'react';

export interface SmartReviewRow {
  label: string;
  value: string | React.ReactNode;
  editHref?: string;
}

export interface SmartReviewV0Props {
  title?: string;
  rows: SmartReviewRow[];
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function SmartReviewV0({ title = 'Smart Review', rows, onConfirm, confirmLabel = 'Confirm & Generate' }: SmartReviewV0Props) {
  return (
    <section className="v0-card p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h3 style={{fontWeight:700}} className="text-lg">{title}</h3>
      </header>
      <dl className="divide-y v0-border">
        {rows.map((r, i) => (
          <div key={i} className="py-3 grid grid-cols-3 gap-2 items-start">
            <dt className="col-span-1 v0-muted text-sm">{r.label}</dt>
            <dd className="col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>{r.value}</div>
                {r.editHref ? <a className="text-sm underline" href={r.editHref}>Edit</a> : null}
              </div>
            </dd>
          </div>
        ))}
      </dl>

      {onConfirm && (
        <div className="mt-4 flex justify-end">
          <button className="v0-btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      )}
    </section>
  );
}
