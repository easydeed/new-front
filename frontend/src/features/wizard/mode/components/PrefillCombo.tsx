// frontend/src/features/wizard/mode/components/PrefillCombo.tsx
// FIXED: Added filtering as user types
// UPDATED: Integrated QuickAddPartnerModal for inline partner creation
'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QuickAddPartnerModal } from '@/features/partners/QuickAddPartnerModal';

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
  onFocus?: () => void;
  onBlur?: () => void;
};

export default function PrefillCombo({
  label, value, onChange, suggestions = [], partners = [], allowNewPartner = false,
  placeholder = 'Type or pick…', onAddNew, onFocus, onBlur
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<number | null>(null);
  
  // State for inline partner creation modal
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [pendingNewName, setPendingNewName] = useState('');

  useEffect(() => { setDraft(value || ''); }, [value]);

  // Build the full list (partners + suggestions, deduplicated)
  const fullList = useMemo(() => {
    const fromPartners = partners.map(p => ({ id: p.id, label: p.label }));
    const fromSuggestions = suggestions.map(s => ({ id: s.id, label: s.label }));
    const merged = [...fromPartners, ...fromSuggestions];
    const seen = new Set<string>();
    return merged.filter(it => {
      const key = (it.label || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [partners, suggestions]);

  // Filter the list based on what user has typed
  const filteredList = useMemo(() => {
    const searchTerm = draft.trim().toLowerCase();
    
    // If nothing typed, show all options
    if (!searchTerm) {
      return fullList;
    }
    
    // Filter to items that match the search term
    return fullList.filter(it => 
      it.label.toLowerCase().includes(searchTerm)
    );
  }, [fullList, draft]);

  // ✅ PHASE 19 FIX: Removed infinite loop debug logger
  // This useEffect was running on EVERY render due to array reference dependencies
  // Removed debug logging for production

  const handleSelect = (label: string) => {
    setDraft(label);
    onChange(label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleAddNew = () => {
    const full = (draft || '').trim();
    if (!full) return;
    
    // Show the modal for actual partner creation
    setPendingNewName(full);
    setShowAddPartner(true);
    setOpen(false);
  };
  
  // Handle partner created via modal
  const handlePartnerCreated = (partner: { id: string; label: string }) => {
    handleSelect(partner.label);
    setShowAddPartner(false);
    setPendingNewName('');
    
    // Also call the legacy onAddNew if provided
    onAddNew?.(partner.label);
  };

  return (
    <div className="prefill-combo">
      {label ? <label className="modern-label">{label}</label> : null}
      <input
        ref={inputRef}
        className="modern-input"
        value={draft}
        onFocus={() => { 
          setOpen(true); 
          onFocus?.(); 
        }}
        onChange={(e) => {
          const newValue = e.target.value;
          setDraft(newValue);
          onChange(newValue); // ✅ propagate every keystroke
          setOpen(true); // Ensure dropdown opens when typing
        }}
        onBlur={() => {
          // allow click on dropdown without losing focus immediately
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          blurTimer.current = window.setTimeout(() => {
            setOpen(false);
            if (draft !== value) onChange(draft); // safety flush
            onBlur?.();
          }, 200);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && filteredList.length > 0) {
              handleSelect(filteredList[0].label);
            } else {
              handleAddNew();
            }
          }
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (filteredList.length > 0 || (allowNewPartner && draft.trim().length > 0)) && (
        <div className="prefill-dropdown" role="listbox" onMouseDown={(e)=>e.preventDefault()}>
          {filteredList.length > 0 ? (
            <>
              {filteredList.map((it, idx) => (
                <button 
                  key={(it.id ?? idx)} 
                  type="button" 
                  className="prefill-option" 
                  onClick={() => {
                    handleSelect(it.label);
                  }}
                >
                  {it.label}
                </button>
              ))}
            </>
          ) : null}
          
          {allowNewPartner && draft.trim().length > 0 && (
            <button 
              type="button" 
              className="prefill-option add-new" 
              onClick={handleAddNew}
            >
              ➕ Add "{draft.trim()}"
            </button>
          )}
        </div>
      )}
      <style jsx>{`
        .prefill-combo { position: relative; }
        .prefill-dropdown { 
          position: absolute; 
          z-index: 999; 
          left: 0; 
          right: 0; 
          background: #fff; 
          border: 1px solid #ddd; 
          border-radius: 6px;
          max-height: 240px; 
          overflow: auto; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-top: 4px;
        }
        .prefill-option { 
          width: 100%; 
          text-align: left; 
          padding: 10px 12px; 
          border: none;
          background: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .prefill-option:hover { 
          background: rgba(124,77,255,0.08); 
        }
        .add-new { 
          font-weight: 600; 
          color: #7C4DFF;
          border-top: 1px solid #e5e5e5;
        }
      `}</style>
      
      {/* Quick Add Partner Modal */}
      {showAddPartner && (
        <QuickAddPartnerModal
          isOpen={showAddPartner}
          onClose={() => {
            setShowAddPartner(false);
            setPendingNewName('');
          }}
          onCreated={handlePartnerCreated}
          initialName={pendingNewName}
          category="title_company"
        />
      )}
    </div>
  );
}
