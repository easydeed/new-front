'use client';

import { useEffect, useState } from 'react';
import { User, Sparkles } from 'lucide-react';
import { useAIAssist } from '@/contexts/AIAssistContext';
import { AISuggestion } from '../AISuggestion';

interface GrantorSectionProps {
  value: string;
  onChange: (grantor: string) => void;
  suggestedName?: string;
}

export function GrantorSection({ value, onChange, suggestedName }: GrantorSectionProps) {
  const { enabled: aiEnabled } = useAIAssist();
  const [guidanceDismissed, setGuidanceDismissed] = useState(false);

  useEffect(() => {
    if (!value && suggestedName) {
      onChange(suggestedName);
    }
  }, [suggestedName, value, onChange]);

  return (
    <div className="space-y-4">
      {/* AI Guidance */}
      {aiEnabled && !guidanceDismissed && !value && (
        <AISuggestion
          message="The GRANTOR is the current owner transferring the property. This should match the name on the existing deed exactly. For married couples, include both names."
          variant="info"
          onDismiss={() => setGuidanceDismissed(true)}
        />
      )}

      {suggestedName && value === suggestedName && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <Sparkles className="w-4 h-4" />
          Auto-filled from county records
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grantor Name (Current Owner)
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="JOHN SMITH"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          For multiple grantors, use &quot;and&quot; (e.g., JOHN SMITH AND JANE SMITH)
        </p>
      </div>
    </div>
  );
}

