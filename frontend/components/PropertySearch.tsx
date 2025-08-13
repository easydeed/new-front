'use client';

import { useState, useEffect } from 'react';
import PlacesAutocomplete, { geocodeByAddress } from 'react-places-autocomplete';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  county: string;
  zip: string;
}

interface PropertyData {
  apn?: string;
  brief_legal?: string;
  current_owner_primary?: string;
  current_owner_secondary?: string;
  success: boolean;
  message?: string;
}

interface PropertySearchProps {
  onPopulate: (data: PropertyData) => void;
}

// Initialize Google Maps Loader for TitlePoint integration
const loader = new Loader({ 
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!, 
  libraries: ['places'] 
});

export default function PropertySearch({ onPopulate }: PropertySearchProps) {
  const [address, setAddress] = useState('');
  const [selectedData, setSelectedData] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    loader.load()
      .then(() => setIsGoogleLoaded(true))
      .catch(console.error);
  }, []);

  const handleSelect = async (selected: string) => {
    setAddress(selected);
    try {
      const [place] = await geocodeByAddress(selected);
      const components = place.address_components;
      
      const data: AddressData = {
        fullAddress: place.formatted_address,
        street: place.name || `${components.find(c => c.types.includes('street_number'))?.long_name || ''} ${components.find(c => c.types.includes('route'))?.long_name || ''}`.trim(),
        city: components.find(c => c.types.includes('locality'))?.long_name || '',
        state: components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || 'CA',
        county: components.find(c => c.types.includes('administrative_area_level_2'))?.long_name?.replace(' County', '') || '',
        zip: components.find(c => c.types.includes('postal_code'))?.short_name || '',
      };
      
      setSelectedData(data);
      setError('');
    } catch (err) {
      setError('Failed to process address');
      console.error('Geocoding error:', err);
    }
  };

  const handleSearch = async () => {
    if (!selectedData) {
      setError('Please select an address first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(selectedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Search failed');
      }

      const tpData: PropertyData = await res.json();
      
      if (tpData.success) {
        onPopulate(tpData);
        setError('');
      } else {
        setError(tpData.message || 'No property data found. Please enter details manually.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Property search error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isGoogleLoaded) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 p-3 border rounded-lg bg-gray-100">
          Loading Google Maps...
        </div>
        <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
          Search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-2">
        <PlacesAutocomplete 
          value={address} 
          onChange={setAddress} 
          onSelect={handleSelect}
          searchOptions={{ 
            componentRestrictions: { country: 'us' },
            types: ['address']
          }}
        >
          {({ getInputProps, suggestions, getSuggestionItemProps, loading: autoLoading }) => (
            <div className="flex-1 relative">
              <input 
                {...getInputProps({ 
                  placeholder: 'Enter property address (e.g., 123 Main St, Los Angeles, CA)', 
                  className: 'w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                })} 
              />
              {autoLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              )}
              {suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-auto shadow-lg">
                  {suggestions.map(suggestion => (
                    <li 
                      key={suggestion.placeId} 
                      {...getSuggestionItemProps(suggestion, { 
                        className: `p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          suggestion.active ? 'bg-blue-50' : ''
                        }` 
                      })}
                    >
                      <div className="font-medium">{suggestion.formattedSuggestion.mainText}</div>
                      <div className="text-sm text-gray-500">{suggestion.formattedSuggestion.secondaryText}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PlacesAutocomplete>
        
        <button
          onClick={handleSearch}
          disabled={!selectedData || loading}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            !selectedData || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </div>
          ) : (
            'Search Property'
          )}
        </button>
      </div>

      {selectedData && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <strong>Selected:</strong> {selectedData.fullAddress}
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="font-medium">Search Error</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      )}
    </div>
  );
}
