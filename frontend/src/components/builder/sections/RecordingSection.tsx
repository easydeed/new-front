'use client';

import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';

interface RecordingSectionProps {
  requestedBy: string;
  returnTo: string;
  onChange: (updates: { requestedBy?: string; returnTo?: string }) => void;
}

export function RecordingSection({ requestedBy, returnTo, onChange }: RecordingSectionProps) {
  const { partners } = usePartners();
  
  useEffect(() => {
    if (!requestedBy && partners.length > 0) {
      const lastUsed = localStorage.getItem('lastPartnerUsed');
      if (lastUsed) {
        const partner = partners.find(p => p.id === lastUsed);
        if (partner) {
          onChange({ requestedBy: partner.label });
        }
      }
    }
  }, [partners, requestedBy, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recording Requested By
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={requestedBy}
            onChange={(e) => {
              onChange({ requestedBy: e.target.value });
              const partner = partners.find(p => p.label === e.target.value);
              if (partner) {
                localStorage.setItem('lastPartnerUsed', partner.id);
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
          >
            <option value="">Select partner...</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.label}>
                {partner.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          When Recorded, Return To
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!returnTo || returnTo === requestedBy}
              onChange={() => onChange({ returnTo: requestedBy })}
              className="w-4 h-4 text-brand-500"
            />
            <span className="text-sm text-gray-700">Same as Requested By</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={returnTo === 'grantee'}
              onChange={() => onChange({ returnTo: 'grantee' })}
              className="w-4 h-4 text-brand-500"
            />
            <span className="text-sm text-gray-700">Grantee</span>
          </label>
        </div>
      </div>
    </div>
  );
}

