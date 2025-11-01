'use client';

import { useState, useEffect, useRef } from 'react';
import ProgressOverlay from '@/components/ProgressOverlay';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { usePropertyLookup } from './hooks/usePropertyLookup';
import { extractStreetAddress, getComponent, getCountyFallback } from './utils/addressHelpers';
import {
  PropertyData,
  PropertySearchProps,
  GoogleAutocompletePrediction,
  GoogleAutocompleteRequest
} from './types/PropertySearchTypes';

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoogleAutocompletePrediction | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Use custom hooks for Google Maps and Property Lookup
  const { isGoogleLoaded, autocompleteService, placesService } = useGoogleMaps(onError);
  const {
    isTitlePointLoading,
    propertyDetails,
    showPropertyDetails,
    errorMessage,
    stage,
    lookupPropertyDetails,
    handleConfirmProperty,
    setShowPropertyDetails,
    setPropertyDetails,
    setErrorMessage
  } = usePropertyLookup(onVerified, onPropertyFound);

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
      autocompleteService.current!.getPlacePredictions(
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

  return (
    <>
      <ProgressOverlay stage={stage} />
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
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #F57C00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 10
              }}>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef3e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                      {suggestion.structured_formatting?.main_text}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {suggestion.structured_formatting?.secondary_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleAddressSearch}
            disabled={isLoading || inputValue.length < 3}
            style={{
              padding: '20px 32px',
              backgroundColor: isLoading || inputValue.length < 3 ? '#e5e7eb' : '#F57C00',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isLoading || inputValue.length < 3 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && inputValue.length >= 3) {
                e.currentTarget.style.backgroundColor = '#E67100';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && inputValue.length >= 3) {
                e.currentTarget.style.backgroundColor = '#F57C00';
              }
            }}
          >
            {isLoading ? 'Searching...' : 'Find Address'}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && !selectedAddress && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#991b1b'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Address Found - Get Property Details Button */}
        {selectedAddress && !showPropertyDetails && (
          <div style={{
            padding: '20px',
            backgroundColor: '#ecfdf5',
            border: '2px solid #6ee7b7',
            borderRadius: '16px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#047857', marginBottom: '8px' }}>
                ✓ Address Validated
              </div>
              <div style={{ fontSize: '16px', color: '#1e293b', fontWeight: '500' }}>
                {selectedAddress.fullAddress}
              </div>
            </div>

            <button
              onClick={() => lookupPropertyDetails(selectedAddress, selectedAddress)}
              disabled={isTitlePointLoading}
              style={{
                padding: '14px 28px',
                backgroundColor: isTitlePointLoading ? '#e5e7eb' : '#F57C00',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isTitlePointLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isTitlePointLoading) {
                  e.currentTarget.style.backgroundColor = '#E67100';
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

