import { useState } from 'react';
import { PropertyData, PropertyDetails } from '../types/PropertySearchTypes';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface UsePropertyLookupReturn {
  isTitlePointLoading: boolean;
  propertyDetails: PropertyDetails | null;
  showPropertyDetails: boolean;
  errorMessage: string | null;
  stage: 'idle' | 'connecting' | 'searching' | 'resolving' | 'done' | 'error';
  lookupPropertyDetails: (addressData: PropertyData, selectedAddress: PropertyData | null, retryCount?: number) => Promise<void>;
  handleConfirmProperty: () => void;
  setShowPropertyDetails: (show: boolean) => void;
  setPropertyDetails: (details: PropertyDetails | null) => void;
  setErrorMessage: (message: string | null) => void;
}

export const usePropertyLookup = (
  onVerified: (data: PropertyData) => void,
  onPropertyFound?: (data: PropertyData) => void
): UsePropertyLookupReturn => {
  const [isTitlePointLoading, setIsTitlePointLoading] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'connecting' | 'searching' | 'resolving' | 'done' | 'error'>('idle');

  const lookupPropertyDetails = async (addressData: PropertyData, selectedAddress: PropertyData | null, retryCount = 0) => {
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
    setStage('connecting');  // PHASE 14-C: Start progress feedback
    
    try {
      console.log('🔍 Unified Property Search for:', addressData);
      if (retryCount > 0) {
        console.log(`[PropertySearch] Retry attempt #${retryCount}`);
      }
      
      // Check authentication token first
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // PHASE 14-C: Small delay to show "Connecting" stage
      await new Promise(resolve => setTimeout(resolve, 400));
      setStage('searching');  // PHASE 14-C: Update stage
      
      // PHASE 14-C: Call unified endpoint with 15-second timeout
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const searchResponse = await fetchWithTimeout(`${apiUrl}/api/property/search`, {
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
        }),
        timeoutMs: 15000  // PHASE 14-C: 15-second timeout
      });

      if (!searchResponse.ok) {
        console.error(`Property search error: ${searchResponse.status} ${searchResponse.statusText}`);
        
        if (searchResponse.status === 401) {
          throw new Error('Authentication expired. Please refresh the page and log in again.');
        }
        
        throw new Error(`Property search error: ${searchResponse.status}`);
      }

      setStage('resolving');  // PHASE 14-C: Processing response
      const result = await searchResponse.json();
      console.log('✅ Unified Property Search result:', result);

      // PHASE 14-C: Small delay to show "Resolving" stage
      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.success) {
        // Map backend response to frontend PropertyDetails format
        const propertyInfo: PropertyDetails = {
          ...(selectedAddress || addressData),
          fullAddress: result.fullAddress || addressData.fullAddress,
          street: addressData.street,
          city: result.city || addressData.city,
          state: result.state || addressData.state,
          zip: result.zip || addressData.zip,
          county: result.county || addressData.county || '',
          apn: result.apn || '',
          legalDescription: result.legalDescription || '',  // Empty string for manual entry
          grantorName: result.grantorName || '',
          currentOwnerPrimary: result.grantorName || '',
          currentOwnerSecondary: '',
          propertyType: result.propertyType || 'Single Family Residence',  // Use backend data
          placeId: addressData.placeId
        };

        setPropertyDetails(propertyInfo);
        setShowPropertyDetails(true);
        setErrorMessage(null);
        setStage('done');  // PHASE 14-C: Success
        onPropertyFound?.(propertyInfo);
      } else {
        // No property data found - allow manual entry
        console.log('Property search returned no data');
        setErrorMessage(result.error || '⚠️ Property details not available. You can proceed with manual entry.');
        setShowPropertyDetails(false);
      }
    } catch (error: any) {
      // BUG FIX #1: Auto-retry on AbortError (first attempt only)
      // This handles the "first search after login fails" issue
      if (error?.name === 'AbortError' && retryCount === 0) {
        console.log('[PropertySearch] First attempt aborted, retrying automatically...');
        // Don't reset loading state, just retry
        return lookupPropertyDetails(addressData, selectedAddress, retryCount + 1);
      }
      
      console.error('Property search failed:', error);
      setStage('error');  // PHASE 14-C: Error state
      setErrorMessage('⚠️ Unable to retrieve property details. You can proceed with manual entry.');
      setShowPropertyDetails(false);
    } finally {
      setIsTitlePointLoading(false);
      // Reset stage after a brief delay to allow error message to show
      setTimeout(() => setStage('idle'), 3000);
    }
  };

  // User confirms property details and proceeds
  const handleConfirmProperty = () => {
    if (propertyDetails) {
      onVerified(propertyDetails);
    }
  };

  return {
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
  };
};

