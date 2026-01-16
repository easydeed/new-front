'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MapPin, User, Users, DollarSign, Building2, 
  ChevronDown, ChevronUp, Pencil, Check, Sparkles,
  AlertTriangle, ArrowLeft, ArrowRight, FileText, Loader2
} from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';
import { VestingInput } from '@/components/ui/VestingInput';
import { AIGuidance } from '@/components/AIGuidance';
import { aiAssistant } from '@/services/aiAssistant';
import { toast } from 'sonner';
import type { EnrichedPropertyData } from '@/components/types/PropertySearchTypes';

// Cities with their own DTT (Documentary Transfer Tax)
const CITIES_WITH_OWN_DTT = [
  'los angeles', 'san francisco', 'oakland', 'berkeley', 'san jose',
  'sacramento', 'riverside', 'pomona', 'culver city', 'santa monica',
  'redondo beach', 'hercules', 'hayward', 'richmond', 'alameda',
];

// Deed type labels for display
const DEED_TYPE_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

// DTT exemption reasons
const DTT_EXEMPTION_REASONS = [
  { value: 'R&T 11911 - Gift/No Consideration', label: 'R&T 11911 - Gift/No Consideration' },
  { value: 'R&T 11927 - Interspousal Transfer', label: 'R&T 11927 - Interspousal Transfer' },
  { value: 'R&T 11930 - Transfer to Trust', label: 'R&T 11930 - Transfer to Trust' },
  { value: 'R&T 11923 - Court Order', label: 'R&T 11923 - Court Order' },
  { value: 'R&T 11925 - Foreclosure', label: 'R&T 11925 - Foreclosure' },
  { value: 'Other', label: 'Other Exemption' },
];

interface DTTState {
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName: string;
}

interface WizardData {
  deedType: string;
  property: {
    address: string;
    city: string;
    county: string;
    state: string;
    zip: string;
    apn: string;
    legalDescription: string;
  };
  grantor: string;
  grantee: string;
  vesting: string;
  dtt: DTTState & { amount: string };
  requestedBy: string;
  returnTo: string;
}

interface SmartConfirmScreenProps {
  deedType: string;
  propertyData: EnrichedPropertyData;
  onComplete: (data: WizardData) => void;
  onBack: () => void;
}

export function SmartConfirmScreen({ 
  deedType, 
  propertyData, 
  onComplete, 
  onBack 
}: SmartConfirmScreenProps) {
  const { partners, loading: partnersLoading } = usePartners();
  
  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  
  // Property (pre-filled, editable)
  const [property, setProperty] = useState({
    address: propertyData.fullAddress || '',
    city: propertyData.city || '',
    county: propertyData.county || '',
    state: propertyData.state || 'CA',
    zip: propertyData.zip || '',
    apn: propertyData.apn || '',
    legalDescription: propertyData.legalDescription || '',
  });
  const [editingProperty, setEditingProperty] = useState(false);

  // Grantor (pre-filled from SiteX owner)
  const [grantor, setGrantor] = useState(() => {
    const primary = propertyData.currentOwnerPrimary || propertyData.currentOwner || '';
    const secondary = propertyData.currentOwnerSecondary || '';
    return secondary ? `${primary} and ${secondary}` : primary;
  });
  const [editingGrantor, setEditingGrantor] = useState(false);

  // Grantee (MANUAL - the key input)
  const [grantee, setGrantee] = useState('');
  
  // Vesting
  const [vesting, setVesting] = useState('');
  const [vestingGuidance, setVestingGuidance] = useState<any>(null);

  // Transfer Tax
  const [dtt, setDtt] = useState<DTTState>({
    isExempt: deedType === 'interspousal-transfer',
    exemptReason: deedType === 'interspousal-transfer' ? 'R&T 11927 - Interspousal Transfer' : '',
    transferValue: '',
    basis: 'full_value',
    areaType: CITIES_WITH_OWN_DTT.includes(propertyData.city?.toLowerCase() || '') ? 'city' : 'unincorporated',
    cityName: propertyData.city || '',
  });

  // Recording Info
  const [requestedBy, setRequestedBy] = useState(() => {
    // Try to get last used partner
    if (typeof window !== 'undefined') {
      const lastUsed = localStorage.getItem('lastPartnerUsed');
      if (lastUsed && partners.length > 0) {
        const partner = partners.find(p => p.id === lastUsed);
        if (partner) return partner.label;
      }
    }
    return '';
  });
  const [returnTo, setReturnTo] = useState<'same' | 'grantee' | 'other'>('same');
  const [returnToOther, setReturnToOther] = useState('');

  // UI State
  const [expandedSections, setExpandedSections] = useState({
    property: false,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────
  
  const calculatedDTT = useMemo(() => {
    if (dtt.isExempt || !dtt.transferValue) return 0;
    const value = parseFloat(dtt.transferValue.replace(/[^0-9.]/g, ''));
    if (isNaN(value)) return 0;
    
    // California DTT: $1.10 per $1000
    const countyTax = (value / 1000) * 1.10;
    
    // City tax if applicable (varies, using LA rate of $4.50 per $1000)
    const cityTax = dtt.areaType === 'city' ? (value / 1000) * 4.50 : 0;
    
    return countyTax + cityTax;
  }, [dtt]);

  const granteeCount = useMemo(() => {
    if (!grantee) return 0;
    // Count "and" separators + 1
    return (grantee.match(/\band\b/gi) || []).length + 1;
  }, [grantee]);

  // ─────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────
  
  // Fetch AI guidance when vesting changes
  useEffect(() => {
    if (!vesting || granteeCount === 0) {
      setVestingGuidance(null);
      return;
    }

    const fetchGuidance = async () => {
      try {
        const guidance = await aiAssistant.getVestingGuidance(
          vesting, 
          granteeCount, 
          { deedType, county: property.county }
        );
        setVestingGuidance(guidance);
      } catch (error) {
        console.error('Failed to fetch vesting guidance:', error);
      }
    };

    const timer = setTimeout(fetchGuidance, 500);
    return () => clearTimeout(timer);
  }, [vesting, granteeCount, deedType, property.county]);

  // Update requestedBy when partners load
  useEffect(() => {
    if (!requestedBy && partners.length > 0 && typeof window !== 'undefined') {
      const lastUsed = localStorage.getItem('lastPartnerUsed');
      if (lastUsed) {
        const partner = partners.find(p => p.id === lastUsed);
        if (partner) setRequestedBy(partner.label);
      }
    }
  }, [partners, requestedBy]);

  // ─────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────
  
  const handleGenerate = async () => {
    // Basic validation
    const errors: string[] = [];
    
    if (!grantee.trim()) {
      errors.push('Grantee name is required');
    }
    if (!vesting) {
      errors.push('Vesting is required');
    }
    if (!dtt.isExempt && !dtt.transferValue) {
      errors.push('Transfer value is required (or mark as exempt)');
    }
    if (!requestedBy) {
      errors.push('Requested By is required');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix the errors before generating');
      return;
    }

    setIsValidating(true);
    setValidationErrors([]);

    try {
      // AI validation (optional - don't block on failure)
      try {
        const aiValidation = await aiAssistant.validateBeforeSubmit({
          deedType,
          grantorName: grantor,
          granteeName: grantee,
          vesting,
          county: property.county,
          legalDescription: property.legalDescription,
          dttAmount: calculatedDTT.toFixed(2),
          dttExempt: dtt.isExempt,
          dttExemptReason: dtt.exemptReason,
        });

        if (!aiValidation.isValid && aiValidation.issues.length > 0) {
          toast.warning('AI found potential issues - review before generating');
        }
      } catch (aiError) {
        console.warn('AI validation skipped:', aiError);
      }

      // Save last used partner
      const selectedPartner = partners.find(p => p.label === requestedBy);
      if (selectedPartner && typeof window !== 'undefined') {
        localStorage.setItem('lastPartnerUsed', selectedPartner.id);
      }

      // Compile all data and proceed
      const wizardData: WizardData = {
        deedType,
        property,
        grantor,
        grantee,
        vesting,
        dtt: {
          ...dtt,
          amount: calculatedDTT.toFixed(2),
        },
        requestedBy,
        returnTo: returnTo === 'same' ? requestedBy : returnTo === 'grantee' ? grantee : returnToOther,
      };

      onComplete(wizardData);
    } finally {
      setIsValidating(false);
    }
  };

  const toggleSection = (section: 'property') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? parseInt(num).toLocaleString() : '';
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <span className="text-gray-400">Deed Type & Property</span>
        <ArrowRight className="w-4 h-4" />
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-medium">
          <span className="w-5 h-5 bg-brand-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
          Confirm Details
        </div>
        <ArrowRight className="w-4 h-4" />
        <span className="text-gray-400">Generate</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          Almost done — just confirm the details
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {DEED_TYPE_LABELS[deedType] || 'Deed'}
        </h1>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            Please fix the following:
          </div>
          <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PROPERTY SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div 
          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection('property')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{property.address}</div>
              <div className="text-sm text-gray-500">
                APN: {property.apn || 'N/A'} · {property.county} County
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> Auto-filled
            </span>
            {expandedSections.property ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {expandedSections.property && (
          <div className="mt-2 p-4 border border-gray-200 rounded-xl animate-in fade-in slide-in-from-top-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Description</label>
                <textarea
                  value={property.legalDescription}
                  onChange={(e) => setProperty({ ...property, legalDescription: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">APN</label>
                  <input
                    type="text"
                    value={property.apn}
                    onChange={(e) => setProperty({ ...property, apn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                  <input
                    type="text"
                    value={property.county}
                    onChange={(e) => setProperty({ ...property, county: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PARTIES SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-6">
          <Users className="w-5 h-5 text-brand-500" />
          Parties
        </h2>

        {/* Grantor */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {deedType === 'interspousal-transfer' ? 'Transferor Spouse (FROM)' : 'Grantor (FROM)'}
            </label>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> From county records
            </span>
          </div>
          
          {editingGrantor ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={grantor}
                onChange={(e) => setGrantor(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
              <button
                onClick={() => setEditingGrantor(false)}
                className="px-4 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setEditingGrantor(true)}
            >
              <span className="font-medium text-gray-900 uppercase">{grantor || 'Click to enter'}</span>
              <Pencil className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Grantee - THE KEY INPUT */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {deedType === 'interspousal-transfer' ? 'Transferee Spouse (TO)' : 'Grantee (TO)'}
            </label>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
              Required
            </span>
          </div>
          <input
            type="text"
            value={grantee}
            onChange={(e) => setGrantee(e.target.value)}
            placeholder="Enter the new owner's full legal name..."
            className="w-full px-4 py-4 border-2 border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-lg"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            For multiple grantees, use "and" (e.g., "John Smith and Jane Smith")
          </p>
        </div>

        {/* Vesting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vesting (How title will be held)
          </label>
          <VestingInput
            value={vesting}
            onChange={setVesting}
            granteeCount={granteeCount}
          />
          {vestingGuidance && (
            <div className="mt-2">
              <AIGuidance guidance={vestingGuidance} />
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TRANSFER TAX SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-6">
          <DollarSign className="w-5 h-5 text-brand-500" />
          Documentary Transfer Tax
        </h2>

        {/* Exempt Toggle */}
        <div className="flex items-center gap-6 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={!dtt.isExempt}
              onChange={() => setDtt({ ...dtt, isExempt: false, exemptReason: '' })}
              className="w-5 h-5 text-brand-500 focus:ring-brand-500"
            />
            <span className="font-medium text-gray-700">Calculate Tax</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={dtt.isExempt}
              onChange={() => setDtt({ ...dtt, isExempt: true })}
              className="w-5 h-5 text-brand-500 focus:ring-brand-500"
            />
            <span className="font-medium text-gray-700">Exempt</span>
          </label>
        </div>

        {dtt.isExempt ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exemption Reason
            </label>
            <select
              value={dtt.exemptReason}
              onChange={(e) => setDtt({ ...dtt, exemptReason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select exemption reason...</option>
              {DTT_EXEMPTION_REASONS.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Value
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="text"
                  value={dtt.transferValue}
                  onChange={(e) => setDtt({ ...dtt, transferValue: formatCurrency(e.target.value) })}
                  placeholder="500,000"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={dtt.basis === 'full_value'}
                  onChange={() => setDtt({ ...dtt, basis: 'full_value' })}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-sm text-gray-700">Full value</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={dtt.basis === 'less_liens'}
                  onChange={() => setDtt({ ...dtt, basis: 'less_liens' })}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-sm text-gray-700">Less liens/encumbrances</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <span className="text-sm font-medium text-gray-700">Area:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={dtt.areaType === 'city'}
                  onChange={() => setDtt({ ...dtt, areaType: 'city' })}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-sm text-gray-700">City of {dtt.cityName || '___'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={dtt.areaType === 'unincorporated'}
                  onChange={() => setDtt({ ...dtt, areaType: 'unincorporated' })}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-sm text-gray-700">Unincorporated</span>
              </label>
            </div>

            {calculatedDTT > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">Calculated DTT</span>
                  <span className="text-2xl font-bold text-green-700">
                    ${calculatedDTT.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-green-600 mt-1">
                  County: ${((parseFloat(dtt.transferValue.replace(/[^0-9.]/g, '')) || 0) / 1000 * 1.10).toFixed(2)}
                  {dtt.areaType === 'city' && ` + City: ${((parseFloat(dtt.transferValue.replace(/[^0-9.]/g, '')) || 0) / 1000 * 4.50).toFixed(2)}`}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* RECORDING INFO SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-6">
          <Building2 className="w-5 h-5 text-brand-500" />
          Recording Information
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested By
          </label>
          {partnersLoading ? (
            <div className="flex items-center gap-2 text-gray-500 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading partners...
            </div>
          ) : (
            <select
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select requesting party...</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.label}>
                  {partner.label}
                </option>
              ))}
            </select>
          )}
          {partners.length === 0 && !partnersLoading && (
            <p className="text-sm text-gray-500 mt-2">
              No partners found. You can add partners in Account Settings.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            When Recorded, Return To
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                checked={returnTo === 'same'}
                onChange={() => setReturnTo('same')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-gray-700">Same as Requested By</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                checked={returnTo === 'grantee'}
                onChange={() => setReturnTo('grantee')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-gray-700">Grantee</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                checked={returnTo === 'other'}
                onChange={() => setReturnTo('other')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-gray-700">Other</span>
            </label>
          </div>
          {returnTo === 'other' && (
            <input
              type="text"
              value={returnToOther}
              onChange={(e) => setReturnToOther(e.target.value)}
              placeholder="Enter name and address..."
              className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ACTION BUTTONS */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={isValidating}
          className="flex items-center gap-3 px-8 py-4 bg-brand-500 text-white rounded-xl font-semibold text-lg hover:bg-brand-600 shadow-brand hover:shadow-brand-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              Generate Deed
              <Sparkles className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

