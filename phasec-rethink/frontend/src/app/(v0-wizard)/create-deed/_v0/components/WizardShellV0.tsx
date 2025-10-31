'use client';

import React from 'react';
import '../_v0/styles/globals.css';
import '../_v0/styles/nuclear-reset.css';

export function WizardShellV0({ children }: { children?: React.ReactNode }) {
  return (
    <div className="v0-shell mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 style={{fontWeight:800}} className="text-2xl" aria-live="polite">
          Create a Deed
        </h1>
        <p className="v0-muted mt-1">Modern, guided experience. Your data stays intact.</p>
      </header>

      <div className="v0-card p-4 md:p-6">{children}</div>
    </div>
  );
}
