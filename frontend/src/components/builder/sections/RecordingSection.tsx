'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';
import { useAIAssist } from '@/contexts/AIAssistContext';
import { useOwnCompany } from '@/hooks/useOwnCompany';
import { defaultRequestedBy, requestedByChoices } from '@/lib/requestedByDefault';
import { AISuggestion } from '../AISuggestion';
import { AddPartnerModal, PartnerFormData } from '@/components/modals/AddPartnerModal';

interface RecordingSectionProps {
  requestedBy: string;
  /** D2: the requesting party's mailing address (prints under their name). */
  requestedByAddress?: string;
  /** True while requestedBy holds a default nobody chose. */
  requestedByPrefilled?: boolean;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
  onChange: (updates: { requestedBy?: string; requestedByAddress?: string; requestedByPrefilled?: boolean; returnTo?: string; titleOrderNo?: string; escrowNo?: string }) => void;
}

export function RecordingSection({ requestedBy, requestedByAddress, requestedByPrefilled, returnTo, titleOrderNo, escrowNo, onChange }: RecordingSectionProps) {
  const { enabled: aiEnabled } = useAIAssist();
  const [guidanceDismissed, setGuidanceDismissed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { partners, create: createPartner, error: partnersError, refresh: refreshPartners } = usePartners();
  const { companyName, companyAddress } = useOwnCompany();

  // The officer's own company, then the rolodex. The own entry is
  // synthetic — the owner ruled against filing yourself as a partner —
  // so it exists only in this list, and only while the profile has a
  // company to put in it.
  const choices = useMemo(
    () => requestedByChoices(partners, companyName, companyAddress),
    [partners, companyName, companyAddress],
  );

  useEffect(() => {
    // Fill the box on open, and REMEMBER that we filled it. Without the
    // flag this prefill mints a draft deed for an officer who typed
    // nothing — see hasMeaningfulData.
    if (requestedBy || choices.length === 0) return;
    const chosen = defaultRequestedBy(choices, localStorage.getItem('lastPartnerUsed'));
    if (chosen.origin === 'none') return;
    onChange({
      requestedBy: chosen.value,
      ...(chosen.address ? { requestedByAddress: chosen.address } : {}),
      requestedByPrefilled: true,
    });
  }, [choices, requestedBy, onChange]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === '__ADD_NEW__') {
      setShowAddModal(true);
      return;
    }

    // D2: the partner record already carries the mailing address — selecting
    // a partner fills both the name and the address that print on the deed.
    const chosen = choices.find(c => c.label === value);
    onChange({
      requestedBy: value,
      requestedByAddress: chosen?.address || requestedByAddress || '',
      // Whatever this held before, it is now a decision rather than a
      // default — and a decision is work worth saving.
      requestedByPrefilled: false,
    });
    // Only a real partner is remembered as the last one used. Recording
    // under your own company is the fallback, not a rolodex choice — and
    // writing the synthetic id here would make it outrank the profile it
    // came from on the next deed.
    if (chosen && !chosen.own) {
      localStorage.setItem('lastPartnerUsed', chosen.id);
    }
  };

  const handlePartnerCreated = async (formData: PartnerFormData) => {
    try {
      // Create the partner
      const newPartner = await createPartner({
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        category: formData.category,
        email: formData.email,
        phone: formData.phone,
        address_line1: formData.address_line1,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        role: 'title_officer',
      });
      
      // Auto-select the new partner (use company_name as the label)
      if (newPartner?.company_name) {
        const addr = [
          [newPartner.address_line1, newPartner.address_line2].filter(Boolean).join(' '),
          [newPartner.city, [newPartner.state, newPartner.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        ].filter(Boolean).join(', ');
        // Creating a partner and having it selected is a choice, not a
        // default — this draft is worth saving.
        onChange({
          requestedBy: newPartner.company_name,
          requestedByAddress: addr,
          requestedByPrefilled: false,
        });
        localStorage.setItem('lastPartnerUsed', newPartner.id);
      }
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create partner:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Guidance */}
      {/* Shown while the box is empty OR merely pre-filled: a default is
          not a decision, and the officer who most needs this explanation
          is the one who has not chosen anything yet. */}
      {aiEnabled && !guidanceDismissed && (!requestedBy || requestedByPrefilled) && (
        <AISuggestion
          message="Select who is submitting this deed for recording. This appears in the top-left corner of the deed."
          details="The 'Recording Requested By' is typically the title company, escrow officer, or attorney handling the transaction. 'Return To' specifies where the county recorder should mail the deed after recording — usually the same party, or directly to the new owner (grantee)."
          onDismiss={() => setGuidanceDismissed(true)}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recording Requested By
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            data-builder-field="requested-by"
            value={requestedBy}
            onChange={handleSelectChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
          >
            <option value="">Select who is requesting recording...</option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.label}>
                {choice.own ? `${choice.label} (your company)` : choice.label}
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-brand-600 font-medium">
              ➕ Add New Partner
            </option>
          </select>
        </div>
        
        {/* Bug #12b: a failed partners fetch used to render exactly like an
            empty list. Failures now surface with a retry. */}
        {partnersError ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-red-600">
            <span>Couldn&apos;t load your partners: {partnersError}</span>
            <button
              type="button"
              onClick={() => refreshPartners()}
              className="underline font-medium hover:text-red-800"
            >
              Retry
            </button>
          </div>
        ) : choices.length === 0 ? (
          // `choices`, not `partners`: with a company on the profile the
          // list is not empty, and telling her there is nothing to pick
          // while her own company sits in the dropdown is a plain lie.
          <p className="mt-1 text-xs text-gray-500">
            No partners yet. Select &quot;➕ Add New Partner&quot; to create one.
          </p>
        ) : null}
      </div>

      {/* D2: the requesting party's address prints under their name in the
          deed header — filled from the partner record, editable here. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Requesting Party Address <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          data-builder-field="requested-by-address"
          value={requestedByAddress || ''}
          onChange={(e) => onChange({ requestedByAddress: e.target.value })}
          placeholder="Street, City, ST ZIP"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Add Partner Modal */}
      <AddPartnerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handlePartnerCreated}
      />

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

      {/* Reference Numbers */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title Order No.
          </label>
          <input
            type="text"
            data-builder-field="title-order-no"
            value={titleOrderNo || ''}
            onChange={(e) => onChange({ titleOrderNo: e.target.value })}
            placeholder="TC-2026-12345"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Escrow No.
          </label>
          <input
            type="text"
            data-builder-field="escrow-no"
            value={escrowNo || ''}
            onChange={(e) => onChange({ escrowNo: e.target.value })}
            placeholder="ESC-789456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

