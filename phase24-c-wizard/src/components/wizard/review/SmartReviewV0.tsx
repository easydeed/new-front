'use client';
import * as React from 'react';

export interface SmartReviewSection {
  title: string;
  rows: { label: string; value: React.ReactNode; onEdit?: () => void }[];
}

export default function SmartReviewV0({ sections, onConfirm }: {
  sections: SmartReviewSection[];
  onConfirm: () => void;
}) {
  return (
    <section className="v0-section">
      <div className="v0-card p-4 sm:p-6">
        <header className="mb-4">
          <h2 className="v0-heading">SmartReview</h2>
          <p className="v0-subtle mt-1">Double‑check details before generating your deed.</p>
        </header>

        <div className="space-y-6">
          {sections.map((s, idx) => (
            <div key={idx}>
              <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {s.rows.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                    <div>
                      <dt className="v0-subtle">{r.label}</dt>
                      <dd className="text-gray-900">{r.value}</dd>
                    </div>
                    {r.onEdit && (
                      <button type="button" onClick={r.onEdit} className="text-sm text-blue-600 hover:underline">
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Confirm &amp; Create
          </button>
        </div>
      </div>
    </section>
  );
}
