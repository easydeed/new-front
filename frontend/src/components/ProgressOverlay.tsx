'use client';
import React from 'react';

type Stage = 'idle' | 'connecting' | 'searching' | 'resolving' | 'done' | 'error';

export default function ProgressOverlay({ stage, message }: { stage: Stage; message?: string }) {
  if (stage === 'idle' || stage === 'done') return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.75)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ padding: 16, borderRadius: 8, background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,.12)'}}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {stage === 'connecting' && 'Connecting to property database…'}
          {stage === 'searching' && 'Searching property records…'}
          {stage === 'resolving' && 'Resolving APN and owner information…'}
          {stage === 'error' && 'We hit a snag'}
        </div>
        <div style={{ width: 240, height: 6, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: stage === 'connecting' ? '25%' : stage === 'searching' ? '60%' : '85%',
            height: '100%',
            transition: 'width .4s ease',
            background: '#2563eb'
          }} />
        </div>
        {!!message && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{message}</div>}
      </div>
    </div>
  );
}
