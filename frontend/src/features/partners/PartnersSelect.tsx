/**
 * Phase 15 v5: Partners Select Component
 * Purpose: Dropdown for selecting partners (title companies, real estate, lenders)
 * Features: Native HTML datalist, auto-complete, type or select
 */

'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { usePartners } from './PartnersContext';

interface PartnersSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PartnersSelect({
  id,
  value = '',
  onChange,
  placeholder = 'Select a partner or type a new one…',
  className = 'wiz-input'
}: PartnersSelectProps) {
  const { items, refresh, loading } = usePartners();
  const [text, setText] = useState(value || '');

  // Sync with external value changes
  useEffect(() => {
    setText(value || '');
  }, [value]);

  // Refresh if empty on mount
  useEffect(() => {
    if (!items.length && !loading) {
      refresh();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange(newValue);
  };

  // Extract display values for datalist
  const options = useMemo(() => {
    return items.map(item => item.display);
  }, [items]);

  return (
    <div className="partners-select-wrapper">
      <input
        id={id}
        className={className}
        list={`${id}-partners-datalist`}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={`${id}-partners-datalist`}>
        {options.map((display, idx) => (
          <option key={idx} value={display}>
            {display}
          </option>
        ))}
      </datalist>
      {loading && (
        <span className="partners-select-loading" style={{ fontSize: '12px', color: '#6b7280' }}>
          Loading partners...
        </span>
      )}
    </div>
  );
}

