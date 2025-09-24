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
}

interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types: string[];
}

interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GooglePlaceResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  name?: string;
  place_id?: string;
}

interface GoogleAutocompleteRequest {
  input: string;
  componentRestrictions?: { country: string };
  types?: string[];
}

interface PropertySearchProps {
  onSelect: (data: PropertyData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: GoogleAutocompleteRequest,
    callback: (predictions: GoogleAutocompletePrediction[] | null, status: string) => void
  ) => void;
}

interface GooglePlacesService {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (place: GooglePlaceResult | null, status: string) => void
  ) => void;
}

interface GooglePlacesNamespace {
  AutocompleteService: new () => GoogleAutocompleteService;
  PlacesService: new (element: HTMLElement) => GooglePlacesService;
  PlacesServiceStatus: Record<string, string>;
}

interface GoogleMapsNamespace {
  places?: GooglePlacesNamespace;
}

interface GoogleNamespace {
  maps?: GoogleMapsNamespace;
}

declare global {
  interface Window {
    google: GoogleNamespace | undefined;
    initMap?: () => void;
  }
}

export default function PropertySearch({ 
  onSelect, 
  onError, 
  placeholder = "Enter property address",
  value = "",
  className = ""
}: PropertySearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<GoogleAutocompleteService | null>(null);
  const placesService = useRef<GooglePlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Google Maps API with modern approach
  useEffect(() => {
    const initializeGoogle = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) {
        console.error('Google API key not found');
        onError?.('Google Places service not configured');
        return;
      }

      try {
        // Load Google Maps JavaScript API directly
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initMap`;
          script.async = true;
          script.defer = true;
          
          // Define callback function
          window.initMap = () => {
            if (window.google?.maps?.places) {
              // Initialize services with fallback support
              try {
                // Try new API first, fallback to old if needed
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
                placesService.current = new window.google.maps.places.PlacesService(
                  document.createElement('div')
                );
                setIsGoogleLoaded(true);
              } catch (error) {
                console.warn('Using fallback Google Places API initialization:', error);
                // Fallback initialization
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
                placesService.current = new window.google.maps.places.PlacesService(
                  document.createElement('div')
                );
                setIsGoogleLoaded(true);
              }
            }
          };
          
          script.onerror = () => {
            console.error('Failed to load Google Maps script');
            onError?.('Failed to load Google Places service');
          };
          
          document.head.appendChild(script);
        } else {
          // Google Maps already loaded
          if (window.google?.maps?.places) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            placesService.current = new window.google.maps.places.PlacesService(
              document.createElement('div')
            );
            setIsGoogleLoaded(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error);
        onError?.('Failed to load Google Places service');
      }
    };

    initializeGoogle();
  }, [onError]);

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      if (value.length > 2 && isGoogleLoaded && autocompleteService.current) {
        searchPlaces(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

  // Search for places using Google Places API
  const searchPlaces = (query: string) => {
    setIsLoading(true);
    
    const request: GoogleAutocompleteRequest = {
      input: query,
      componentRestrictions: { country: 'us' },
      types: ['address'],
    };

    autocompleteService.current?.getPlacePredictions(
      request,
      (predictions, status) => {
        setIsLoading(false);
        
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GoogleAutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    // Get detailed place information
    const request = {
      placeId: suggestion.place_id,
      fields: ['address_components', 'formatted_address', 'name', 'place_id']
    };

    placesService.current?.getDetails(request, (place, status) => {
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place && place.address_components) {
        const components = place.address_components;
        
        // Extract address components
        const extractedData: PropertyData = {
          fullAddress: place.formatted_address || suggestion.description,
          street: extractStreetAddress(components, place.name),
          city: getComponent(components, 'locality') || '',
          state: getComponent(components, 'administrative_area_level_1', 'short_name') || 'CA',
          zip: getComponent(components, 'postal_code') || '',
          neighborhood: getComponent(components, 'neighborhood') || undefined,
          placeId: place.place_id ?? suggestion.place_id,
        };

        onSelect(extractedData);
      } else {
        onError?.('Failed to get place details');
      }
    });
  };

  // Helper function to extract street address
  const extractStreetAddress = (components: GoogleAddressComponent[], placeName?: string) => {
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
  const getComponent = (components: GoogleAddressComponent[], type: string, nameType: 'long_name' | 'short_name' = 'long_name') => {
    const component = components.find((comp) => comp.types.includes(type));
    return component ? component[nameType] ?? null : null;
  };

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        disabled={!isGoogleLoaded}
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* API not loaded indicator */}
      {!isGoogleLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
          Loading...
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id || index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900">
                {suggestion.structured_formatting?.main_text || suggestion.description}
              </div>
              {suggestion.structured_formatting?.secondary_text && (
                <div className="text-sm text-gray-500">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No suggestions message */}
      {showSuggestions && suggestions.length === 0 && inputValue.length > 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-gray-500 text-center">
          No addresses found
        </div>
      )}
    </div>
  );
}
