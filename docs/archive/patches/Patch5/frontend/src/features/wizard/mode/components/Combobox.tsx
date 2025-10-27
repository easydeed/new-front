'use client';
import React, { useMemo, useState } from 'react';

export interface ComboOption {
  value: string;
  label: string;
  meta?: any;
}
export default function Combobox({
  label,
  value,
  onChange,
  options,
  allowCustom = true,
  placeholder
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = (q || '').toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  }, [q, options]);

  const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label || value, [value, options]);

  return (
    <div style={{ width: '100%' }}>
      {label ? <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6 }}>{label}</label> : null}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 12 }}>
        <input
          aria-label={label || 'Select'}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: 16 }}
          placeholder={placeholder || 'Type to search…'}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
          {filtered.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setQ(''); }}
              style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: value === o.value ? '#f1f5f9' : 'transparent' }}
            >
              {o.label}
            </div>
          ))}
          {allowCustom && q && !options.some(o => o.label.toLowerCase() === q.toLowerCase()) && (
            <div
              onClick={() => { onChange(q); setQ(''); }}
              style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: '#fefce8' }}
            >
              Use “{q}”
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Selected: {selectedLabel || '—'}</div>
      </div>
    </div>
  );
}
