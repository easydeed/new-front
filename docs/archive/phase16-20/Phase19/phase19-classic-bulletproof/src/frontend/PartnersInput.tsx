import React, { useEffect, useMemo, useState } from 'react';
import { usePartnersList } from '../../hooks/usePartnersList';

type PartnersInputProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export default function PartnersInput({
  value,
  onChange,
  placeholder = 'Requested By (type to search or free-type)',
  className = ''
}: PartnersInputProps) {
  const [draft, setDraft] = useState<string>(value ?? '');
  const { options, isLoading } = usePartnersList(draft);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const filtered = useMemo(() => {
    const q = (draft ?? '').toLowerCase();
    return options.filter(x => x.label.toLowerCase().includes(q)).slice(0, 8);
  }, [draft, options]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onChange(next); // critical: typed value always flows to parent
        }}
        onBlur={() => {
          // ensure parent catches final typed value on blur
          onChange(draft ?? '');
        }}
        className="w-full border rounded px-3 py-2"
      />
      {isLoading ? (
        <div className="text-xs opacity-60 mt-1">Loading partners…</div>
      ) : filtered.length > 0 ? (
        <ul
          style={{
            position: 'absolute',
            left: 0, right: 0,
            zIndex: 10,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            maxHeight: 180,
            overflowY: 'auto'
          }}
        >
          {filtered.map(opt => (
            <li
              key={opt.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setDraft(opt.label);
                onChange(opt.label);
              }}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
