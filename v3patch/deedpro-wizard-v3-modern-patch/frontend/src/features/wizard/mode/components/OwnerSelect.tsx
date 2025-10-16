
'use client';
import React, { useMemo, useState } from 'react';

export default function OwnerSelect({ verifiedOwners, value, onChange }: { verifiedOwners?: string[]; value?: string; onChange: (v: string) => void; }) {
  const owners = useMemo(() => (verifiedOwners || []).filter(Boolean), [verifiedOwners]);
  const [manual, setManual] = useState(value || '');
  const useCustom = owners.length === 0 || (!owners.includes(value || ''));
  return (
    <div className="dp-owner-select">
      {owners.length > 0 ? (
        <select className="form-select" value={useCustom ? '__custom' : (value || '')} onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom') return;
          onChange(v);
        }}>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
          <option value="__custom">Other…</option>
        </select>
      ) : null}
      {useCustom ? (
        <input className="form-control" placeholder="Type a name" value={manual} onChange={(e) => { setManual(e.target.value); onChange(e.target.value); }} />
      ) : null}
    </div>
  );
}
