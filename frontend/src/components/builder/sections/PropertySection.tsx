'use client';

import { useState } from 'react';
import { MapPin, Search, Check, Loader2 } from 'lucide-react';
import { PropertyData } from '@/types/builder';

interface PropertySectionProps {
  value: PropertyData | null;
  onChange: (property: PropertyData | null) => void;
  onComplete: () => void;
}

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (address: string) => {
    if (!address.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ address }),
      });

      const result = await response.json();
      
      if (result.status === 'success' || result.data) {
        const propertyData: PropertyData = {
          address: result.data?.address || address,
          city: result.data?.city || '',
          county: result.data?.county || '',
          state: result.data?.state || 'CA',
          zip: result.data?.zip || '',
          apn: result.data?.apn || '',
          legalDescription: result.data?.legal_description || result.data?.legalDescription || '',
          owner: result.data?.owner || result.data?.owner_name || '',
        };
        onChange(propertyData);
        onComplete();
      } else {
        setError('Property not found. Please check the address.');
      }
    } catch (err) {
      console.error('Property search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  if (value?.address) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-1">
                <Check className="w-4 h-4" />
                Property Found
              </div>
              <p className="font-semibold text-gray-900">{value.address}</p>
              <p className="text-sm text-gray-600 mt-1">
                APN: {value.apn || 'N/A'} · {value.county || 'Unknown'} County
              </p>
            </div>
            <button
              onClick={() => onChange(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        </div>

        {value.legalDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Description
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
              {value.legalDescription}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
          placeholder="Enter property address..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          autoFocus
        />
        {isSearching ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 animate-spin" />
        ) : searchQuery && (
          <button
            onClick={() => handleSearch(searchQuery)}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <Search className="w-5 h-5 text-brand-500 hover:text-brand-600" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <p className="text-sm text-gray-500">
        Start typing an address and we&apos;ll pull the APN, owner, and legal description automatically.
      </p>
    </div>
  );
}

