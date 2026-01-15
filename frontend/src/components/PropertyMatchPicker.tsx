"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Home, User, X, ChevronRight, Search, AlertCircle } from "lucide-react"

/**
 * Property match from multi-match SiteX response
 */
interface PropertyMatch {
  address: string
  city: string
  state: string
  zip_code: string
  apn: string
  fips: string
  owner_name: string
  property_type?: string
}

/**
 * Props for PropertyMatchPicker component
 */
interface PropertyMatchPickerProps {
  /** Array of property matches to display */
  matches: PropertyMatch[]
  /** Called when user selects a property */
  onSelect: (match: PropertyMatch) => void
  /** Called when user cancels/refines search */
  onCancel: () => void
  /** The original search address for context */
  searchAddress: string
  /** Whether selection is in progress */
  isLoading?: boolean
}

/**
 * PropertyMatchPicker Component
 * 
 * Displays a modal picker when property search returns multiple matches.
 * Supports keyboard navigation (↑↓ Enter Escape) for power users.
 * 
 * Phase 2.1 of DeedPro Enhancement Project
 */
export default function PropertyMatchPicker({
  matches,
  onSelect,
  onCancel,
  searchAddress,
  isLoading = false,
}: PropertyMatchPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isLoading) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, matches.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          if (matches[selectedIndex]) {
            onSelect(matches[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onCancel()
          break
      }
    },
    [selectedIndex, matches, onSelect, onCancel, isLoading]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.getElementById(`match-${selectedIndex}`)
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedIndex])

  const activeIndex = hoveredIndex ?? selectedIndex

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="picker-title" className="text-lg font-bold flex items-center gap-2">
                <Search className="w-5 h-5" />
                Multiple Properties Found
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                {matches.length} properties match "{searchAddress}"
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close picker"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Match List */}
        <div 
          className="max-h-[60vh] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label="Property matches"
        >
          {matches.map((match, index) => (
            <button
              key={`${match.apn || index}-${match.fips || index}`}
              id={`match-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => !isLoading && onSelect(match)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={isLoading}
              className={`
                w-full px-6 py-4 text-left border-b border-gray-100 last:border-none
                transition-all duration-150
                flex items-start gap-4
                disabled:opacity-50 disabled:cursor-not-allowed
                ${index === activeIndex 
                  ? "bg-purple-50 border-l-4 border-l-purple-500" 
                  : "hover:bg-gray-50 border-l-4 border-l-transparent"
                }
              `}
            >
              {/* Property Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${index === activeIndex ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"}
              `}>
                <Home className="w-5 h-5" />
              </div>

              {/* Property Details */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {match.address || "Address not available"}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">
                  {[match.city, match.state, match.zip_code].filter(Boolean).join(", ") || "Location not available"}
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  {match.apn && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      APN: {match.apn}
                    </span>
                  )}
                  {match.owner_name && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {match.owner_name}
                    </span>
                  )}
                  {match.property_type && (
                    <span className="text-gray-400">
                      {match.property_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Selection Indicator */}
              <ChevronRight className={`
                w-5 h-5 flex-shrink-0 transition-transform
                ${index === activeIndex ? "text-purple-500 translate-x-1" : "text-gray-300"}
              `} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              ← Refine Search
            </button>
            
            <div className="text-sm text-gray-500 hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd>
                Cancel
              </span>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 font-medium">Loading property details...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Enrichment Status Indicator Component
 * Shows progress during property data enrichment
 */
interface EnrichmentStatusProps {
  loading: boolean
  stage: "idle" | "searching" | "enriching" | "complete" | "error"
  message: string
  fieldsFound?: {
    address: boolean
    apn: boolean
    owner: boolean
    legalDescription: boolean
    county: boolean
  }
}

export function EnrichmentStatus({ loading, stage, message, fieldsFound }: EnrichmentStatusProps) {
  if (!loading && stage === "idle") return null

  return (
    <div className={`
      rounded-lg p-4 transition-all duration-300
      ${stage === "error" ? "bg-red-50 border-2 border-red-200" : "bg-blue-50 border-2 border-blue-200"}
      ${stage === "complete" ? "bg-green-50 border-2 border-green-200" : ""}
    `}>
      <div className="flex items-center gap-3">
        {loading && stage !== "complete" && stage !== "error" && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        {stage === "complete" && (
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {stage === "error" && (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
        <span className={`
          font-medium
          ${stage === "error" ? "text-red-800" : ""}
          ${stage === "complete" ? "text-green-800" : "text-blue-800"}
        `}>
          {message}
        </span>
      </div>

      {/* Fields Found Checklist */}
      {stage === "complete" && fieldsFound && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-green-200">
          <FieldCheckItem label="Address" found={fieldsFound.address} />
          <FieldCheckItem label="APN" found={fieldsFound.apn} />
          <FieldCheckItem label="County" found={fieldsFound.county} />
          <FieldCheckItem label="Owner" found={fieldsFound.owner} />
          <FieldCheckItem label="Legal Desc" found={fieldsFound.legalDescription} />
        </div>
      )}
    </div>
  )
}

function FieldCheckItem({ label, found }: { label: string; found: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {found ? (
        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
      )}
      <span className={found ? "text-green-700" : "text-gray-500"}>{label}</span>
    </div>
  )
}

