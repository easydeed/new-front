'use client';
import React from 'react';
export default function StepShell({
  step, total, title, question, children, onNext, onBack, onSaveExit, why, showNotSure, error
}:{
  step: number; total: number; title: string; question: string; children: React.ReactNode;
  onNext: () => void; onBack?: () => void; onSaveExit?: () => void; why?: React.ReactNode; showNotSure?: boolean;
  error?: string | null;
}){
  const pct = Math.round(((step+1)/total)*100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{title} <span className="text-gray-400">({step+1} of {total})</span></div>
        <div className="w-40 h-1 bg-gray-200 rounded overflow-hidden"><div style={{width:`${pct}%`}} className="h-full bg-emerald-600" /></div>
      </div>
      <div className="bg-white border rounded p-3">
        <div className="font-semibold mb-2">{question}</div>
        {children}
        {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        {why && <div className="text-xs text-gray-500 mt-2"><strong>Why we ask:</strong> {why}</div>}
        {showNotSure && <div className="text-xs text-gray-500 mt-1">Not sure? You can continue and fill this later.</div>}
        <div className="flex gap-2 mt-3">
          {onBack && <button className="px-3 py-1.5 border rounded" onClick={onBack}>Back</button>}
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded" onClick={onNext}>Continue</button>
          {onSaveExit && <button className="px-3 py-1.5 border rounded" onClick={onSaveExit}>Save & Exit</button>}
        </div>
      </div>
    </div>
  );
}
