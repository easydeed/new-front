'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useAIAssist } from '@/contexts/AIAssistContext';
import { AISuggestion } from '../AISuggestion';
import { ConfirmableField } from '../ConfirmableField';
import type { Sourced } from '@/types/builder';

interface GrantorSectionProps {
  value: string;
  onChange: (grantor: string, provenance: Sourced<string>) => void;
  suggestedName?: string;
  provenance?: Sourced<string>;
}

export function GrantorSection({ value, onChange, suggestedName, provenance }: GrantorSectionProps) {
  const { enabled: aiEnabled } = useAIAssist();
  const [guidanceDismissed, setGuidanceDismissed] = useState(false);

  useEffect(() => {
    if (!value && suggestedName) {
      // SiteX-derived prefill: an unverified candidate until the officer
      // confirms it — same rule as the property owner field.
      onChange(suggestedName, { value: suggestedName, source: 'sitex', status: 'candidate' });
    }
  }, [suggestedName, value, onChange]);

  const handleConfirm = () => {
    onChange(value, {
      value,
      source: provenance?.source ?? 'sitex',
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    });
  };

  const handleEdit = (newValue: string) => {
    const upper = newValue.toUpperCase();
    // Manual entry is user-sourced and confirmed on entry.
    onChange(upper, {
      value: upper,
      source: 'user',
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    });
  };

  // SiteX-sourced values (candidate or confirmed) render through the
  // confirm/edit affordance; user-typed values use the plain input.
  const showConfirmable = !!value && (provenance?.source ?? 'sitex') === 'sitex' &&
    (!!provenance || value === suggestedName);

  return (
    <div className="space-y-4">
      {/* AI Guidance */}
      {aiEnabled && !guidanceDismissed && !value && (
        <AISuggestion
          message="The GRANTOR is the current owner transferring the property. This should match the name on the existing deed exactly."
          details="Enter the grantor's full legal name in ALL CAPS as it appears on the current deed. For married couples, use 'JOHN SMITH AND JANE SMITH, HUSBAND AND WIFE'. For trusts, include the full trust name and trustee. If the name has changed since the original deed, a name affidavit may be required."
          onDismiss={() => setGuidanceDismissed(true)}
        />
      )}

      {showConfirmable ? (
        <ConfirmableField
          label="Grantor Name (Current Owner)"
          field={provenance ?? { value, source: 'sitex', status: 'candidate' }}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
        />
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grantor Name (Current Owner)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={value}
              onChange={(e) => handleEdit(e.target.value)}
              placeholder="JOHN SMITH"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            For multiple grantors, use &quot;and&quot; (e.g., JOHN SMITH AND JANE SMITH)
          </p>
        </div>
      )}
    </div>
  );
}
