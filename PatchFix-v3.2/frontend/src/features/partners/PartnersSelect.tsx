
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { usePartners } from './PartnersContext';
import type { PartnerSelectItem } from './types';

export default function PartnersSelect({
  id, value, onChange
}: { id: string; value?: string; onChange: (v: string)=>void; }) {
  const { items, refresh } = usePartners();
  const [text, setText] = useState(value || '');

  const merged = useMemo(() => {
    const i = items || [];
    return i.map(x => x.display);
  }, [items]);

  useEffect(() => { if (!items.length) refresh(); }, []);

  return (
    <div>
      <input
        id={id}
        className="wiz-input"
        list={id + '-partners'}
        value={text}
        onChange={(e)=>{ setText(e.target.value); onChange(e.target.value); }}
        placeholder="Select a partner or type a new one…"
      />
      <datalist id={id + '-partners'}>
        {merged.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
        <option value="New…">New…</option>
      </datalist>
    </div>
  );
}
