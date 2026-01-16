# DeedPro Wizard 2.0 — Implementation Guide

## The Mission

Transform DeedPro's wizard from "collect information across 5 screens" to "confirm pre-filled information on 1 smart screen."

**Current:** 5 screens, 2-3 minutes, 15+ clicks
**Target:** 3 screens, <60 seconds, 8 clicks

---

## The New Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   STEP 1: DEED TYPE + PROPERTY                                  │
│   ════════════════════════════════════════════════════════════ │
│                                                                 │
│   • Select deed type (5 options)                                │
│   • Search property (Google Places)                             │
│   • SiteX enrichment (auto)                                     │
│   • Multi-match picker (if needed)                              │
│                                                                 │
│   TIME: ~15 seconds                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   STEP 2: SMART CONFIRM                                         │
│   ════════════════════════════════════════════════════════════ │
│                                                                 │
│   ONE SCREEN with everything:                                   │
│   • Property details (read-only, edit button)                   │
│   • Grantor (pre-filled from SiteX)                            │
│   • Grantee (MANUAL - the only required input)                 │
│   • Vesting (dropdown with AI guidance)                        │
│   • Transfer Tax (calculate or exempt)                         │
│   • Recording Info (partner dropdown)                          │
│                                                                 │
│   TIME: ~30 seconds                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   STEP 3: GENERATE + SUCCESS                                    │
│   ════════════════════════════════════════════════════════════ │
│                                                                 │
│   • AI validation (instant)                                     │
│   • Generate PDF                                                │
│   • Success screen with actions                                 │
│                                                                 │
│   TIME: ~10 seconds                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

TOTAL: ~55 seconds
```

---

## Step 1: Deed Type + Property

### Component: `DeedTypePropertyStep.tsx`

This combines deed type selection with property search in one screen.

```tsx
// frontend/src/features/wizard/components/DeedTypePropertyStep.tsx

'use client';

import { useState, useCallback } from 'react';
import { FileText, ArrowRight, Clock } from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { PropertyMatchPicker } from '@/components/PropertyMatchPicker';
import { EnrichmentStatus } from '@/components/EnrichmentStatus';
import { RecentPropertiesDropdown } from '@/components/RecentPropertiesDropdown';

// Deed type definitions
const DEED_TYPES = [
  { 
    id: 'grant-deed', 
    name: 'Grant Deed', 
    description: 'Standard transfer of ownership',
    icon: '📜'
  },
  { 
    id: 'quitclaim-deed', 
    name: 'Quitclaim Deed', 
    description: 'Transfer without warranties',
    icon: '📋'
  },
  { 
    id: 'interspousal-transfer', 
    name: 'Interspousal Transfer', 
    description: 'Between spouses (DTT exempt)',
    icon: '💑'
  },
  { 
    id: 'warranty-deed', 
    name: 'Warranty Deed', 
    description: 'Transfer with full warranties',
    icon: '🛡️'
  },
  { 
    id: 'tax-deed', 
    name: 'Tax Deed', 
    description: 'From tax sale',
    icon: '🏛️'
  },
];

interface DeedTypePropertyStepProps {
  onComplete: (data: {
    deedType: string;
    propertyData: PropertyData;
  }) => void;
}

export function DeedTypePropertyStep({ onComplete }: DeedTypePropertyStepProps) {
  const [selectedDeedType, setSelectedDeedType] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'enriching' | 'multi-match' | 'complete' | 'error'>('idle');
  const [multiMatches, setMultiMatches] = useState<PropertyMatch[]>([]);

  // Handle property search via SiteX
  const handleAddressSelect = useCallback(async (place: google.maps.places.PlaceResult) => {
    setSearchStatus('searching');
    
    try {
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          address: extractStreetAddress(place),
          city: extractCity(place),
          state: 'CA',
          zip_code: extractZip(place),
        }),
      });

      const result = await response.json();

      if (result.status === 'multi_match') {
        setMultiMatches(result.matches);
        setSearchStatus('multi-match');
      } else if (result.status === 'success') {
        setSearchStatus('enriching');
        // Brief pause to show enrichment animation
        await new Promise(resolve => setTimeout(resolve, 600));
        setPropertyData(result.data);
        setSearchStatus('complete');
      } else {
        setSearchStatus('error');
      }
    } catch (error) {
      console.error('Property search error:', error);
      setSearchStatus('error');
    }
  }, []);

  // Handle multi-match selection
  const handleMatchSelect = useCallback(async (match: PropertyMatch) => {
    setSearchStatus('enriching');
    setMultiMatches([]);

    try {
      const response = await fetch('/api/property/resolve-match', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ fips: match.fips, apn: match.apn }),
      });

      const result = await response.json();
      if (result.status === 'success') {
        setPropertyData(result.data);
        setSearchStatus('complete');
      } else {
        setSearchStatus('error');
      }
    } catch (error) {
      setSearchStatus('error');
    }
  }, []);

  // Can proceed when deed type selected AND property enriched
  const canProceed = selectedDeedType && propertyData && searchStatus === 'complete';

  const handleContinue = () => {
    if (canProceed) {
      onComplete({
        deedType: selectedDeedType,
        propertyData: propertyData,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Deed Type Selection */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          What type of deed?
        </h2>
        <p className="text-gray-500 mb-6">
          Select the deed type for this transaction
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DEED_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedDeedType(type.id)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-200
                ${selectedDeedType === type.id 
                  ? 'border-brand-500 bg-brand-50 shadow-brand' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="font-medium text-gray-900">{type.name}</div>
              <div className="text-sm text-gray-500">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Property Search */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Which property?
        </h2>
        <p className="text-gray-500 mb-4">
          Search by address — we'll pull the details automatically
        </p>

        <GooglePlacesAutocomplete
          onPlaceSelect={handleAddressSelect}
          disabled={searchStatus === 'searching' || searchStatus === 'enriching'}
          placeholder="Start typing the property address..."
          className="mb-3"
        />

        {/* Recent Properties */}
        <RecentPropertiesDropdown
          onSelect={(property) => {
            // Re-search to get fresh SiteX data
            handleAddressSelect({ 
              formatted_address: property.address 
            } as google.maps.places.PlaceResult);
          }}
        />

        {/* Enrichment Status */}
        <EnrichmentStatus 
          status={searchStatus}
          data={propertyData}
        />

        {/* Multi-Match Picker */}
        {searchStatus === 'multi-match' && (
          <PropertyMatchPicker
            matches={multiMatches}
            onSelect={handleMatchSelect}
            onCancel={() => {
              setSearchStatus('idle');
              setMultiMatches([]);
            }}
          />
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
            ${canProceed 
              ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-brand' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## Step 2: Smart Confirm Screen

### Component: `SmartConfirmScreen.tsx`

This is the magic screen — everything on one page, pre-filled where possible.

```tsx
// frontend/src/features/wizard/components/SmartConfirmScreen.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, User, Users, DollarSign, Building2, 
  ChevronDown, ChevronUp, Pencil, Check, Sparkles,
  AlertTriangle
} from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';
import { VestingInput } from '@/components/ui/VestingInput';
import { AIGuidance } from '@/components/AIGuidance';
import { aiAssistant } from '@/services/aiAssistant';
import { toast } from 'sonner';

interface SmartConfirmScreenProps {
  deedType: string;
  propertyData: PropertyData;
  onComplete: (data: WizardData) => void;
  onBack: () => void;
}

// Cities with their own DTT
const CITIES_WITH_OWN_DTT = [
  'los angeles', 'san francisco', 'oakland', 'berkeley', 'san jose',
  'sacramento', 'riverside', 'pomona', 'culver city', 'santa monica',
  'redondo beach', 'hercules', 'hayward', 'richmond', 'alameda',
];

export function SmartConfirmScreen({ 
  deedType, 
  propertyData, 
  onComplete, 
  onBack 
}: SmartConfirmScreenProps) {
  const { partners } = usePartners();
  
  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  
  // Property (pre-filled, editable)
  const [property, setProperty] = useState({
    address: propertyData.address || '',
    city: propertyData.city || '',
    county: propertyData.county || '',
    state: propertyData.state || 'CA',
    zip: propertyData.zip_code || '',
    apn: propertyData.apn || '',
    legalDescription: propertyData.legal_description || '',
  });
  const [editingProperty, setEditingProperty] = useState(false);

  // Grantor (pre-filled from SiteX owner)
  const [grantor, setGrantor] = useState(() => {
    const primary = propertyData.primary_owner?.full_name || '';
    const secondary = propertyData.secondary_owner?.full_name || '';
    return secondary ? `${primary} and ${secondary}` : primary;
  });
  const [editingGrantor, setEditingGrantor] = useState(false);

  // Grantee (MANUAL - the key input)
  const [grantee, setGrantee] = useState('');
  
  // Vesting
  const [vesting, setVesting] = useState(propertyData.vesting_type || '');
  const [vestingGuidance, setVestingGuidance] = useState<AIGuidance | null>(null);

  // Transfer Tax
  const [dtt, setDtt] = useState({
    isExempt: deedType === 'interspousal-transfer', // Auto-exempt for interspousal
    exemptReason: deedType === 'interspousal-transfer' ? 'R&T 11927 - Interspousal Transfer' : '',
    transferValue: '',
    basis: 'full_value' as 'full_value' | 'less_liens',
    areaType: CITIES_WITH_OWN_DTT.includes(propertyData.city?.toLowerCase() || '') ? 'city' : 'unincorporated' as 'city' | 'unincorporated',
    cityName: propertyData.city || '',
  });

  // Recording Info
  const [requestedBy, setRequestedBy] = useState(() => {
    // Try to get last used partner
    const lastUsed = localStorage.getItem('lastPartnerUsed');
    if (lastUsed) {
      const partner = partners.find(p => p.id === lastUsed);
      if (partner) return partner.label;
    }
    return '';
  });
  const [returnTo, setReturnTo] = useState<'same' | 'grantee' | 'other'>('same');
  const [returnToOther, setReturnToOther] = useState('');

  // UI State
  const [expandedSections, setExpandedSections] = useState({
    property: false,
    grantor: false,
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
      const guidance = await aiAssistant.getVestingGuidance(
        vesting, 
        granteeCount, 
        { deedType, county: property.county }
      );
      setVestingGuidance(guidance);
    };

    const timer = setTimeout(fetchGuidance, 500);
    return () => clearTimeout(timer);
  }, [vesting, granteeCount, deedType, property.county]);

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

    // AI validation
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

    setIsValidating(false);

    if (!aiValidation.isValid && aiValidation.issues.length > 0) {
      // Show AI warnings but don't block
      toast.warning('AI found potential issues - review before generating');
    }

    // Save last used partner
    const selectedPartner = partners.find(p => p.label === requestedBy);
    if (selectedPartner) {
      localStorage.setItem('lastPartnerUsed', selectedPartner.id);
    }

    // Compile all data and proceed
    onComplete({
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
    });
  };

  const toggleSection = (section: 'property' | 'grantor') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  
  const deedTypeLabels: Record<string, string> = {
    'grant-deed': 'Grant Deed',
    'quitclaim-deed': 'Quitclaim Deed',
    'interspousal-transfer': 'Interspousal Transfer Deed',
    'warranty-deed': 'Warranty Deed',
    'tax-deed': 'Tax Deed',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          Almost done — just confirm the details
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {deedTypeLabels[deedType] || 'Deed'}
        </h1>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            Please fix the following:
          </div>
          <ul className="list-disc list-inside text-red-600 text-sm">
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
                APN: {property.apn} · {property.county} County
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
          <div className="mt-2 p-4 border border-gray-200 rounded-xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Description</label>
                <textarea
                  value={property.legalDescription}
                  onChange={(e) => setProperty({ ...property, legalDescription: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {/* Add more editable fields as needed */}
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PARTIES SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Users className="w-5 h-5 text-brand-500" />
          Parties
        </h2>

        {/* Grantor */}
        <div className="mb-4">
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => setEditingGrantor(false)}
                className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => setEditingGrantor(true)}
            >
              <span className="font-medium text-gray-900 uppercase">{grantor || 'Click to enter'}</span>
              <Pencil className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Grantee - THE KEY INPUT */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {deedType === 'interspousal-transfer' ? 'Transferee Spouse (TO)' : 'Grantee (TO)'}
            </label>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Required
            </span>
          </div>
          <input
            type="text"
            value={grantee}
            onChange={(e) => setGrantee(e.target.value)}
            placeholder="Enter the new owner's full legal name..."
            className="w-full px-4 py-3 border-2 border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-lg"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
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
            <AIGuidance guidance={vestingGuidance} />
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TRANSFER TAX SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <DollarSign className="w-5 h-5 text-brand-500" />
          Documentary Transfer Tax
        </h2>

        {/* Exempt Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!dtt.isExempt}
              onChange={() => setDtt({ ...dtt, isExempt: false })}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Calculate Tax</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={dtt.isExempt}
              onChange={() => setDtt({ ...dtt, isExempt: true })}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Exempt</span>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select exemption reason...</option>
              <option value="R&T 11911 - Gift/No Consideration">R&T 11911 - Gift/No Consideration</option>
              <option value="R&T 11927 - Interspousal Transfer">R&T 11927 - Interspousal Transfer</option>
              <option value="R&T 11930 - Transfer to Trust">R&T 11930 - Transfer to Trust</option>
              <option value="R&T 11923 - Court Order">R&T 11923 - Court Order</option>
              <option value="R&T 11925 - Foreclosure">R&T 11925 - Foreclosure</option>
              <option value="Other">Other Exemption</option>
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={dtt.transferValue}
                  onChange={(e) => {
                    // Format as currency
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    const formatted = value ? parseInt(value).toLocaleString() : '';
                    setDtt({ ...dtt, transferValue: formatted });
                  }}
                  placeholder="500,000"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">Area:</span>
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
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="text-green-700 font-medium">
                  Calculated DTT: ${calculatedDTT.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* RECORDING INFO SECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-8 p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Building2 className="w-5 h-5 text-brand-500" />
          Recording Information
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested By
          </label>
          <select
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select or type...</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.label}>
                {partner.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            When Recorded, Return To
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={returnTo === 'same'}
                onChange={() => setReturnTo('same')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Same as Requested By</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={returnTo === 'grantee'}
                onChange={() => setReturnTo('grantee')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Grantee</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={returnTo === 'other'}
                onChange={() => setReturnTo('other')}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Other</span>
            </label>
          </div>
          {returnTo === 'other' && (
            <input
              type="text"
              value={returnToOther}
              onChange={(e) => setReturnToOther(e.target.value)}
              placeholder="Enter name and address..."
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ACTION BUTTONS */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={isValidating}
          className="flex items-center gap-2 px-8 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 shadow-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
```

---

## Step 3: Success Screen

### Component: `SuccessScreen.tsx`

```tsx
// frontend/src/features/wizard/components/SuccessScreen.tsx

'use client';

import { useState } from 'react';
import { 
  CheckCircle, Download, Share2, Printer, Eye,
  Plus, ArrowRight, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface SuccessScreenProps {
  deedType: string;
  propertyAddress: string;
  pdfUrl: string;
  deedId: number;
  onCreateAnother: () => void;
  onSamePropertyDifferentDeed: () => void;
  onGoToDashboard: () => void;
}

export function SuccessScreen({
  deedType,
  propertyAddress,
  pdfUrl,
  deedId,
  onCreateAnother,
  onSamePropertyDifferentDeed,
  onGoToDashboard,
}: SuccessScreenProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
    toast.success('PDF downloaded');
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handlePreview = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Success Animation */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-once">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Deed Generated!
        </h1>
        <p className="text-gray-500">
          {deedType} for {propertyAddress}
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <button
          onClick={handlePreview}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors"
        >
          <Eye className="w-6 h-6 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">Preview</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors"
        >
          <Download className="w-6 h-6 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">Download</span>
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors"
        >
          <Share2 className="w-6 h-6 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">Share</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors"
        >
          <Printer className="w-6 h-6 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">Print</span>
        </button>
      </div>

      {/* What's Next */}
      <div className="space-y-3">
        <p className="text-sm text-gray-500 mb-4">What's next?</p>
        
        <button
          onClick={onCreateAnother}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 shadow-brand"
        >
          <Plus className="w-5 h-5" />
          Create Another Deed
        </button>
        
        <button
          onClick={onSamePropertyDifferentDeed}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
        >
          <RotateCcw className="w-5 h-5" />
          Same Property, Different Deed Type
        </button>
        
        <button
          onClick={onGoToDashboard}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-500 hover:text-gray-700"
        >
          Back to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Share Modal would go here */}
    </div>
  );
}
```

---

## Integration: Update Wizard Host

### File: `WizardHost.tsx` or `ModernEngine.tsx`

```tsx
// Simplified wizard flow

type WizardStep = 'deed-type-property' | 'smart-confirm' | 'success';

export function WizardHost() {
  const [step, setStep] = useState<WizardStep>('deed-type-property');
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [generatedDeed, setGeneratedDeed] = useState<GeneratedDeed | null>(null);

  // Step 1 complete
  const handleDeedTypePropertyComplete = (data: { deedType: string; propertyData: PropertyData }) => {
    setWizardData(prev => ({
      ...prev,
      deedType: data.deedType,
      propertyData: data.propertyData,
    }));
    setStep('smart-confirm');
  };

  // Step 2 complete - Generate PDF
  const handleSmartConfirmComplete = async (data: WizardData) => {
    setWizardData(data);
    
    try {
      const response = await fetch('/api/deeds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      setGeneratedDeed(result);
      setStep('success');
    } catch (error) {
      toast.error('Failed to generate deed');
    }
  };

  // Render current step
  switch (step) {
    case 'deed-type-property':
      return (
        <DeedTypePropertyStep 
          onComplete={handleDeedTypePropertyComplete}
        />
      );
    
    case 'smart-confirm':
      return (
        <SmartConfirmScreen
          deedType={wizardData.deedType!}
          propertyData={wizardData.propertyData!}
          onComplete={handleSmartConfirmComplete}
          onBack={() => setStep('deed-type-property')}
        />
      );
    
    case 'success':
      return (
        <SuccessScreen
          deedType={wizardData.deedType!}
          propertyAddress={wizardData.propertyData!.address}
          pdfUrl={generatedDeed!.pdf_url}
          deedId={generatedDeed!.id}
          onCreateAnother={() => {
            setWizardData({});
            setGeneratedDeed(null);
            setStep('deed-type-property');
          }}
          onSamePropertyDifferentDeed={() => {
            setWizardData(prev => ({ propertyData: prev.propertyData }));
            setGeneratedDeed(null);
            setStep('deed-type-property');
          }}
          onGoToDashboard={() => {
            window.location.href = '/dashboard';
          }}
        />
      );
  }
}
```

---

## Files Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `features/wizard/components/DeedTypePropertyStep.tsx` | Combined deed type + property search |
| `features/wizard/components/SmartConfirmScreen.tsx` | The main smart confirm screen |
| `features/wizard/components/SuccessScreen.tsx` | Post-generation success screen |
| `features/wizard/WizardHost.tsx` | Simple 3-step orchestrator |

### Files to Deprecate/Remove
| File | Reason |
|------|--------|
| Individual question screens | Replaced by SmartConfirmScreen |
| `SmartReview.tsx` | Functionality merged into SmartConfirmScreen |
| `promptFlows.ts` step configs | Simplified to 3 steps |

### Files to Modify
| File | Changes |
|------|---------|
| `ModernEngine.tsx` | Simplify to use new components |
| `ProgressBar.tsx` | Update for 3 steps |

---

## Success Criteria

After implementation:
- [ ] Wizard completes in <60 seconds (happy path)
- [ ] Only 2-3 manual inputs required
- [ ] SiteX prefills property, grantor, APN, legal description
- [ ] Partners prefills Requested By
- [ ] AI guides vesting selection
- [ ] DTT auto-calculates or auto-exempts
- [ ] Success screen has all actions (download, share, print)
- [ ] Mobile/tablet friendly
