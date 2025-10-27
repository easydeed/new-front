// frontend/src/features/wizard/mode/components/PrefillCombo.tsx
'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Option = { id?: string|number; label: string };
type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: Option[];
  partners?: Option[];
  allowNewPartner?: boolean;
  placeholder?: string;
  onAddNew?: (fullName: string) => Promise<void> | void;
};

export default function PrefillCombo({
  label, value, onChange, suggestions = [], partners = [], allowNewPartner = false,
  placeholder = 'Type or pick…', onAddNew
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value || ''); }, [value]);

  const list = useMemo(() => {
    const fromPartners = partners.map(p => ({ id: p.id, label: p.label }));
    const fromSuggestions = suggestions.map(s => ({ id: s.id, label: s.label }));
    const merged = [...fromPartners, ...fromSuggestions];
    // lightweight de-dupe by label
    const seen = new Set<string>();
    return merged.filter(it => {
      const key = (it.label || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [partners, suggestions]);

  const handleSelect = (label: string) => {
    setDraft(label);
    onChange(label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleAddNew = async () => {
    const full = (draft || '').trim();
    if (!full) return;
    try {
      await onAddNew?.(full);
    } catch (e) {
      console.warn('[PrefillCombo] onAddNew failed:', e);
    } finally {
      // Always use typed value even if persistence fails
      handleSelect(full);
    }
  };

  return (
    <div className="prefill-combo">
      {label ? <label className="modern-label">{label}</label> : null}
      <input
        ref={inputRef}
        className="modern-input"
        value={draft}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const newValue = e.target.value;
          setDraft(newValue);
          onChange(newValue); // ✅ propagate to parent on every keystroke
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && list.length > 0) {
              handleSelect(list[0].label);
            } else {
              handleAddNew();
            }
          }
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (list.length > 0 || (allowNewPartner && draft.trim().length > 0)) && (
        <div className="prefill-dropdown" role="listbox">
          {list.map((it, idx) => (
            <button
              key={(it.id ?? idx)}
              type="button"
              className="prefill-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(it.label)}
            >
              {it.label}
            </button>
          ))}
          {allowNewPartner && draft.trim().length > 0 && (
            <button
              type="button"
              className="prefill-option add-new"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddNew}
            >
              ➕ Add “{draft.trim()}”
            </button>
          )}
        </div>
      )}
      <style jsx>{`
        .prefill-combo { position: relative; }
        .prefill-dropdown { position: absolute; z-index: 20; left: 0; right: 0; background: var(--bg, #fff); border: 1px solid #ddd; max-height: 240px; overflow: auto; }
        .prefill-option { width: 100%; text-align: left; padding: 8px 10px; }
        .prefill-option:hover { background: rgba(0,0,0,0.04); }
        .add-new { font-weight: 600; }
      `}</style>
    </div>
  );
}
