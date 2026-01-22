'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';
import { useAIAssist } from '@/contexts/AIAssistContext';
import { AISuggestion } from '../AISuggestion';
import { AddPartnerModal, PartnerFormData } from '@/components/modals/AddPartnerModal';

interface RecordingSectionProps {
  requestedBy: string;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
  onChange: (updates: { requestedBy?: string; returnTo?: string; titleOrderNo?: string; escrowNo?: string }) => void;
}

export function RecordingSection({ requestedBy, returnTo, titleOrderNo, escrowNo, onChange }: RecordingSectionProps) {
  const { enabled: aiEnabled } = useAIAssist();
  const [guidanceDismissed, setGuidanceDismissed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { partners, create: createPartner } = usePartners();
  
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === '__ADD_NEW__') {
      setShowAddModal(true);
      return;
    }
    
    onChange({ requestedBy: value });
    const partner = partners.find(p => p.label === value);
    if (partner) {
      localStorage.setItem('lastPartnerUsed', partner.id);
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
        onChange({ requestedBy: newPartner.company_name });
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
      {aiEnabled && !guidanceDismissed && !requestedBy && (
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
            value={requestedBy}
            onChange={handleSelectChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
          >
            <option value="">Select partner...</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.label}>
                {partner.label}
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-brand-600 font-medium">
              ➕ Add New Partner
            </option>
          </select>
        </div>
        
        {/* Helper text for empty state */}
        {partners.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            No partners yet. Select "➕ Add New Partner" to create one.
          </p>
        )}
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

