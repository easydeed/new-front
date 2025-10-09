'use client';
import React from 'react';
// TODO: wire to your real wizard store
export default function MicroSummary() {
  // const s = useWizardStore();
  // Example summary string; replace with real fields
  const summary = 'So far: [address] • [doc type] • [grantors → grantees] • [county]';
  return (
    <div style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, opacity:.85, padding:'6px 0'}}>
      {summary}
    </div>
  );
}
