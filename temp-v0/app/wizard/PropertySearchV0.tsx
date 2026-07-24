"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Search,
  MapPin,
  X,
  Check,
  AlertCircle,
  Home,
  FileText,
  Map,
  User,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import ProgressOverlay from "@/components/ProgressOverlay"
import { useGoogleMaps } from "./hooks/useGoogleMaps"
import { usePropertyLookup } from "./hooks/usePropertyLookup"
import { extractStreetAddress, getComponent, getCountyFallback } from "./utils/addressHelpers"
import type { PropertyData, PropertySearchProps, GoogleAutocompletePrediction } from "./types/PropertySearchTypes"
import { google } from "google-maps" // Declare the google variable

export default function PropertySearchV0({
  onVerified,
  onError,
  placeholder = "Enter property address",
  className = "",
  onPropertyFound,
}: PropertySearchProps) {
  // State hooks
  const [inputValue, setInputValue] = useState("")
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoogleAutocompletePrediction | null>(null)
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLegalExpanded, setIsLegalExpanded] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Custom hooks
  const { isGoogleLoaded, autocompleteService, placesService } = useGoogleMaps(onError)
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
    setErrorMessage,
  } = usePropertyLookup(onVerified, onPropertyFound)

  // Search places using Google Autocomplete
  const searchPlaces = (input: string) => {
    if (!autocompleteService || !input || input.length < 3) {
      setSuggestions([])
      return
    }

    const request = {
      input,
      types: ["address"],
      componentRestrictions: { country: "us" },
    }

    autocompleteService.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    })
  }

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setInputValue(value)
    setSelectedAddress(null)
    setSelectedSuggestion(null)
    setErrorMessage(null)
    setSearchAttempted(false)
    setSelectedSuggestionIndex(-1)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (value.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce suggestions
    timeoutRef.current = setTimeout(() => {
      searchPlaces(value)
    }, 500)
  }

  // Process selected suggestion
  const processSelectedSuggestionForAddress = async (suggestion: GoogleAutocompletePrediction) => {
    if (!placesService) return

    return new Promise<void>((resolve, reject) => {
      placesService.getDetails({ placeId: suggestion.place_id }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
          const addressComponents = place.address_components

          const propertyData: PropertyData = {
            fullAddress: place.formatted_address || suggestion.description,
            street: extractStreetAddress(addressComponents),
            city: getComponent(addressComponents, "locality"),
            state: getComponent(addressComponents, "administrative_area_level_1"),
            zip: getComponent(addressComponents, "postal_code"),
            county: getCountyFallback(addressComponents),
            placeId: suggestion.place_id,
          }

          setSelectedAddress(propertyData)
          setInputValue(propertyData.fullAddress)
          setIsLoading(false)
          resolve()
        } else {
          setErrorMessage("Failed to retrieve address details. Please try again.")
          setIsLoading(false)
          reject()
        }
      })
    })
  }

  // Search places and select first result
  const searchPlacesAndSelectFirstForAddress = async (input: string) => {
    if (!autocompleteService) return

    const request = {
      input,
      types: ["address"],
      componentRestrictions: { country: "us" },
    }

    autocompleteService.getPlacePredictions(request, async (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
        await processSelectedSuggestionForAddress(predictions[0])
      } else {
        setErrorMessage("No matching addresses found. Please try a different search.")
        setIsLoading(false)
      }
    })
  }

  // Handle address search
  const handleAddressSearch = async () => {
    if (!inputValue.trim() || inputValue.length < 3) {
      setErrorMessage("Please enter at least 3 characters to search for addresses")
      return
    }

    setIsLoading(true)
    setSearchAttempted(true)
    setSuggestions([])
    setShowSuggestions(false)
    setErrorMessage(null)
    setPropertyDetails(null)
    setShowPropertyDetails(false)

    try {
      if (selectedSuggestion) {
        await processSelectedSuggestionForAddress(selectedSuggestion)
      } else {
        await searchPlacesAndSelectFirstForAddress(inputValue)
      }
    } catch (error) {
      console.error("Address search error:", error)
      setIsLoading(false)
      setErrorMessage("Address search failed. Please try again or select from suggestions.")
    }
  }

  // Handle TitlePoint lookup
  const handleTitlePointLookup = async () => {
    if (!selectedAddress) {
      setErrorMessage("Please search and select an address first")
      return
    }

    await lookupPropertyDetails(selectedAddress)
  }

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: GoogleAutocompletePrediction) => {
    setSelectedSuggestion(suggestion)
    setInputValue(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedSuggestionIndex(-1)

    // Auto-search after selection
    setIsLoading(true)
    try {
      await processSelectedSuggestionForAddress(suggestion)
    } catch (error) {
      setIsLoading(false)
    }
  }

  // Handle clear input
  const handleClearInput = () => {
    setInputValue("")
    setSelectedAddress(null)
    setSelectedSuggestion(null)
    setSuggestions([])
    setShowSuggestions(false)
    setErrorMessage(null)
    setSearchAttempted(false)
    setPropertyDetails(null)
    setShowPropertyDetails(false)
    setSelectedSuggestionIndex(-1)
    inputRef.current?.focus()
  }

  // Handle change address
  const handleChangeAddress = () => {
    handleClearInput()
  }

  // Copy to clipboard
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          handleAddressSearch()
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Overlay */}
      <ProgressOverlay stage={stage} isVisible={isTitlePointLoading} />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Search</h2>
        <p className="text-gray-600">Enter the property address to begin</p>
      </div>

      {/* Input Section */}
      <div className="mb-6">
        <label htmlFor="property-address" className="block text-sm font-semibold text-gray-900 mb-2">
          <MapPin className="inline w-4 h-4 mr-1 text-purple-600" />
          Property Address *
        </label>

        <div className="relative" ref={suggestionsRef}>
          <div className="relative">
            <input
              ref={inputRef}
              id="property-address"
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={!!selectedAddress || isLoading}
              className="w-full px-4 py-3 pr-10 text-base rounded-lg border-2 border-gray-300 
                       focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
                       transition-all duration-200 
                       placeholder:text-gray-400
                       disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Property address input"
              aria-describedby={errorMessage ? "address-error" : undefined}
              aria-autocomplete="list"
              aria-controls="suggestions-list"
              aria-expanded={showSuggestions}
            />

            {inputValue && !selectedAddress && (
              <button
                onClick={handleClearInput}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              id="suggestions-list"
              role="listbox"
              className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.place_id}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-none flex items-start gap-3 ${
                    index === selectedSuggestionIndex ? "bg-purple-50" : "hover:bg-purple-50"
                  }`}
                >
                  <MapPin className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading suggestions indicator */}
          {inputValue.length >= 3 && !showSuggestions && !selectedAddress && !isLoading && (
            <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              Searching for addresses...
            </div>
          )}
        </div>

        {/* Search Button */}
        {!selectedAddress && inputValue.length >= 3 && (
          <button
            onClick={handleAddressSearch}
            disabled={isLoading}
            className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 
                     text-white font-semibold rounded-lg 
                     shadow-lg shadow-purple-500/25 
                     transition-all duration-200 
                     disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                     focus:ring-4 focus:ring-purple-500/50
                     flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Address
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-900">Error</div>
            <div className="text-sm text-red-700" id="address-error">
              {errorMessage}
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Address Verified State */}
      {selectedAddress && !showPropertyDetails && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-green-900 mb-1">Address Verified</div>
              <div className="text-sm text-green-700">{selectedAddress.fullAddress}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTitlePointLookup}
              disabled={isTitlePointLoading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 
                       text-white font-semibold rounded-lg 
                       shadow-lg shadow-purple-500/25 
                       transition-all duration-200 
                       disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                       focus:ring-4 focus:ring-purple-500/50
                       flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Look Up Property Details
            </button>

            <button
              onClick={handleChangeAddress}
              className="px-6 py-3 border-2 border-purple-600 text-purple-600 
                       hover:bg-purple-50 active:scale-98 
                       font-semibold rounded-lg 
                       transition-all duration-200
                       focus:ring-4 focus:ring-purple-500/50"
            >
              Change Address
            </button>
          </div>
        </div>
      )}

      {/* Property Details Card */}
      {showPropertyDetails && propertyDetails && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Home className="w-6 h-6 text-purple-600" />
              Property Details
            </h3>

            <div className="space-y-6">
              {/* Full Address */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Full Address
                    </div>
                    <div className="text-base font-semibold text-gray-900">{propertyDetails.fullAddress}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(propertyDetails.fullAddress, "address")}
                    className="text-gray-400 hover:text-purple-600 transition-colors p-2"
                    aria-label="Copy address"
                  >
                    {copiedField === "address" ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* APN */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      APN (Assessor Parcel Number)
                    </div>
                    <div className="text-base font-semibold text-gray-900">{propertyDetails.apn}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(propertyDetails.apn || "", "apn")}
                    className="text-gray-400 hover:text-purple-600 transition-colors p-2"
                    aria-label="Copy APN"
                  >
                    {copiedField === "apn" ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* County */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Map className="w-4 h-4" />
                      County
                    </div>
                    <div className="text-base font-semibold text-gray-900">{propertyDetails.county}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(propertyDetails.county, "county")}
                    className="text-gray-400 hover:text-purple-600 transition-colors p-2"
                    aria-label="Copy county"
                  >
                    {copiedField === "county" ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Legal Description */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Legal Description
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {propertyDetails.legalDescription && propertyDetails.legalDescription.length > 100 ? (
                        <>
                          <div className={`${!isLegalExpanded ? "line-clamp-2" : ""}`}>
                            {propertyDetails.legalDescription}
                          </div>
                          <button
                            onClick={() => setIsLegalExpanded(!isLegalExpanded)}
                            className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-2 flex items-center gap-1"
                          >
                            {isLegalExpanded ? (
                              <>
                                Show less <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                Show more <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        propertyDetails.legalDescription
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(propertyDetails.legalDescription || "", "legal")}
                    className="text-gray-400 hover:text-purple-600 transition-colors p-2"
                    aria-label="Copy legal description"
                  >
                    {copiedField === "legal" ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Current Owner */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Current Owner
                    </div>
                    <div className="text-base font-semibold text-gray-900">{propertyDetails.currentOwner}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(propertyDetails.currentOwner || "", "owner")}
                    className="text-gray-400 hover:text-purple-600 transition-colors p-2"
                    aria-label="Copy owner name"
                  >
                    {copiedField === "owner" ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-yellow-800">
                <strong>Important:</strong> Please verify all property details are correct before proceeding.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleConfirmProperty}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 active:scale-98 
                         text-white font-semibold rounded-lg 
                         shadow-lg shadow-green-500/25 
                         transition-all duration-200 
                         focus:ring-4 focus:ring-green-500/50
                         flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirm Property
              </button>

              <button
                onClick={handleChangeAddress}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 
                         hover:bg-gray-50 active:scale-98 
                         font-semibold rounded-lg 
                         transition-all duration-200
                         focus:ring-4 focus:ring-gray-500/50"
              >
                Search Different Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Attribution */}
      {isGoogleLoaded && <div className="text-xs text-gray-400 text-center mt-4">Powered by Google Maps</div>}
    </div>
  )
}
