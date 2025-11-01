import { useEffect, useRef, useState } from 'react';
import { GoogleAutocompleteService, GooglePlacesService } from '../types/PropertySearchTypes';

interface UseGoogleMapsReturn {
  isGoogleLoaded: boolean;
  autocompleteService: React.MutableRefObject<GoogleAutocompleteService | null>;
  placesService: React.MutableRefObject<GooglePlacesService | null>;
}

export const useGoogleMaps = (onError?: (error: string) => void): UseGoogleMapsReturn => {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const autocompleteService = useRef<GoogleAutocompleteService | null>(null);
  const placesService = useRef<GooglePlacesService | null>(null);

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

  return {
    isGoogleLoaded,
    autocompleteService,
    placesService
  };
};

