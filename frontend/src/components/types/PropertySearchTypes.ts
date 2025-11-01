// Types for property data
export interface PropertyData {
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

export interface PropertyDetailsResponse {
  success?: boolean;
  apn?: string;
  legalDescription?: string;
  grantorName?: string;
  legal_description?: string; // Phase 5-PREQUAL: snake_case from backend
  full_address?: string;
  [key: string]: string | undefined | boolean;
}

export interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  onPropertyFound?: (data: PropertyData) => void; // New callback for property details
}

export interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types: string[];
}

export interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface GooglePlaceResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  name?: string;
  place_id?: string;
}

export interface GoogleAutocompleteRequest {
  input: string;
  componentRestrictions?: { country: string };
  types?: string[];
}

export interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: GoogleAutocompleteRequest,
    callback: (predictions: GoogleAutocompletePrediction[] | null, status: string) => void
  ) => void;
}

export interface GooglePlacesService {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (place: GooglePlaceResult | null, status: string) => void
  ) => void;
}

export interface GooglePlacesNamespace {
  AutocompleteService: new () => GoogleAutocompleteService;
  PlacesService: new (element: HTMLElement) => GooglePlacesService;
  PlacesServiceStatus: Record<string, string>;
}

export interface GoogleMapsNamespace {
  places?: GooglePlacesNamespace;
}

export interface GoogleNamespace {
  maps?: GoogleMapsNamespace;
}

export interface PropertyDetails extends PropertyData {
  propertyType?: string;
}

declare global {
  interface Window {
    google: GoogleNamespace | undefined;
    initGoogleMaps?: () => void;
  }
}

