import React, { useState, useEffect, useRef } from 'react';
import { PropertyData } from '../lib/wizardState';
import { IntelligentAIService, DocumentSuggestion } from '../services/aiService';
import { DOCUMENT_REGISTRY } from '../lib/documentRegistry';

interface EnhancedPropertySearchProps {
  onPropertyVerified: (propertyData: PropertyData) => void;
  onDocumentSuggestion?: (suggestion: DocumentSuggestion) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  showDocumentSuggestions?: boolean;
}

interface GooglePlaceResult {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export function EnhancedPropertySearch({
  onPropertyVerified,
  onDocumentSuggestion,
  onError,
  placeholder = "Enter property address (e.g., 123 Main St, Los Angeles, CA)",
  className = "",
  showDocumentSuggestions = true
}: EnhancedPropertySearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [titlePointData, setTitlePointData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<string>('');
  const [documentSuggestion, setDocumentSuggestion] = useState<DocumentSuggestion | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  // Load Google Places API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv);
        placesService.current = new window.google.maps.places.PlacesService(map);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleLoaded(true);
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv);
        placesService.current = new window.google.maps.places.PlacesService(map);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Handle input changes and get suggestions
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.length > 2 && isGoogleLoaded && autocompleteService.current) {
      setIsLoading(true);
      
      autocompleteService.current.getPlacePredictions(
        {
          input: value,
          types: ['address'],
          componentRestrictions: { country: 'us' }
        },
        (predictions: any[], status: string) => {
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
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address selection
  const handleAddressSelect = (placeId: string, description: string) => {
    setInputValue(description);
    setShowSuggestions(false);
    setIsVerifying(true);
    setVerificationStep('Getting property details...');

    if (placesService.current) {
      placesService.current.getDetails(
        { placeId: placeId },
        (place: GooglePlaceResult, status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            processPropertyDetails(place);
          } else {
            setIsVerifying(false);
            onError?.('Failed to get property details from Google Places');
          }
        }
      );
    }
  };

  // Process property details from Google Places
  const processPropertyDetails = async (place: GooglePlaceResult) => {
    try {
      setVerificationStep('Processing address components...');
      
      // Extract address components
      const addressComponents = place.address_components;
      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';
      let zip = '';
      let county = '';

      addressComponents.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          route = component.long_name;
        } else if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        } else if (types.includes('postal_code')) {
          zip = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          county = component.long_name.replace(' County', '');
        }
      });

      const fullAddress = place.formatted_address;
      const street = `${streetNumber} ${route}`.trim();

      // Create initial property data
      const initialPropertyData: PropertyData = {
        address: fullAddress,
        apn: '',
        county: county,
        legalDescription: '',
        currentOwners: []
      };

      setSelectedProperty(initialPropertyData);
      setVerificationStep('Searching TitlePoint database...');

      // Get TitlePoint data
      const titlePointResult = await getTitlePointData(fullAddress, county);
      
      if (titlePointResult.success) {
        setVerificationStep('Processing title information...');
        
        const enhancedPropertyData: PropertyData = {
          ...initialPropertyData,
          apn: titlePointResult.data.apn || '',
          legalDescription: titlePointResult.data.legalDescription || '',
          currentOwners: titlePointResult.data.owners || [],
          titlePointData: titlePointResult.data
        };

        setSelectedProperty(enhancedPropertyData);
        setTitlePointData(titlePointResult.data);

        // Get AI document suggestion if enabled
        if (showDocumentSuggestions) {
          setVerificationStep('Getting AI document recommendations...');
          try {
            const suggestion = await IntelligentAIService.suggestDocumentType(enhancedPropertyData);
            setDocumentSuggestion(suggestion);
            onDocumentSuggestion?.(suggestion);
          } catch (error) {
            console.warn('AI document suggestion failed:', error);
          }
        }

        setVerificationStep('Property verified successfully!');
        onPropertyVerified(enhancedPropertyData);
        
        setTimeout(() => {
          setIsVerifying(false);
          setVerificationStep('');
        }, 1500);
      } else {
        // Fallback: Use basic property data without TitlePoint
        setVerificationStep('TitlePoint data unavailable - using basic property info');
        onPropertyVerified(initialPropertyData);
        
        setTimeout(() => {
          setIsVerifying(false);
          setVerificationStep('');
        }, 1500);
      }
    } catch (error) {
      setIsVerifying(false);
      setVerificationStep('');
      onError?.(`Property verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get TitlePoint data (integrated with existing backend)
  const getTitlePointData = async (address: string, county: string) => {
    try {
      const response = await fetch('/api/property/titlepoint-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          county,
          includeOwners: true,
          includeLegalDescription: true,
          includeAPN: true
        })
      });

      if (!response.ok) {
        throw new Error(`TitlePoint API failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          apn: data.apn,
          legalDescription: data.legalDescription,
          owners: data.owners?.map((owner: any) => ({
            name: owner.fullName || owner.name,
            vestingType: owner.vestingType
          })) || [],
          liens: data.liens || [],
          encumbrances: data.encumbrances || [],
          taxInfo: data.taxInfo,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('TitlePoint search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TitlePoint search failed'
      };
    }
  };

  // Handle manual address entry
  const handleManualEntry = () => {
    if (inputValue.trim()) {
      setIsVerifying(true);
      setVerificationStep('Processing manual address entry...');
      
      // Create basic property data from manual input
      const manualPropertyData: PropertyData = {
        address: inputValue.trim(),
        apn: '',
        county: '',
        legalDescription: '',
        currentOwners: []
      };

      setSelectedProperty(manualPropertyData);
      onPropertyVerified(manualPropertyData);
      
      setTimeout(() => {
        setIsVerifying(false);
        setVerificationStep('');
      }, 1000);
    }
  };

  // Clear search
  const handleClear = () => {
    setInputValue('');
    setSelectedProperty(null);
    setTitlePointData(null);
    setDocumentSuggestion(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={`enhanced-property-search ${className}`}>
      {/* Search Input */}
      <div className="search-section">
        <h3>Property Search</h3>
        <p>Enter the property address to begin document creation</p>
        
        <div className="search-input-container">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className="property-search-input"
              disabled={isVerifying}
            />
            
            {isLoading && (
              <div className="search-loading">
                <span className="spinner">🔄</span>
              </div>
            )}
            
            {inputValue && (
              <button
                className="clear-button"
                onClick={handleClear}
                disabled={isVerifying}
              >
                ×
              </button>
            )}
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id}
                  className="suggestion-item"
                  onClick={() => handleAddressSelect(suggestion.place_id, suggestion.description)}
                >
                  <span className="suggestion-icon">📍</span>
                  <div className="suggestion-content">
                    <div className="suggestion-main">{suggestion.structured_formatting?.main_text}</div>
                    <div className="suggestion-secondary">{suggestion.structured_formatting?.secondary_text}</div>
                  </div>
                </div>
              ))}
              
              {/* Manual entry option */}
              <div className="suggestion-item manual-entry" onClick={handleManualEntry}>
                <span className="suggestion-icon">✏️</span>
                <div className="suggestion-content">
                  <div className="suggestion-main">Use "{inputValue}" as entered</div>
                  <div className="suggestion-secondary">Manual address entry (limited verification)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification Progress */}
      {isVerifying && (
        <div className="verification-progress">
          <div className="progress-header">
            <span className="progress-icon">🔍</span>
            <span className="progress-text">Verifying Property...</span>
          </div>
          <div className="progress-steps">
            <div className="progress-step">{verificationStep}</div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}

      {/* Property Summary */}
      {selectedProperty && !isVerifying && (
        <div className="property-summary">
          <div className="summary-header">
            <h4>✅ Property Verified</h4>
            <button className="change-property-button" onClick={handleClear}>
              Change Property
            </button>
          </div>
          
          <div className="property-details">
            <div className="detail-item">
              <strong>Address:</strong> {selectedProperty.address}
            </div>
            {selectedProperty.apn && (
              <div className="detail-item">
                <strong>APN:</strong> {selectedProperty.apn}
              </div>
            )}
            {selectedProperty.county && (
              <div className="detail-item">
                <strong>County:</strong> {selectedProperty.county}
              </div>
            )}
            {selectedProperty.currentOwners.length > 0 && (
              <div className="detail-item">
                <strong>Current Owners:</strong>
                <ul className="owners-list">
                  {selectedProperty.currentOwners.map((owner, index) => (
                    <li key={index}>
                      {owner.name}
                      {owner.vestingType && <span className="vesting-type"> ({owner.vestingType})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* TitlePoint Data Indicator */}
          {titlePointData && (
            <div className="titlepoint-indicator">
              <span className="titlepoint-icon">🏢</span>
              <span className="titlepoint-text">Enhanced with TitlePoint data</span>
            </div>
          )}
        </div>
      )}

      {/* AI Document Suggestion */}
      {documentSuggestion && showDocumentSuggestions && (
        <div className="ai-document-suggestion">
          <div className="suggestion-header">
            <h4>🤖 AI Document Recommendation</h4>
            <div className="confidence-badge">
              {Math.round(documentSuggestion.confidence * 100)}% confident
            </div>
          </div>
          
          <div className="recommended-document">
            <div className="document-name">
              {DOCUMENT_REGISTRY[documentSuggestion.recommendedType]?.name || documentSuggestion.recommendedType}
            </div>
            <div className="document-reasoning">
              <strong>Why:</strong> {documentSuggestion.reasoning}
            </div>
          </div>

          {documentSuggestion.riskFactors.length > 0 && (
            <div className="risk-factors">
              <strong>⚠️ Consider:</strong>
              <ul>
                {documentSuggestion.riskFactors.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {documentSuggestion.legalConsiderations.length > 0 && (
            <div className="legal-considerations">
              <strong>⚖️ Legal Notes:</strong>
              <ul>
                {documentSuggestion.legalConsiderations.map((consideration, index) => (
                  <li key={index}>{consideration}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="search-help">
        <h5>💡 Tips for better results:</h5>
        <ul>
          <li>Include street number, street name, city, and state</li>
          <li>Use the full address format (e.g., "123 Main St, Los Angeles, CA")</li>
          <li>Select from the dropdown suggestions for best accuracy</li>
          <li>TitlePoint integration provides enhanced property data when available</li>
        </ul>
      </div>
    </div>
  );
}

export type { EnhancedPropertySearchProps };


