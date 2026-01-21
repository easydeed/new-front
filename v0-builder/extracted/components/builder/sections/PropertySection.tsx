"use client"

import { useState } from "react"
import { MapPin, Search, Check, Loader2 } from "lucide-react"
import type { PropertyData } from "@/types/builder"

interface PropertySectionProps {
  value: PropertyData | null
  onChange: (property: PropertyData) => void
  onComplete: () => void
}

// Mock property data for demo
const MOCK_PROPERTIES: Record<string, PropertyData> = {
  "123 main st": {
    address: "123 Main Street, Los Angeles, CA 90012",
    city: "Los Angeles",
    county: "Los Angeles",
    state: "California",
    zip: "90012",
    apn: "5432-001-012",
    legalDescription:
      "LOT 12 OF TRACT NO. 54321, IN THE CITY OF LOS ANGELES, COUNTY OF LOS ANGELES, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 500, PAGES 1 THROUGH 3 OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.",
    owner: "JOHN SMITH AND JANE SMITH",
  },
  "456 oak ave": {
    address: "456 Oak Avenue, San Francisco, CA 94102",
    city: "San Francisco",
    county: "San Francisco",
    state: "California",
    zip: "94102",
    apn: "1234-567-890",
    legalDescription:
      "LOT 5 IN BLOCK 7 OF THE OAK AVENUE SUBDIVISION, IN THE CITY AND COUNTY OF SAN FRANCISCO, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 25, PAGE 50 OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.",
    owner: "ROBERT JOHNSON",
  },
}

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (address: string) => {
    setIsSearching(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check mock data
    const normalizedQuery = address.toLowerCase().trim()
    const mockProperty = Object.entries(MOCK_PROPERTIES).find(([key]) => normalizedQuery.includes(key))

    if (mockProperty) {
      onChange(mockProperty[1])
      onComplete()
    } else {
      // Generate a mock property based on search
      const mockResult: PropertyData = {
        address: address,
        city: "Sacramento",
        county: "Sacramento",
        state: "California",
        zip: "95814",
        apn: `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}`,
        legalDescription: `LOT ${Math.floor(Math.random() * 50) + 1} OF TRACT NO. ${Math.floor(Math.random() * 90000) + 10000}, AS PER MAP RECORDED IN THE OFFICE OF THE COUNTY RECORDER.`,
        owner: "PROPERTY OWNER",
      }
      onChange(mockResult)
      onComplete()
    }

    setIsSearching(false)
  }

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
              onClick={() => onChange(null as unknown as PropertyData)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        </div>

        {value.legalDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Description</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
              {value.legalDescription}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
          placeholder="Enter property address..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          autoFocus
        />
        {isSearching ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        ) : (
          searchQuery && (
            <button onClick={() => handleSearch(searchQuery)} className="absolute right-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-primary hover:text-primary/80" />
            </button>
          )
        )}
      </div>

      <p className="text-sm text-gray-500">
        {"Start typing an address and we'll pull the APN, owner, and legal description automatically."}
      </p>
    </div>
  )
}
