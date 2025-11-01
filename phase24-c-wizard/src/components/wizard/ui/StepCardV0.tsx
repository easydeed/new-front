'use client';
import * as React from 'react';

export function StepCardV0({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="v0-section">
      <div className="v0-card p-4 sm:p-6">
        <header className="mb-4">
          <h2 className="v0-heading">{title}</h2>
          {subtitle && <p className="v0-subtle mt-1">{subtitle}</p>}
        </header>
        <div className="space-y-4">
          {children}
        </div>
        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </section>
  );
}
