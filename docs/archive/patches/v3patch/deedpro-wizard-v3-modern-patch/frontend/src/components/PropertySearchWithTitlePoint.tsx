
'use client';
import React, { useEffect, useRef } from 'react';

type Props = { onVerified: (data: any) => void };

declare global {
  interface Window { google?: any; }
}

export default function PropertySearchWithTitlePoint({ onVerified }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function init() {
      if (!window.google || !window.google.maps) return;
      const g = window.google;
      const input = inputRef.current!;
      if (!input) return;

      if (g.maps.places?.AutocompleteSuggestion) {
        const ac = new g.maps.places.AutocompleteSuggestion({ input });
        ac.addListener('select', async (ev: any) => {
          const placeId = ev?.place?.id || ev?.placeId;
          const place = new g.maps.places.Place({ id: placeId });
          const details = await place.fetchFields({ fields: ['formatted_address', 'address_components', 'geometry'] });
          const fullAddress = details?.formatted_address || input.value;
          const res = await fetch('/api/property/unified-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullAddress }) });
          const data = await res.json();
          onVerified({ fullAddress, ...data });
        });
      } else if (g.maps.places?.AutocompleteService) {
        const autocomplete = new g.maps.places.Autocomplete(input, { types: ['address'] } as any);
        autocomplete.addListener('place_changed', async () => {
          const place = autocomplete.getPlace();
          const fullAddress = place?.formatted_address || input.value;
          const res = await fetch('/api/property/unified-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullAddress }) });
          const data = await res.json();
          onVerified({ fullAddress, ...data });
        });
      }
    }
    init();
  }, [onVerified]);

  return (
    <div className="dp-property-search">
      <label className="form-label">Property address</label>
      <input ref={inputRef} className="form-control form-control-lg" placeholder="Start typing an address…" />
    </div>
  );
}
