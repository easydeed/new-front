
'use client';
import React from 'react';

export default function StepShellModern({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; }) {
  return (
    <section className="dp-modern-shell">
      <div className="dp-modern-card">
        <header>
          <h1>{title}</h1>
          {subtitle ? <p className="sub">{subtitle}</p> : null}
        </header>
        <main>
          {children}
        </main>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </section>
  );
}
