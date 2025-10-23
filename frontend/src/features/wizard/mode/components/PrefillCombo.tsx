import React, { useMemo, useState } from 'react';

type Partner = { id: string; name: string; category?: string };

export default function PrefillCombo({
  label,
  value,
  onChange,
  suggestions = [],
  partners = [],
  allowNewPartner = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
  partners?: Partner[];
  allowNewPartner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const items = useMemo(() => {
    const s = suggestions.map(v => ({ type: 'suggestion', label: v }));
    const p = partners.map(p => ({ type: 'partner', label: p.name, partner: p }));
    return [...s, ...p];
  }, [suggestions, partners]);

  return (
    <div className="prefill-combo">
      <label className="prefill-combo__label">{label}</label>
      <div className="prefill-combo__box">
        <input
          className="modern-input"
          value={draft}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const newValue = e.target.value;
            setDraft(newValue);
            onChange(newValue);  // 🔧 FIX: Call parent onChange immediately!
          }}
          onBlur={() => {
            // Close dropdown and ensure final value is saved
            setOpen(false);
            if (draft !== value) {
              onChange(draft);
            }
          }}
          placeholder={`Type or pick…`}
        />
        {(suggestions.length > 0 || partners.length > 0) && (
          <svg 
            className="prefill-combo__arrow" 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="currentColor"
            style={{ 
              position: 'absolute', 
              right: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              pointerEvents: 'none',
              opacity: 0.5 
            }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {open && (
          <div className="prefill-combo__panel">
            {items.length === 0 && <div className="prefill-combo__empty">No suggestions</div>}
            {items.map((it, idx) => (
              <button
                key={idx}
                type="button"
                className={`prefill-combo__item prefill-combo__item--${it.type}`}
                onClick={() => {
                  onChange(it.label);
                  setDraft(it.label);
                  setOpen(false);
                }}
              >
                {it.label}
                {it.type === 'partner' && it.partner?.category ? (
                  <span className="prefill-combo__meta">{it.partner.category}</span>
                ) : null}
              </button>
            ))}
            {allowNewPartner && draft && (
              <button
                type="button"
                className="prefill-combo__item prefill-combo__item--new"
                onClick={async () => {
                  try {
                    // Get auth token
                    const token = typeof window !== 'undefined' 
                      ? (localStorage.getItem('token') || localStorage.getItem('access_token'))
                      : null;
                    
                    // PATCH 5 FIX: Correct payload format
                    const res = await fetch('/api/partners', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ 
                        company_name: draft,  // FIXED: was 'name', now 'company_name'
                        category: 'other',    // Default category
                        role: 'other'         // Default role
                      }),
                    });
                    
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      console.error('[PrefillCombo] Failed to create partner:', errorData);
                      throw new Error('Failed');
                    }
                    
                    const newPartner = await res.json();
                    console.log('[PrefillCombo] Partner created:', newPartner);
                    
                    onChange(draft);
                    setOpen(false);
                  } catch (error: any) {
                    console.error('[PrefillCombo] Error creating partner:', error);
                    // Graceful fallback: still update the field
                    onChange(draft);
                    setOpen(false);
                  }
                }}
              >
                + Add "{draft}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

