'use client';

import React from 'react';
import type { PropertySearchProps } from '../types/props';

export function PropertySearchStyleOnlyV0(props: PropertySearchProps) {
  const { address, onChange, onVerify, suggestions = [], onSelectSuggestion, verified, loading, error, apn, county, legalDescription, owner } = props;

  return (
    <div className="v0-card p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 style={{fontWeight:700}} className="text-base">Property Search</h3>
          <p className="v0-muted text-sm">Start typing an address. We’ll enrich from trusted sources.</p>
        </div>
        {verified ? <span className="text-xs" style={{color:'var(--success)'}}>Verified</span> : null}
      </div>

      <input
        className="v0-input"
        placeholder="Street, City, State…"
        value={address}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? 'addr-error' : undefined}
      />

      {error ? <div id="addr-error" className="mt-2 text-sm" style={{color:'var(--danger)'}}>{error}</div> : null}

      {suggestions.length > 0 && (
        <ul className="mt-2 border rounded-lg overflow-hidden">
          {suggestions.map(s => (
            <li key={s.id}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-[#f5f7fb]"
                onClick={() => onSelectSuggestion && onSelectSuggestion(s.id)}
              >
                <div className="text-sm" style={{fontWeight:600}}>{s.label}</div>
                {s.secondary ? <div className="text-xs v0-muted">{s.secondary}</div> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button className="v0-btn-primary" onClick={onVerify} disabled={loading}>
          {loading ? 'Verifying…' : 'Verify Address'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {apn ? <div className="text-sm"><span className="v0-muted">APN: </span><span>{apn}</span></div> : null}
        {county ? <div className="text-sm"><span className="v0-muted">County: </span><span>{county}</span></div> : null}
        {owner ? <div className="text-sm"><span className="v0-muted">Current Owner: </span><span>{owner}</span></div> : null}
        {legalDescription ? <div className="text-sm md:col-span-2"><span className="v0-muted">Legal Description: </span><span>{legalDescription}</span></div> : null}
      </div>
    </div>
  );
}
