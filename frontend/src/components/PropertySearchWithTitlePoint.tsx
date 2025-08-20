'use client';

import { useState, useEffect, useRef } from 'react';

// Types for property data
interface PropertyData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  placeId: string;
  // TitlePoint data
  apn?: string;
  county?: string;
  legalDescription?: string;
  grantorName?: string;
  currentOwnerPrimary?: string;
  currentOwnerSecondary?: string;
}

interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function PropertySearchWithTitlePoint({ 
  onVerified, 
  onError, 
  placeholder = "Enter property address",
  className = ""
}: PropertySearchProps) {
  
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(null);
  const [isTitlePointLoading, setIsTitlePointLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Google Maps API
  useEffect(() => {
    const initializeGoogle = async () => {
      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        initializeServices();
        return;
      }

      // Load Google Maps API if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsGoogleLoaded(true);
        initializeServices();
      };
      
      script.onerror = () => {
        onError?.('Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
    };

    const initializeServices = () => {
      if (window.google && window.google.maps) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        
        // Create a div element for PlacesService (required)
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv);
        placesService.current = new window.google.maps.places.PlacesService(map);
      }
    };

    initializeGoogle();
  }, [onError]);

  // Handle input change with debounced search
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedAddress(null); // Clear selection when typing

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Increased debounce time to reduce lag and interference
    timeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 500);
  };

  // Search for places using Google Places API
  const searchPlaces = (input: string) => {
    if (!autocompleteService.current || !isGoogleLoaded) {
      return;
    }

    setIsLoading(true);

    const request = {
      input,
      componentRestrictions: { country: 'us' },
      types: ['address']
    };

    autocompleteService.current.getPlacePredictions(
      request,
      (predictions: any[], status: any) => {
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  // Handle suggestion selection (Google Places)
  const handleSuggestionSelect = (suggestion: any) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    // Get detailed place information
    const request = {
      placeId: suggestion.place_id,
      fields: ['address_components', 'formatted_address', 'name', 'place_id']
    };

    placesService.current.getDetails(request, (place: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const components = place.address_components || [];
        
        // Extract address components
        const propertyData: PropertyData = {
          fullAddress: place.formatted_address || suggestion.description,
          street: extractStreetAddress(components, place.name),
          city: getComponent(components, 'locality') || '',
          state: getComponent(components, 'administrative_area_level_1', 'short_name') || 'CA',
          zip: getComponent(components, 'postal_code') || '',
          neighborhood: getComponent(components, 'neighborhood'),
          placeId: place.place_id
        };

        setSelectedAddress(propertyData);
      } else {
        onError?.('Failed to get place details');
      }
    });
  };

  // Handle TitlePoint search button click
  const handleTitlePointSearch = async () => {
    if (!selectedAddress) {
      onError?.('Please select an address first');
      return;
    }

    setIsTitlePointLoading(true);
    
    try {
      // Call our backend TitlePoint integration
      const response = await fetch('/api/property/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fullAddress: selectedAddress.fullAddress,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zip: selectedAddress.zip,
          placeId: selectedAddress.placeId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Merge Google Places data with TitlePoint data
        const enrichedData: PropertyData = {
          ...selectedAddress,
          // TitlePoint data
          apn: result.apn || '',
          county: result.county || '',
          legalDescription: result.brief_legal || result.legalDescription || '',
          grantorName: result.current_owner_primary || result.grantorName || '',
          currentOwnerPrimary: result.current_owner_primary || '',
          currentOwnerSecondary: result.current_owner_secondary || ''
        };

        onVerified(enrichedData);
      } else {
        // Even if TitlePoint fails, we can proceed with Google Places data
        console.warn('TitlePoint search failed, proceeding with Google Places data:', result.message);
        onVerified(selectedAddress);
      }
    } catch (error) {
      console.error('TitlePoint search failed:', error);
      // Fallback to Google Places data only
      onVerified(selectedAddress);
    } finally {
      setIsTitlePointLoading(false);
    }
  };

  // Helper function to extract street address
  const extractStreetAddress = (components: any[], placeName?: string) => {
    const streetNumber = getComponent(components, 'street_number');
    const route = getComponent(components, 'route');
    
    if (streetNumber && route) {
      return `${streetNumber} ${route}`;
    } else if (placeName) {
      return placeName;
    } else if (route) {
      return route;
    }
    return '';
  };

  // Helper function to get component by type
  const getComponent = (components: any[], type: string, nameType: string = 'long_name') => {
    const component = components.find((comp: any) => comp.types.includes(type));
    return component ? component[nameType] : null;
  };

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className={`relative ${className}`}>
      {/* Address Input with Google Places Autocomplete */}
      <div className="space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          
          {isLoading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Google Places Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </div>
                <div className="text-xs text-gray-500">
                  {suggestion.structured_formatting?.secondary_text || ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Address Display */}
        {selectedAddress && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-800">Address Selected:</div>
                <div className="text-sm text-green-700">{selectedAddress.fullAddress}</div>
              </div>
              <div className="text-green-600">✓</div>
            </div>
          </div>
        )}

        {/* TitlePoint Search Button - Always Visible */}
        <button
          onClick={handleTitlePointSearch}
          disabled={!selectedAddress || isTitlePointLoading}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            backgroundColor: selectedAddress ? '#F57C00' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: selectedAddress ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {isTitlePointLoading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Searching Property Data...</span>
            </>
          ) : (
            <>
              <span>🏠</span>
              <span>Search Property & Get Title Information</span>
            </>
          )}
        </button>
      </div>
      </div>
    </>
  );
}
