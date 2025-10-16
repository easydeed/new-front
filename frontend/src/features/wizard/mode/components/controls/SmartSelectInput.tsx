
'use client';
import React, { useMemo, useState } from 'react';

export type Option = { value: string; label: string; meta?: any };

export default function SmartSelectInput({
  id, label, options, value, onChange, allowFreeText = true, placeholder = 'Select or type...'
}: {
  id: string;
  label?: string;
  options: Option[];
  value?: string;
  onChange: (v: string) => void;
  allowFreeText?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value || '');

  const merged = useMemo(() => {
    const set = new Map<string,Option>();
    options.forEach(o => set.set(o.value, o));
    if (text && !set.has(text)) set.set(text, { value: text, label: text });
    return Array.from(set.values());
  }, [options, text]);

  return (
    <div>
      {label ? <label htmlFor={id} style={{display:'block', fontWeight:700, marginBottom:8}}>{label}</label> : null}
      <input
        id={id}
        className="wiz-input"
        list={id + "-datalist"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
      />
      <datalist id={id + "-datalist"}>
        {merged.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </datalist>
    </div>
  );
}

