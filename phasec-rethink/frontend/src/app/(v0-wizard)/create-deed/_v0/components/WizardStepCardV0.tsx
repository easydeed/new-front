'use client';

import React from 'react';

export interface WizardStepCardProps {
  title: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
  children: React.ReactNode;
}

export function WizardStepCardV0({ title, subtitle, rightAccessory, children }: WizardStepCardProps) {
  return (
    <section className="v0-card p-4 md:p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 style={{fontWeight:700}} className="text-lg">{title}</h2>
          {subtitle ? <p className="v0-muted text-sm mt-1">{subtitle}</p> : null}
        </div>
        {rightAccessory}
      </div>
      <div>{children}</div>
    </section>
  );
}
