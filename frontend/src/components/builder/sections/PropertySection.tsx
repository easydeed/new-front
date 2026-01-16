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

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [multipleUnits, setMultipleUnits] = useState<Array<{ address: string; unit: string; apn: string }> | null>(null)
  const [selectedBuildingAddress, setSelectedBuildingAddress] = useState("")
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  
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

  // Debounced search
  useEffect(() => {
    if (!isGoogleLoaded) return
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        fetchSuggestions(searchQuery)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchSuggestions, isGoogleLoaded])

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
  const handleSelectAddress = async (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description
    setSearchQuery(address)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedBuildingAddress(address)
    
    await fetchPropertyData(address)
  }

  // Fetch property data from SiteX
  const fetchPropertyData = async (address: string) => {
    setIsLoadingProperty(true)
    setError(null)
    setMultipleUnits(null)

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ address }),
      })

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Single property found
        const propertyData = mapSiteXResponse(result.data, address)
        onChange(propertyData)
        onComplete()
        
      } else if (result.status === 'multiple_matches' && result.matches?.length > 0) {
        // Multiple units found (condo building)
        setMultipleUnits(result.matches.map((match: { address?: string; unit?: string; unit_number?: string; apn?: string }) => ({
          address: match.address || address,
          unit: match.unit || match.unit_number || '',
          apn: match.apn || '',
        })))
        
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
      const token = localStorage.getItem('token')
      
      // Fetch specific unit by APN
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ apn: unit.apn }),
      })

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
  }, fallbackAddress: string): PropertyData => ({
    address: data.address || fallbackAddress,
    city: data.city || '',
    county: data.county || '',
    state: data.state || 'California',
    zip: data.zip_code || data.zip || '',
    apn: data.apn || '',
    legalDescription: data.legal_description || '',
    owner: formatOwnerName(data.primary_owner, data.secondary_owner),
  })

  // Reset to search
  const handleReset = () => {
    setSearchQuery("")
    setMultipleUnits(null)
    setError(null)
    onChange(null as unknown as PropertyData)
    inputRef.current?.focus()
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
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) {
              setShowSuggestions(false)
              fetchPropertyData(searchQuery)
            }
          }}
          placeholder="Start typing an address..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          autoFocus
          autoComplete="off"
        />
        {searchQuery && (
          <button 
            onClick={() => fetchPropertyData(searchQuery)} 
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <Search className="w-5 h-5 text-brand-500 hover:text-brand-600" />
          </button>
        )}

        {/* Google Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                onClick={() => handleSelectAddress(prediction)}
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
        {isGoogleLoaded 
          ? "Start typing and select an address. We'll pull the APN, owner, and legal description from county records."
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
