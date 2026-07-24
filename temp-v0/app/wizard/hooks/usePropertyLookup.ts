"use client"

import { useState } from "react"
import type { PropertyData, EnrichedPropertyData } from "../types/PropertySearchTypes"

export function usePropertyLookup(onVerified: (data: PropertyData) => void, onPropertyFound?: (data: any) => void) {
  const [isTitlePointLoading, setIsTitlePointLoading] = useState(false)
  const [propertyDetails, setPropertyDetails] = useState<EnrichedPropertyData | null>(null)
  const [showPropertyDetails, setShowPropertyDetails] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stage, setStage] = useState<string>("")

  const lookupPropertyDetails = async (address: PropertyData) => {
    setIsTitlePointLoading(true)
    setErrorMessage(null)
    setStage("Connecting to TitlePoint...")

    try {
      // Simulate API call stages
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setStage("Retrieving property data...")

      // Call TitlePoint API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/titlepoint/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address.fullAddress,
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          county: address.county,
        }),
      })

      if (!response.ok) {
        throw new Error("TitlePoint lookup failed")
      }

      const data = await response.json()

      setStage("Finalizing...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const enrichedData: EnrichedPropertyData = {
        ...address,
        apn: data.apn || "Not available",
        legalDescription: data.legal_description || "Not available",
        currentOwner: data.current_owner || "Not available",
        propertyType: data.property_type || "Residential",
      }

      setPropertyDetails(enrichedData)
      setShowPropertyDetails(true)
      onPropertyFound?.(enrichedData)
    } catch (error) {
      console.error("TitlePoint lookup error:", error)
      setErrorMessage("TitlePoint lookup failed. Please try again or continue without enriched data.")
    } finally {
      setIsTitlePointLoading(false)
      setStage("")
    }
  }

  const handleConfirmProperty = () => {
    if (propertyDetails) {
      onVerified(propertyDetails)
    }
  }

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
    setErrorMessage,
  }
}
