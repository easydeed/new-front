// frontend/src/features/wizard/finalize/FinalizePanel.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/notifications/ToastCenter';
import { useFinalizeDeed } from './useFinalizeDeed';

type Props = {
  docType: string;
  gatherContext: () => any;
};

export function FinalizePanel({ docType, gatherContext }: Props) {
  const [stage, setStage] = useState<'idle'|'previewed'|'finalizing'>('idle');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const toast = useToast();
  const router = useRouter();
  const { generatePreview, finalizeSaveAndShare } = useFinalizeDeed();

  async function onPreview() {
    const ctx = gatherContext();
    const url = await generatePreview(docType, ctx);
    if (url) {
      setBlobUrl(url);
      setStage('previewed');
      toast.push('Preview ready — review and then finalize.');
    }
  }

  async function onFinalize() {
    if (!blobUrl) return;
    setStage('finalizing');
    const ctx = gatherContext();
    const ok = await finalizeSaveAndShare(docType, ctx, shareEmail);
    if (ok) {
      toast.push('Deed finalized & saved.');
      setTimeout(() => router.push('/past-deeds'), 1200);
    } else {
      setStage('previewed');
    }
  }

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 12 }}>
      {stage === 'idle' && (
        <button onClick={onPreview} className="btn btn-primary">Generate PDF Preview</button>
      )}
      {stage !== 'idle' && (
        <div>
          {blobUrl && (
            <iframe src={blobUrl} style={{ width: '100%', height: 600, border: '1px solid #e5e7eb', borderRadius: 8 }} />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              type="email"
              placeholder="Share with (optional email)"
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px' }}
            />
            <button onClick={onFinalize} className="btn btn-primary" disabled={stage==='finalizing'}>
              {stage==='finalizing' ? 'Finalizing…' : 'Finalize & Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
