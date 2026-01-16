"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, Search, Check, Loader2, AlertCircle, Building2, ChevronRight } from "lucide-react"
import type { PropertyData } from "@/types/builder"

interface PropertySectionProps {
  value: PropertyData | null
  onChange: (property: PropertyData) => void
  onComplete: () => void
}

// Loading skeleton for property data
function PropertySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Fetching property details from county records...</span>
      </div>
    </div>
  )
}

// Unit picker for condos/multi-unit properties
interface UnitPickerProps {
  units: Array<{
    address: string
    unit: string
    apn: string
  }>
  onSelect: (unit: { address: string; unit: string; apn: string }) => void
  onBack: () => void
  buildingAddress: string
}

function UnitPicker({ units, onSelect, onBack, buildingAddress }: UnitPickerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Multiple units found at:</p>
          <p className="font-medium text-gray-900">{buildingAddress}</p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Change address
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700">
            Select a unit ({units.length} units)
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {units.map((unit, index) => (
            <button
              key={unit.apn || index}
              onClick={() => onSelect(unit)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {unit.unit || `Unit ${index + 1}`}
                  </p>
                  <p className="text-sm text-gray-500">APN: {unit.apn}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Declare google maps types
declare global {
  interface Window {
    google?: typeof google
  }
}

// Parse Google address into components
interface ParsedAddress {
  street: string
  city: string
  state: string
  zip: string
}

function parseGoogleAddress(fullAddress: string): ParsedAddress {
  // Example: "123 Main Street, Los Angeles, CA 90012, USA"
  const parts = fullAddress.split(', ')
  
  let street = ''
  let city = ''
  let state = 'CA'
  let zip = ''
  
  if (parts.length >= 3) {
    street = parts[0] // "123 Main Street"
    city = parts[1]   // "Los Angeles"
    
    // Parse state and zip from "CA 90012" or just "CA"
    const stateZipPart = parts[2].replace(', USA', '').replace(' USA', '')
    const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5})?/)
    if (stateZipMatch) {
      state = stateZipMatch[1]
      zip = stateZipMatch[2] || ''
    }
  } else if (parts.length === 2) {
    street = parts[0]
    city = parts[1]
  } else {
    street = fullAddress
  }
  
  return { street, city, state, zip }
}

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [multipleUnits, setMultipleUnits] = useState<Array<{ address: string; unit: string; apn: string }> | null>(null)
  const [selectedBuildingAddress, setSelectedBuildingAddress] = useState("")
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  
  // Track if user has selected an address (prevents re-triggering autocomplete)
  const [addressSelected, setAddressSelected] = useState(false)
  const [selectedParsedAddress, setSelectedParsedAddress] = useState<ParsedAddress | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogle = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService()
        setIsGoogleLoaded(true)
      }
    }
    
    // Check immediately
    checkGoogle()
    
    // Also check after a short delay (in case script is still loading)
    const timer = setTimeout(checkGoogle, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([])
      return
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address'],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
        }
      }
    )
  }, [])

  // Debounced search - only when user is typing (not when address is selected)
  useEffect(() => {
    if (!isGoogleLoaded || addressSelected) return
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        fetchSuggestions(searchQuery)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchSuggestions, isGoogleLoaded, addressSelected])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle address selection from Google autocomplete
  const handleSelectAddress = (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description
    const parsed = parseGoogleAddress(address)
    
    setSearchQuery(address)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedBuildingAddress(address)
    setAddressSelected(true) // Prevent re-triggering autocomplete
    setSelectedParsedAddress(parsed)
    setError(null)
  }

  // Fetch property data from SiteX
  const fetchPropertyData = async () => {
    if (!selectedParsedAddress) {
      setError("Please select an address from the dropdown first")
      return
    }
    
    setIsLoadingProperty(true)
    setError(null)
    setMultipleUnits(null)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      // Build the correct payload matching backend schema:
      // address: str (REQUIRED - street address)
      // city: Optional[str]
      // state: str = "CA"
      // zip: Optional[str] (alias for zip_code)
      const payload = {
        address: selectedParsedAddress.street,  // Backend expects "address" as street
        city: selectedParsedAddress.city || undefined,
        state: selectedParsedAddress.state || 'CA',
        zip: selectedParsedAddress.zip || undefined,
      }
      
      console.log('Property search payload:', payload)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search-v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      // Handle auth errors
      if (response.status === 401) {
        setError("Please log in to search properties. Your session may have expired.")
        return
      }
      
      // Handle validation errors
      if (response.status === 422) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Validation error:', errorData)
        setError(errorData.detail || "Invalid address format. Please try a different address.")
        return
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Single property found
        const propertyData = mapSiteXResponse(result.data, searchQuery)
        onChange(propertyData)
        onComplete()
        
      } else if ((result.status === 'multi_match' || result.status === 'multiple_matches') && result.matches?.length > 0) {
        // Multiple units found (condo building)
        setMultipleUnits(result.matches.map((match: { address?: string; unit?: string; unit_number?: string; apn?: string }) => ({
          address: match.address || searchQuery,
          unit: match.unit || match.unit_number || '',
          apn: match.apn || '',
        })))
        
      } else if (result.status === 'not_found') {
        setError("Property not found in county records. Please verify the address.")
      } else {
        setError(result.message || 'Property not found. Please check the address.')
      }
    } catch (err) {
      console.error('Property search error:', err)
      setError('Failed to fetch property data. Please try again.')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  // Handle unit selection for condos
  const handleSelectUnit = async (unit: { address: string; unit: string; apn: string }) => {
    setIsLoadingProperty(true)
    setMultipleUnits(null)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      // Fetch specific unit by APN - use the correct field names
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search-v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          address: unit.address,
          apn: unit.apn 
        }),
      })

      if (response.status === 401) {
        setError("Please log in to search properties.")
        return
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        const propertyData = mapSiteXResponse(result.data, `${selectedBuildingAddress} ${unit.unit}`)
        onChange(propertyData)
        onComplete()
      } else {
        setError('Failed to fetch unit details. Please try again.')
      }
    } catch (err) {
      console.error('Unit fetch error:', err)
      setError('Failed to fetch unit details. Please try again.')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  // Map SiteX response to PropertyData
  const mapSiteXResponse = (data: {
    address?: string;
    city?: string;
    county?: string;
    state?: string;
    zip_code?: string;
    zip?: string;
    apn?: string;
    legal_description?: string;
    primary_owner?: { full_name?: string };
    secondary_owner?: { full_name?: string };
    owner_name?: string;
  }, fallbackAddress: string): PropertyData => ({
    address: data.address || fallbackAddress,
    city: data.city || '',
    county: data.county || '',
    state: data.state || 'California',
    zip: data.zip_code || data.zip || '',
    apn: data.apn || '',
    legalDescription: data.legal_description || '',
    owner: data.owner_name || formatOwnerName(data.primary_owner, data.secondary_owner),
  })

  // Reset to search
  const handleReset = () => {
    setSearchQuery("")
    setMultipleUnits(null)
    setError(null)
    setAddressSelected(false)
    setSelectedParsedAddress(null)
    onChange(null as unknown as PropertyData)
    inputRef.current?.focus()
  }

  // Handle manual input (user typing instead of selecting)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    setAddressSelected(false) // User is typing, allow autocomplete
    setSelectedParsedAddress(null)
    setError(null)
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Property loaded successfully
  // ─────────────────────────────────────────────────────────────────
  if (value?.address) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-1">
                <Check className="w-4 h-4" />
                Property Found
              </div>
              <p className="font-semibold text-gray-900">{value.address}</p>
              <p className="text-sm text-gray-600 mt-1">
                APN: {value.apn} · {value.county} County
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        </div>

        {value.legalDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Description
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
              {value.legalDescription}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Loading property data
  // ─────────────────────────────────────────────────────────────────
  if (isLoadingProperty) {
    return <PropertySkeleton />
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Multiple units (condo picker)
  // ─────────────────────────────────────────────────────────────────
  if (multipleUnits && multipleUnits.length > 0) {
    return (
      <UnitPicker
        units={multipleUnits}
        onSelect={handleSelectUnit}
        onBack={handleReset}
        buildingAddress={selectedBuildingAddress}
      />
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Search input with Google autocomplete
  // ─────────────────────────────────────────────────────────────────
  
  // Calculate dynamic height based on suggestions
  const suggestionsHeight = showSuggestions && suggestions.length > 0 
    ? Math.min(suggestions.length * 68, 272) // ~68px per suggestion, max 4 visible (272px)
    : 0

  return (
    <div 
      className="space-y-4 transition-all duration-200 ease-out"
      style={{ minHeight: suggestionsHeight > 0 ? `${suggestionsHeight + 120}px` : 'auto' }}
    >
      <div className="relative" ref={suggestionsRef}>
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            // Only show suggestions if user hasn't selected an address yet
            if (!addressSelected && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && addressSelected && selectedParsedAddress) {
              e.preventDefault()
              fetchPropertyData()
            }
          }}
          placeholder="Start typing an address..."
          className={`w-full pl-12 pr-28 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
            addressSelected ? 'border-brand-500 bg-brand-50/30' : 'border-gray-300'
          }`}
          autoFocus
          autoComplete="off"
        />
        
        {/* Search button - only show when address is selected */}
        {addressSelected && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              fetchPropertyData()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-brand-500 text-white px-3 py-1.5 rounded-md hover:bg-brand-600 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Search</span>
          </button>
        )}

        {/* Google Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && !addressSelected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelectAddress(prediction)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left transition-colors"
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {prediction.structured_formatting.main_text}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {prediction.structured_formatting.secondary_text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        {addressSelected 
          ? "Click Search to pull property details from county records."
          : isGoogleLoaded 
            ? "Start typing and select an address, then click Search."
            : "Start typing an address and we'll pull the APN, owner, and legal description automatically."
        }
      </p>
    </div>
  )
}

// Helper to format owner names
function formatOwnerName(primary?: { full_name?: string }, secondary?: { full_name?: string }): string {
  const names: string[] = []
  
  if (primary?.full_name) {
    names.push(primary.full_name.toUpperCase())
  }
  if (secondary?.full_name) {
    names.push(secondary.full_name.toUpperCase())
  }
  
  return names.join(' AND ') || ''
}
