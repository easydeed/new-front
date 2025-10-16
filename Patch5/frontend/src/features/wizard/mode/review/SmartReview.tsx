'use client';
import React, { useMemo, useState } from 'react';
import { finalizeDeed } from '@/features/wizard/mode/bridge/finalizeDeed';

export default function SmartReview({
  docType,
  data,
  onEdit,
  toCanonical
}: {
  docType: string;
  data: any;
  onEdit: (path: string) => void;
  toCanonical: (docType: string, state: any) => any;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(() => {
    const arr: string[] = [];
    const p = data?.property || {};
    const parties = data?.parties || data || {};
    if (p?.address) arr.push(`Property: ${p.address}`);
    if (p?.apn) arr.push(`APN: ${p.apn}`);
    if (parties?.grantor?.name) arr.push(`Grantor: ${parties.grantor.name}`);
    if (parties?.grantee?.name) arr.push(`Grantee: ${parties.grantee.name}`);
    if (data?.vesting?.description) arr.push(`Vesting: ${data.vesting.description}`);
    if (data?.requestDetails?.requestedByName) arr.push(`Requested by: ${data.requestDetails.requestedByName}`);
    return arr;
  }, [data]);

  async function handleConfirm() {
    setBusy(true); setError(null);
    const payload = toCanonical(docType, data);
    const res = await finalizeDeed(payload);
    setBusy(false);
    if (!res.success) { setError(res.error || 'Failed to generate deed'); return; }
    window.location.href = `/deeds/${res.deedId || ''}/preview`;
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Smart Review</h3>
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 14, color: '#334155' }}>{l}</div>
        ))}
      </div>
      {error ? <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onEdit('parties')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Edit Parties</button>
        <button onClick={() => onEdit('property')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Edit Property</button>
        <button onClick={handleConfirm} disabled={busy} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer' }}>
          {busy ? 'Generating…' : 'Confirm & Generate'}
        </button>
      </div>
    </div>
  );
}
