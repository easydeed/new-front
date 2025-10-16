
'use client';
import React from 'react';

export default function StepShell({ title, question, children, why, footer }: {
  title?: string; question?: string; children?: React.ReactNode; why?: string; footer?: React.ReactNode;
}) {
  return (
    <div className="wiz-shell">
      <div className="wiz-center">
        {title ? <h2 className="wiz-title">{title}</h2> : null}
        <div className="wiz-card">
          {question ? <div className="wiz-question">{question}</div> : null}
          {why ? <div className="wiz-why">{why}</div> : null}
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
