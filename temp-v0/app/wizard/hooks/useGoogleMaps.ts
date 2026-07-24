"use client"

import { useState, useEffect } from "react"
import type { google } from "google-maps" // Declare the google variable

export function useGoogleMaps(onError?: (error: string) => void) {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      initializeServices()
      return
    }

    // Load Google Maps script
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      initializeServices()
    }

    script.onerror = () => {
      onError?.("Failed to load Google Maps. Please refresh the page.")
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [])

  const initializeServices = () => {
    if (window.google?.maps?.places) {
      setAutocompleteService(new window.google.maps.places.AutocompleteService())

      // Create a dummy div for PlacesService (required by Google Maps API)
      const dummyDiv = document.createElement("div")
      setPlacesService(new window.google.maps.places.PlacesService(dummyDiv))

      setIsGoogleLoaded(true)
    }
  }

  return {
    isGoogleLoaded,
    autocompleteService,
    placesService,
  }
}
