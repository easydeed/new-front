'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileText, ArrowRight, Clock, MapPin, Search, X, Check, AlertCircle,
  Home, User
} from 'lucide-react';
import { useGoogleMaps } from '@/components/hooks/useGoogleMaps';
import { extractStreetAddress, getComponent, getCountyFallback } from '@/components/utils/addressHelpers';
import PropertyMatchPicker from '@/components/PropertyMatchPicker';
import { EnrichmentStatus } from '@/components/EnrichmentStatus';
import RecentPropertiesDropdown from '@/components/RecentPropertiesDropdown';
import type { PropertyData, GoogleAutocompletePrediction, EnrichedPropertyData } from '@/components/types/PropertySearchTypes';

// Deed type definitions with friendly descriptions
const DEED_TYPES = [
  { 
    id: 'grant-deed', 
    name: 'Grant Deed', 
    description: 'Standard transfer of ownership',
    icon: '📜',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400'
  },
  { 
    id: 'quitclaim-deed', 
    name: 'Quitclaim Deed', 
    description: 'Transfer without warranties',
    icon: '📋',
    color: 'bg-amber-50 border-amber-200 hover:border-amber-400'
  },
  { 
    id: 'interspousal-transfer', 
    name: 'Interspousal Transfer', 
    description: 'Between spouses (DTT exempt)',
    icon: '💑',
    color: 'bg-pink-50 border-pink-200 hover:border-pink-400'
  },
  { 
    id: 'warranty-deed', 
    name: 'Warranty Deed', 
    description: 'Transfer with full warranties',
    icon: '🛡️',
    color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
  },
  { 
    id: 'tax-deed', 
    name: 'Tax Deed', 
    description: 'From tax sale',
    icon: '🏛️',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400'
  },
];

interface PropertyMatch {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  apn: string;
  fips: string;
  owner_name: string;
  property_type?: string;
}

interface DeedTypePropertyStepProps {
  onComplete: (data: {
    deedType: string;
    propertyData: EnrichedPropertyData;
  }) => void;
  initialDeedType?: string;
  initialPropertyData?: EnrichedPropertyData;
}

export function DeedTypePropertyStep({ 
  onComplete, 
  initialDeedType,
  initialPropertyData 
}: DeedTypePropertyStepProps) {
  // Deed type state
  const [selectedDeedType, setSelectedDeedType] = useState<string | null>(initialDeedType || null);
  
  // Property search state
  const [inputValue, setInputValue] = useState(initialPropertyData?.fullAddress || '');
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(
    initialPropertyData ? {
      fullAddress: initialPropertyData.fullAddress,
      street: initialPropertyData.street,
      city: initialPropertyData.city,
      state: initialPropertyData.state,
      zip: initialPropertyData.zip,
      county: initialPropertyData.county,
    } : null
  );
  
  // Property data state
  const [propertyData, setPropertyData] = useState<EnrichedPropertyData | null>(initialPropertyData || null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'enriching' | 'multi-match' | 'complete' | 'error'>(
    initialPropertyData ? 'complete' : 'idle'
  );
  const [multiMatches, setMultiMatches] = useState<PropertyMatch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Google Maps hook
  const { isGoogleLoaded, autocompleteService, placesService } = useGoogleMaps(
    (error) => setErrorMessage(error)
  );

  // Search places using Google Autocomplete
  const searchPlaces = useCallback((input: string) => {
    if (!autocompleteService || !input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    const request = {
      input,
      types: ['address'],
      componentRestrictions: { country: 'us' },
    };

    autocompleteService.getPlacePredictions(request, (predictions, status) => {
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
        setSuggestions(predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
  }, [autocompleteService]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setSelectedAddress(null);
    setPropertyData(null);
    setErrorMessage(null);
    setSearchStatus('idle');
    setSelectedSuggestionIndex(-1);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  }, [searchPlaces]);

  // Process selected suggestion and get place details
  const processSelectedSuggestion = useCallback(async (suggestion: GoogleAutocompletePrediction) => {
    if (!placesService) return null;

    return new Promise<PropertyData | null>((resolve) => {
      placesService.getDetails({ placeId: suggestion.place_id }, (place, status) => {
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place?.address_components) {
          const addressComponents = place.address_components;
          
          const propertyData: PropertyData = {
            fullAddress: place.formatted_address || suggestion.description,
            street: extractStreetAddress(addressComponents),
            city: getComponent(addressComponents, 'locality'),
            state: getComponent(addressComponents, 'administrative_area_level_1'),
            zip: getComponent(addressComponents, 'postal_code'),
            county: getCountyFallback(addressComponents),
            placeId: suggestion.place_id,
          };

          resolve(propertyData);
        } else {
          resolve(null);
        }
      });
    });
  }, [placesService]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(async (suggestion: GoogleAutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchStatus('searching');

    const addressData = await processSelectedSuggestion(suggestion);
    
    if (addressData) {
      setSelectedAddress(addressData);
      // Auto-trigger SiteX lookup
      await handleSiteXLookup(addressData);
    } else {
      setErrorMessage('Failed to retrieve address details');
      setSearchStatus('error');
    }
  }, [processSelectedSuggestion]);

  // Handle SiteX property lookup
  const handleSiteXLookup = useCallback(async (address: PropertyData) => {
    setSearchStatus('enriching');
    setErrorMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search-v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullAddress: address.fullAddress,
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          county: address.county,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Property lookup failed');
      }

      const data = await response.json();

      if (data.status === 'error' || data.status === 'not_found') {
        throw new Error(data.message || 'Property not found');
      }

      // Handle multi-match
      if (data.status === 'multi_match' && data.matches?.length > 1) {
        setMultiMatches(data.matches);
        setSearchStatus('multi-match');
        return;
      }

      // Single match - process enrichment
      const propData = data.data || (data.matches && data.matches[0]) || data;
      
      const enrichedData: EnrichedPropertyData = {
        ...address,
        apn: propData.apn || '',
        county: propData.county || address.county || '',
        legalDescription: propData.legal_description || propData.legalDescription || '',
        currentOwner: propData.owner_name || propData.primary_owner?.full_name || '',
        currentOwnerPrimary: propData.owner_name || propData.primary_owner?.full_name || '',
        currentOwnerSecondary: propData.secondary_owner?.full_name || '',
        fips: propData.fips || '',
      };

      setPropertyData(enrichedData);
      setSearchStatus('complete');

    } catch (error) {
      console.error('SiteX lookup error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Property lookup failed');
      setSearchStatus('error');
    }
  }, []);

  // Handle multi-match selection
  const handleMatchSelect = useCallback(async (match: PropertyMatch) => {
    setMultiMatches([]);
    setSearchStatus('enriching');

    const baseAddress: PropertyData = {
      fullAddress: `${match.address}, ${match.city}, ${match.state} ${match.zip_code}`,
      street: match.address,
      city: match.city,
      state: match.state,
      zip: match.zip_code,
      county: '',
      placeId: '',
    };

    const enrichedData: EnrichedPropertyData = {
      ...baseAddress,
      apn: match.apn || '',
      currentOwner: match.owner_name || '',
      currentOwnerPrimary: match.owner_name || '',
      fips: match.fips || '',
    };

    setSelectedAddress(baseAddress);
    setInputValue(baseAddress.fullAddress);
    setPropertyData(enrichedData);
    setSearchStatus('complete');
  }, []);

  // Handle recent property selection
  const handleRecentSelect = useCallback((property: any) => {
    const enrichedData: EnrichedPropertyData = {
      fullAddress: `${property.address}, ${property.city}, ${property.state}`,
      street: property.address,
      city: property.city,
      state: property.state,
      zip: '',
      county: property.county,
      apn: property.apn,
      legalDescription: property.legalDescription || '',
      currentOwner: property.ownerName,
      currentOwnerPrimary: property.ownerName,
    };

    setSelectedAddress(enrichedData);
    setInputValue(enrichedData.fullAddress);
    setPropertyData(enrichedData);
    setSearchStatus('complete');
  }, []);

  // Clear property search
  const handleClearProperty = useCallback(() => {
    setInputValue('');
    setSelectedAddress(null);
    setPropertyData(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchStatus('idle');
    setErrorMessage(null);
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation for suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex, handleSelectSuggestion]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Can proceed check
  const canProceed = selectedDeedType && propertyData && searchStatus === 'complete';

  const handleContinue = () => {
    if (canProceed && propertyData) {
      onComplete({
        deedType: selectedDeedType,
        propertyData: propertyData,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-medium">
          <span className="w-5 h-5 bg-brand-500 text-white rounded-full text-xs flex items-center justify-center">1</span>
          Deed Type & Property
        </div>
        <ArrowRight className="w-4 h-4" />
        <span className="text-gray-400">Confirm Details</span>
        <ArrowRight className="w-4 h-4" />
        <span className="text-gray-400">Generate</span>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* DEED TYPE SELECTION */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
                  ? 'border-brand-500 bg-brand-50 shadow-brand ring-2 ring-brand-200' 
                  : `border-gray-200 hover:border-gray-300 hover:bg-gray-50`
                }
              `}
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="font-semibold text-gray-900">{type.name}</div>
              <div className="text-sm text-gray-500 mt-1">{type.description}</div>
              {selectedDeedType === type.id && (
                <div className="mt-2 flex items-center gap-1 text-brand-600 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PROPERTY SEARCH */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Which property?
          </h2>
          <RecentPropertiesDropdown onSelect={handleRecentSelect} />
        </div>
        <p className="text-gray-500 mb-6">
          Search by address — we'll pull the details automatically
        </p>

        {/* Search Input */}
        <div className="relative" ref={suggestionsRef}>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start typing a California address..."
              disabled={searchStatus === 'enriching'}
              className="w-full pl-12 pr-10 py-4 text-lg rounded-xl border-2 border-gray-200 
                       focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 
                       transition-all duration-200 
                       placeholder:text-gray-400
                       disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            {inputValue && searchStatus !== 'enriching' && (
              <button
                onClick={handleClearProperty}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-none flex items-start gap-3
                    ${index === selectedSuggestionIndex ? 'bg-brand-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <MapPin className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Enrichment Status */}
        <EnrichmentStatus 
          status={searchStatus === 'multi-match' ? 'idle' : searchStatus}
          data={propertyData}
          errorMessage={errorMessage || undefined}
        />

        {/* Multi-Match Picker */}
        {searchStatus === 'multi-match' && multiMatches.length > 0 && (
          <PropertyMatchPicker
            matches={multiMatches}
            onSelect={handleMatchSelect}
            onCancel={() => {
              setSearchStatus('idle');
              setMultiMatches([]);
            }}
            searchAddress={inputValue}
            isLoading={false}
          />
        )}

        {/* Error Message */}
        {errorMessage && searchStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-900">Property lookup failed</div>
              <div className="text-sm text-red-700">{errorMessage}</div>
            </div>
            <button onClick={handleClearProperty} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Property Details Card */}
        {propertyData && searchStatus === 'complete' && (
          <div className="mt-6 p-6 bg-white border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Property Found</div>
                <div className="text-sm text-green-600">Details pulled from county records</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</div>
                <div className="font-medium text-gray-900">{propertyData.fullAddress}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">APN</div>
                <div className="font-medium text-gray-900">{propertyData.apn || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">County</div>
                <div className="font-medium text-gray-900">{propertyData.county || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Owner</div>
                <div className="font-medium text-gray-900">{propertyData.currentOwner || 'N/A'}</div>
              </div>
            </div>

            <button 
              onClick={handleClearProperty}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Search a different property
            </button>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CONTINUE BUTTON */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200
            ${canProceed 
              ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-brand hover:shadow-brand-lg transform hover:-translate-y-0.5' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Confirm
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Hint */}
      {!canProceed && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {!selectedDeedType && !propertyData && 'Select a deed type and search for a property to continue'}
          {selectedDeedType && !propertyData && 'Now search for the property address'}
          {!selectedDeedType && propertyData && 'Now select a deed type above'}
        </div>
      )}
    </div>
  );
}

