"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MapPin, X } from "lucide-react"
import { useGoogleMaps } from "@/app/wizard/hooks/useGoogleMaps"
import { google } from "googlemaps"

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

type GoogleAutocompletePrediction = {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

/**
 * PrefillCombo - Google Places autocomplete for address fields
 * Lightweight version of PropertySearchV0 for simple address input
 */
export default function PrefillCombo({
  value,
  onChange,
  placeholder = "Start typing an address...",
  disabled = false,
  className = "",
}: Props) {
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const { isGoogleLoaded, autocompleteService } = useGoogleMaps()

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
  const handleInputChange = (newValue: string) => {
    onChange(newValue)
    setSelectedIndex(-1)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (newValue.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce suggestions
    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue)
    }, 500)
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: GoogleAutocompletePrediction) => {
    onChange(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  // Handle clear input
  const handleClear = () => {
    onChange("")
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={suggestionsRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || !isGoogleLoaded}
          className="w-full px-4 py-3 pr-10 text-base rounded-lg border-2 border-gray-300 
                   focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
                   transition-all duration-200 
                   placeholder:text-gray-400
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Address input with autocomplete"
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          aria-expanded={showSuggestions}
        />

        {value && !disabled && (
          <button
            onClick={handleClear}
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
          id="address-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-none flex items-start gap-3 ${
                index === selectedIndex ? "bg-purple-50" : "hover:bg-purple-50"
              }`}
            >
              <MapPin className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{suggestion.structured_formatting.main_text}</div>
                <div className="text-sm text-gray-500 truncate">{suggestion.structured_formatting.secondary_text}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {value.length >= 3 && !showSuggestions && !disabled && isGoogleLoaded && (
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          Searching for addresses...
        </div>
      )}

      {/* Google not loaded message */}
      {!isGoogleLoaded && <div className="mt-2 text-sm text-gray-500">Loading address autocomplete...</div>}
    </div>
  )
}
