"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, ChevronDown, Trash2, Star } from "lucide-react"
import {
  getRecentProperties,
  removeRecentProperty,
  getTimeAgo,
  type RecentProperty,
} from "@/features/wizard/services/recentProperties"

interface RecentPropertiesDropdownProps {
  /** Called when a recent property is selected */
  onSelect: (property: RecentProperty) => void
  /** Additional class name */
  className?: string
}

/**
 * RecentPropertiesDropdown Component
 * 
 * Shows recently used properties for quick access.
 * Escrow officers often work on the same properties multiple times.
 * 
 * Part 1.4 of DeedPro Wizard Integration
 */
export default function RecentPropertiesDropdown({
  onSelect,
  className = "",
}: RecentPropertiesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load recent properties on mount
  useEffect(() => {
    setRecentProperties(getRecentProperties())
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Don't render if no recent properties
  if (recentProperties.length === 0) {
    return null
  }

  const handleSelect = (property: RecentProperty) => {
    onSelect(property)
    setIsOpen(false)
  }

  const handleRemove = (e: React.MouseEvent, apn: string) => {
    e.stopPropagation()
    removeRecentProperty(apn)
    setRecentProperties(getRecentProperties())
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 transition-colors py-1"
      >
        <Clock className="w-4 h-4" />
        <span>Recent properties ({recentProperties.length})</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Recent Properties</h4>
              <span className="text-xs text-gray-500">
                {recentProperties.length} saved
              </span>
            </div>
          </div>

          {/* Properties List */}
          <div className="max-h-72 overflow-y-auto">
            {recentProperties.slice(0, 7).map((property, index) => (
              <button
                key={property.apn || index}
                onClick={() => handleSelect(property)}
                className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-none transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {property.address}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {property.city}, {property.state} • APN: {property.apn || "N/A"}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{getTimeAgo(property.lastUsed)}</span>
                      {property.usageCount > 1 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          Used {property.usageCount}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(e, property.apn)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={`Remove ${property.address} from recent`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          {recentProperties.length > 7 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                +{recentProperties.length - 7} more properties
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

