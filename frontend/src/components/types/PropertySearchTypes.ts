export interface PropertyData {
  fullAddress: string
  street: string
  city: string
  state: string
  zip: string
  neighborhood?: string
  county: string
  placeId?: string
}

export interface PropertySearchProps {
  onVerified: (data: PropertyData) => void
  onError?: (error: string) => void
  placeholder?: string
  className?: string
  onPropertyFound?: (data: any) => void
}

export interface GoogleAutocompletePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface GoogleAutocompleteRequest {
  input: string
  types?: string[]
  componentRestrictions?: {
    country: string
  }
}

export interface EnrichedPropertyData extends PropertyData {
  apn?: string
  legalDescription?: string
  currentOwner?: string
  currentOwnerPrimary?: string
  currentOwnerSecondary?: string
  propertyType?: string
  fips?: string
  _prefilled?: any
}
