'use client';
import React from 'react';
import '@/features/wizard/mode/layout/ask-layout.css';

export default function StepShell({
  step, total, title, question, children, onNext, onBack, onSaveExit, why, showNotSure, error
}:{
  step: number; total: number; title: string; question: string; children: React.ReactNode;
  onNext: () => void; onBack?: () => void; onSaveExit?: () => void; why?: React.ReactNode; showNotSure?: boolean;
  error?: string | null;
}){
  const pct = Math.round(((step+1)/total)*100);
  return (
    <div className="ask-shell">
      <div className="ask-card">
        <div className="ask-micro" style={{ marginBottom: '12px' }}>
          {title} <span style={{ color: '#9ca3af' }}>({step+1} of {total})</span>
          <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }} />
          </div>
        </div>
        <div className="ask-question">{question}</div>
        {why && <div className="ask-why"><strong>Why we ask:</strong> {why}</div>}
        <div className="ask-control">
          {children}
          {error && <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>{error}</div>}
          {showNotSure && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '6px' }}>Not sure? You can continue and fill this later.</div>}
        </div>
        <div className="ask-actions">
          {onBack && <button className="btn btn-secondary" onClick={onBack}>Back</button>}
          <button className="btn btn-primary" onClick={onNext}>Continue</button>
          {onSaveExit && <button className="btn btn-secondary" onClick={onSaveExit}>Save & Exit</button>}
        </div>
      </div>
    </div>
  );
}
