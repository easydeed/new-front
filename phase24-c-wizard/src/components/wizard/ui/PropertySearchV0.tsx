'use client';
import * as React from 'react';

/** Visual shell only. Paste the existing logic where indicated.
 *  Keep all state, effects, handlers and data flow intact.
 */
export interface PropertySearchProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: any) => void;
  onVerified?: (meta: any) => void;
  loading?: boolean;
  error?: string | null;
  verifiedMeta?: {
    apn?: string;
    county?: string;
    legalDescription?: string;
    owner?: string;
  } | null;
}

export default function PropertySearchV0(props: PropertySearchProps) {
  const {
    value, onChange, onSelect, onVerified,
    loading, error, verifiedMeta
  } = props;

  // [PASTE EXISTING LOGIC HERE] — keep handlers, effects, Google Places & SiteX calls unchanged

  return (
    <div className="v0-section">
      <label className="block v0-heading mb-2">Property address</label>
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'addr-error' : undefined}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start typing an address…"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">Loading…</div>
        )}
      </div>

      {/* Suggestions dropdown — keep keyboard/hover handling from existing logic */}
      <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* [PASTE EXISTING SUGGESTIONS RENDER HERE] */}
      </div>

      {verifiedMeta && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {verifiedMeta.apn && <div><span className="v0-subtle">APN:</span> <span className="font-medium text-gray-900">{verifiedMeta.apn}</span></div>}
          {verifiedMeta.county && <div><span className="v0-subtle">County:</span> <span className="font-medium text-gray-900">{verifiedMeta.county}</span></div>}
          {verifiedMeta.legalDescription && <div className="sm:col-span-2"><span className="v0-subtle">Legal Description:</span> <span className="font-medium text-gray-900">{verifiedMeta.legalDescription}</span></div>}
          {verifiedMeta.owner && <div className="sm:col-span-2"><span className="v0-subtle">Current Owner:</span> <span className="font-medium text-gray-900">{verifiedMeta.owner}</span></div>}
        </div>
      )}

      {error && (
        <p id="addr-error" className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
