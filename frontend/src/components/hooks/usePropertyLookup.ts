"use client"

import { useState } from "react"
import type { PropertyData, EnrichedPropertyData } from "../types/PropertySearchTypes"

export function usePropertyLookup(onVerified: (data: PropertyData) => void, onPropertyFound?: (data: any) => void) {
  const [isSiteXLoading, setIsSiteXLoading] = useState(false)
  const [propertyDetails, setPropertyDetails] = useState<EnrichedPropertyData | null>(null)
  const [showPropertyDetails, setShowPropertyDetails] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stage, setStage] = useState<string>("")

  const lookupPropertyDetails = async (address: PropertyData) => {
    setIsSiteXLoading(true)
    setErrorMessage(null)
    setStage("Connecting to SiteX...")

    try {
      // Simulate API call stages
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setStage("Retrieving property data...")

      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      // Call SiteX API
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullAddress: address.fullAddress,  // ✅ FIXED: Backend expects "fullAddress" not "address"
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          county: address.county,
        }),
      })

      if (!response.ok) {
        throw new Error("SiteX lookup failed")
      }

      const data = await response.json()

      setStage("Finalizing...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      // ✅ BACKEND RETURNS: grantorName, county, city, state, zip, apn, legalDescription
      // ✅ WIZARD EXPECTS: currentOwnerPrimary (PropertyStepBridge line 43)
      const enrichedData: any = {
        ...address,
        // Pass through ALL backend fields unchanged
        ...data,
        // Add aliases for backward compatibility
        currentOwner: data.grantorName || "",
        currentOwnerPrimary: data.grantorName || "",  // PropertyStepBridge expects this name
      }

      setPropertyDetails(enrichedData)
      setShowPropertyDetails(true)
      onPropertyFound?.(enrichedData)
    } catch (error) {
      console.error("SiteX lookup error:", error)
      setErrorMessage("SiteX lookup failed. Please try again or continue without enriched data.")
    } finally {
      setIsSiteXLoading(false)
      setStage("")
    }
  }

  const handleConfirmProperty = () => {
    if (propertyDetails) {
      onVerified(propertyDetails)
    }
  }

  return {
    isSiteXLoading,
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
