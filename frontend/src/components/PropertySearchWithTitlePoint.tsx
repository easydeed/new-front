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
  county?: string;
  placeId: string;
  // TitlePoint data
  apn?: string;
  legalDescription?: string;
  grantorName?: string;
  currentOwnerPrimary?: string;
  currentOwnerSecondary?: string;
}

interface PropertyDetailsResponse {
  success?: boolean;
  property_details?: {
    county?: string;
    legal_description?: string;
    owner_name_primary?: string;
    owner_name_secondary?: string;
    full_address?: string;
    [key: string]: string | undefined;
  };
}

interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  onPropertyFound?: (data: PropertyData) => void; // New callback for property details
}

interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types: string[];
}

interface GooglePlaceResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  name?: string;
  place_id?: string;
}

interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GoogleAutocompleteRequest {
  input: string;
  componentRestrictions?: { country: string };
  types?: string[];
}

type GooglePlacesServiceStatus = string;

interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: GoogleAutocompleteRequest,
    callback: (predictions: GoogleAutocompletePrediction[] | null, status: GooglePlacesServiceStatus) => void
  ) => void;
}

interface GooglePlacesService {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (place: GooglePlaceResult | null, status: GooglePlacesServiceStatus) => void
  ) => void;
}

interface GooglePlacesNamespace {
  AutocompleteService: new () => GoogleAutocompleteService;
  PlacesService: new (element: HTMLElement) => GooglePlacesService;
  PlacesServiceStatus: Record<string, GooglePlacesServiceStatus>;
}

interface GoogleMapsNamespace {
  places?: GooglePlacesNamespace;
  Map: new (element: HTMLElement) => unknown;
}

interface GoogleNamespace {
  maps?: GoogleMapsNamespace;
}

interface PropertyDetails extends PropertyData {
  propertyType?: string;
}

declare global {
  interface Window {
    google: GoogleNamespace | undefined;
    initGoogleMaps?: () => void;
  }
}

export default function PropertySearchWithTitlePoint({ 
  onVerified, 
  onError, 
  placeholder = "Enter property address",
  className = "",
  onPropertyFound
}: PropertySearchProps) {
  
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoogleAutocompletePrediction | null>(null);
  const [isTitlePointLoading, setIsTitlePointLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<GoogleAutocompleteService | null>(null);
  const placesService = useRef<GooglePlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Google Maps API
  useEffect(() => {
  const initializeGoogle = async () => {
      // Check if Google Places is enabled via feature flag
      const googlePlacesEnabled = process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED === 'true';
      if (!googlePlacesEnabled) {
        console.log('Google Places API disabled via feature flag');
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn('Google Places API key not configured');
        onError?.('Address search not available. Please enter address manually.');
        return;
      }

      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        initializeServices();
        return;
      }

      // Load Google Maps API with modern loading approach
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Define global callback
      window.initGoogleMaps = () => {
        console.log('✅ Google Maps API loaded successfully');
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

  // Handle input change with address suggestions - improved debouncing
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedAddress(null); // Clear selection when typing
    setSelectedSuggestion(null); // Clear suggestion when typing
    setErrorMessage(null); // Clear any previous errors
    setSearchAttempted(false); // Reset search attempted flag

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce suggestions with longer delay to prevent rapid API calls
    timeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 500);
  };

  // Preserve focus after state updates
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // Only focus if user was interacting with the input
      if (searchAttempted || showSuggestions) {
        inputRef.current.focus();
      }
    }
  }, [suggestions, searchAttempted, showSuggestions]);

  // Address validation only - separated from TitlePoint lookup
  const handleAddressSearch = async () => {
    if (!inputValue.trim() || inputValue.length < 3) {
      setErrorMessage('Please enter at least 3 characters to search for addresses');
      return;
    }

    setIsLoading(true);
    setSearchAttempted(true);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMessage(null);
    setPropertyDetails(null);
    setShowPropertyDetails(false);
    
    try {
      // If user has selected a suggestion, use it
      if (selectedSuggestion) {
        await processSelectedSuggestionForAddress(selectedSuggestion);
      } else {
        // Search for addresses using Google Places and auto-select first
        await searchPlacesAndSelectFirstForAddress(inputValue);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setIsLoading(false);
      setErrorMessage('Address search failed. Please try again or select from suggestions.');
    }
  };

  // Process a selected suggestion for address validation only
  const processSelectedSuggestionForAddress = async (suggestion: GoogleAutocompletePrediction) => {
    const request = {
      placeId: suggestion.place_id,
      fields: ['address_components', 'formatted_address', 'name', 'place_id']
    };

    return new Promise((resolve, reject) => {
      placesService.current?.getDetails(request, (place, status) => {
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place && place.address_components) {
          const components = place.address_components;
          
          const city = getComponent(components, 'locality') || '';
          const state = getComponent(components, 'administrative_area_level_1', 'short_name') || 'CA';
          const county = getComponent(components, 'administrative_area_level_2') || getCountyFallback(city, state);

          const propertyData = {
            fullAddress: place.formatted_address || suggestion.description,
            street: extractStreetAddress(components, place.name),
            city,
            state,
            zip: getComponent(components, 'postal_code') || '',
            neighborhood: getComponent(components, 'neighborhood'),
            county,
            placeId: place.place_id
          };

          setSelectedAddress(propertyData);
          setIsLoading(false);
          
          // Don&#39;t automatically call TitlePoint - let user confirm first
          // await lookupPropertyDetails(propertyData);
          resolve(true);
        } else {
          reject(new Error('Failed to get place details'));
        }
      });
    });
  };

  // Search for places and auto-select the first result for address validation only
  const searchPlacesAndSelectFirstForAddress = async (input: string) => {
    if (!autocompleteService.current || !isGoogleLoaded) {
      throw new Error('Google Maps not loaded');
    }

    const request = {
      input,
      componentRestrictions: { country: 'us' },
      types: ['address']
    };

    return new Promise((resolve, reject) => {
      autocompleteService.current.getPlacePredictions(
        request,
        (predictions, status) => {
          if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions && predictions.length > 0) {
            // Auto-select the first suggestion
            const firstSuggestion = predictions[0];
            setInputValue(firstSuggestion.description);
            
            // Get detailed place information
            const placeRequest = {
              placeId: firstSuggestion.place_id,
              fields: ['address_components', 'formatted_address', 'name', 'place_id']
            };

            placesService.current?.getDetails(placeRequest, (place, placeStatus) => {
              if (placeStatus === window.google?.maps?.places?.PlacesServiceStatus?.OK && place && place.address_components) {
                const components = place.address_components;
                
                const city = getComponent(components, 'locality') || '';
                const state = getComponent(components, 'administrative_area_level_1', 'short_name') || 'CA';
                const county = getComponent(components, 'administrative_area_level_2') || getCountyFallback(city, state);

                const propertyData = {
                  fullAddress: place.formatted_address || firstSuggestion.description,
                  street: extractStreetAddress(components, place.name),
                  city,
                  state,
                  zip: getComponent(components, 'postal_code') || '',
                  neighborhood: getComponent(components, 'neighborhood'),
                  county,
                  placeId: place.place_id
                };

                setSelectedAddress(propertyData);
                setIsLoading(false);
                
                // Don&#39;t automatically call TitlePoint - let user confirm first
                // await lookupPropertyDetails(propertyData);
                resolve(true);
              } else {
                reject(new Error('Failed to get place details'));
              }
            });
          } else {
            reject(new Error('No addresses found'));
          }
        }
      );
    });
  };

  // Unified property search using /api/property/search (Per Dynamic Wizard Architecture)
  const lookupPropertyDetails = async (addressData: PropertyData) => {
    // PHASE 5-PREQUAL: Check if TitlePoint OR SiteX integration is enabled
    const enrichmentEnabled =
      process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED === 'true' ||
      process.env.NEXT_PUBLIC_SITEX_ENABLED === 'true';
    
    if (!enrichmentEnabled) {
      console.log('Property enrichment disabled via feature flags');
      setErrorMessage('Property enrichment not available. Please enter details manually.');
      return;
    }

    setIsTitlePointLoading(true);
    setErrorMessage(null);
    // PHASE 5-PREQUAL: Removed setSitexMatches/setShowSitexMatches - multi-match auto-resolved on backend
    
    try {
      console.log('🔍 Unified Property Search for:', addressData);
      
      // Check authentication token first
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Call unified /api/property/search endpoint (Per Architecture: Step 1 – Property Verification)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const searchResponse = await fetch(`${apiUrl}/api/property/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullAddress: addressData.fullAddress,  // PHASE 5-PREQUAL: Fixed field name to match backend schema
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zip: addressData.zip,
          neighborhood: addressData.neighborhood,
          placeId: addressData.placeId
        })
      });

      if (!searchResponse.ok) {
        console.error(`Property search error: ${searchResponse.status} ${searchResponse.statusText}`);
        
        if (searchResponse.status === 401) {
          throw new Error('Authentication expired. Please refresh the page and log in again.');
        }
        
        throw new Error(`Property search error: ${searchResponse.status}`);
      }

      const result = await searchResponse.json();
      console.log('✅ Unified Property Search result:', result);

      if (result.success) {
        // Map backend response to frontend PropertyDetails format
        const propertyInfo: PropertyDetails = {
          ...selectedAddress,
          fullAddress: result.fullAddress || addressData.fullAddress,
          street: addressData.street,
          city: result.city || addressData.city,
          state: result.state || addressData.state,
          zip: result.zip || addressData.zip,
          county: result.county || addressData.county || 'Not available',
          apn: result.apn || 'Not available',
          legalDescription: result.legalDescription || 'Not available',
          grantorName: result.grantorName || '',
          currentOwnerPrimary: result.grantorName || 'Not available',
          currentOwnerSecondary: '',
          propertyType: 'Single Family Residence',
          placeId: addressData.placeId
        };

        setPropertyDetails(propertyInfo);
        setShowPropertyDetails(true);
        setErrorMessage(null);
        onPropertyFound?.(propertyInfo);
      } else {
        // No property data found - allow manual entry
        console.log('Property search returned no data');
        setErrorMessage(result.error || '⚠️ Property details not available. You can proceed with manual entry.');
        setShowPropertyDetails(false);
      }
    } catch (error) {
      console.error('Property search failed:', error);
      setErrorMessage('⚠️ Unable to retrieve property details. You can proceed with manual entry.');
      setShowPropertyDetails(false);
    } finally {
      setIsTitlePointLoading(false);
    }
  };

  // User confirms property details and proceeds
  const handleConfirmProperty = () => {
    if (propertyDetails) {
      onVerified(propertyDetails);
    }
  };

  // Search for places using Google Places API
  const searchPlaces = (input: string) => {
    if (!autocompleteService.current || !isGoogleLoaded) {
      return;
    }

    setIsLoading(true);

    const request: GoogleAutocompleteRequest = {
      input,
      componentRestrictions: { country: 'us' },
      types: ['address']
    };

    autocompleteService.current.getPlacePredictions(
      request,
      (predictions, status) => {
        setIsLoading(false);
        
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          onError?.('No addresses found. Please try a different search term.');
        }
      }
    );
  };

  // Handle suggestion selection (Google Places) - NO auto-validation
  const handleSuggestionSelect = (suggestion: GoogleAutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setErrorMessage(null); // Clear any errors
    
    // Store the suggestion for later use but DON'T auto-validate
    setSelectedSuggestion(suggestion);
    
    // Clear any previous validated data since user selected a new address
    setSelectedAddress(null);
    
    // Keep focus on input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
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
    return component ? component[nameType] : null;
  };

  // Helper function to get county fallback based on city and state
  const getCountyFallback = (city: string, state: string) => {
    // Common California county mappings for major cities
    const countyMappings: {[key: string]: string} = {
      'los angeles': 'Los Angeles',
      'beverly hills': 'Los Angeles',
      'santa monica': 'Los Angeles',
      'hollywood': 'Los Angeles',
      'pasadena': 'Los Angeles',
      'glendale': 'Los Angeles',
      'burbank': 'Los Angeles',
      'long beach': 'Los Angeles',
      'torrance': 'Los Angeles',
      'la verne': 'Los Angeles',
      'pomona': 'Los Angeles',
      'san francisco': 'San Francisco',
      'oakland': 'Alameda',
      'san jose': 'Santa Clara',
      'san diego': 'San Diego',
      'sacramento': 'Sacramento',
      'fresno': 'Fresno',
      'bakersfield': 'Kern',
      'anaheim': 'Orange',
      'santa ana': 'Orange',
      'riverside': 'Riverside',
      'stockton': 'San Joaquin',
      'irvine': 'Orange',
      'fremont': 'Alameda',
      'san bernardino': 'San Bernardino',
      'modesto': 'Stanislaus'
    };

    if (state === 'CA' && city) {
      return countyMappings[city.toLowerCase()] || '';
    }
    return '';
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
      {/* Address Input with Search Button */}
      <div className="space-y-4">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '20px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: '400',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#F57C00';
                e.target.style.boxShadow = '0 0 0 4px rgba(245, 124, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
              }}
              disabled={isLoading}
            />
            
            {isLoading && (
              <div style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #F57C00',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            )}
          </div>
          
          {/* Address Search Button */}
          <button
            onClick={handleAddressSearch}
            disabled={isLoading || isTitlePointLoading || !inputValue.trim()}
            style={{
              padding: '20px 28px',
              backgroundColor: (inputValue.trim() && !isLoading && !isTitlePointLoading) ? '#F57C00' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (inputValue.trim() && !isLoading && !isTitlePointLoading) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              minWidth: '110px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim() && !isLoading && !isTitlePointLoading) {
                e.currentTarget.style.backgroundColor = '#e67100';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (inputValue.trim() && !isLoading && !isTitlePointLoading) {
                e.currentTarget.style.backgroundColor = '#F57C00';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {isLoading || isTitlePointLoading ? 'Searching...' : 'Search'}
          </button>
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

        {/* Error Message Display */}
        {errorMessage && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '18px', color: '#d97706' }}>⚠️</div>
              <div style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
                {errorMessage}
              </div>
            </div>
          </div>
        )}

        {/* Selected Address Display */}
        {selectedAddress && !errorMessage && !showPropertyDetails && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                  ✅ Address Validated
                </div>
                <div style={{ fontSize: '14px', color: '#166534' }}>
                  {selectedAddress.fullAddress}
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                  County: {selectedAddress.county}
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#22c55e' }}>✓</div>
            </div>
            
            {/* Get Property Details Button */}
            <button
              onClick={() => lookupPropertyDetails(selectedAddress)}
              disabled={isTitlePointLoading}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: isTitlePointLoading ? '#d1d5db' : '#F57C00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isTitlePointLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isTitlePointLoading) {
                  e.currentTarget.style.backgroundColor = '#e67100';
                }
              }}
              onMouseLeave={(e) => {
                if (!isTitlePointLoading) {
                  e.currentTarget.style.backgroundColor = '#F57C00';
                }
              }}
            >
              {isTitlePointLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Getting Property Details...
                </>
              ) : (
                <>
                  🏠 Get Property Details
                </>
              )}
            </button>
          </div>
        )}

        {/* Property Details Display for User Confirmation */}
        {showPropertyDetails && propertyDetails && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            marginTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                🏠 Property Details Found
              </h3>
              {isTitlePointLoading && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #F57C00',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                📍 Address
              </div>
              <div style={{ fontSize: '16px', color: '#1e293b', marginBottom: '12px' }}>
                {propertyDetails.fullAddress}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  📋 APN (Parcel Number)
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>
                  {propertyDetails.apn}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  🏛️ County
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>
                  {propertyDetails.county}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  👤 Current Owner
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>
                  {propertyDetails.currentOwnerPrimary}
                  {propertyDetails.currentOwnerSecondary && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      & {propertyDetails.currentOwnerSecondary}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  🏘️ Property Type
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>
                  {propertyDetails.propertyType}
                </div>
              </div>
            </div>

            {propertyDetails.legalDescription !== 'Not available' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  📜 Legal Description
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.5' }}>
                  {propertyDetails.legalDescription}
                </div>
              </div>
            )}

            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#dbeafe', 
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>
                ✅ Please review the property details above to ensure they are correct before proceeding.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleConfirmProperty}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                }}
              >
                ✓ Confirm & Continue
              </button>
              
              <button
                onClick={() => {
                  setShowPropertyDetails(false);
                  setPropertyDetails(null);
                  setInputValue('');
                  setSelectedAddress(null);
                  setSelectedSuggestion(null);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                🔄 Search Different Address
              </button>
            </div>
          </div>
        )}

        {/* Address Found but No Property Data */}
        {selectedAddress && errorMessage && !showPropertyDetails && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                  📍 Address Verified
                </div>
                <div style={{ fontSize: '14px', color: '#92400e' }}>
                  {selectedAddress.fullAddress}
                </div>
                <div style={{ fontSize: '12px', color: '#a16207', marginTop: '4px' }}>
                  Property data will be entered manually
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#f59e0b' }}>⚠️</div>
            </div>
            
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={() => onVerified(selectedAddress)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Continue with Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
