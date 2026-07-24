"use client"

import { Info } from "lucide-react"
import { useState } from "react"

interface ConsolidatedPartiesSectionProps {
  grantorName: string
  granteeName: string
  vesting: string
  legalDescription: string
  onChange: (field: string, value: string) => void
  errors?: {
    grantorName?: string
    granteeName?: string
    legalDescription?: string
  }
  prefilled?: {
    grantorName?: boolean
    legalDescription?: boolean
  }
}

export default function ConsolidatedPartiesSection({
  grantorName,
  granteeName,
  vesting,
  legalDescription,
  onChange,
  errors = {},
  prefilled = {},
}: ConsolidatedPartiesSectionProps) {
  const [showVestingTooltip, setShowVestingTooltip] = useState(false)

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Parties to the Transfer</h3>
        <div className="h-0.5 bg-gradient-to-r from-[#7C4DFF] to-[#7C4DFF]/20" />
      </div>

      {/* Grantor and Grantee Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grantor (FROM) */}
        <div className="space-y-2">
          <label htmlFor="grantorName" className="block text-sm font-medium text-gray-900">
            FROM (Grantor) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="grantorName"
            value={grantorName}
            onChange={(e) => onChange("grantorName", e.target.value)}
            placeholder="e.g., John Smith and Mary Smith, husband and wife"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
              errors.grantorName ? "border-red-500" : "border-gray-300"
            }`}
            aria-required="true"
            aria-invalid={!!errors.grantorName}
          />
          {prefilled.grantorName && (
            <div className="flex items-center gap-2 text-sm text-[#7C4DFF]">
              <div className="w-2 h-2 rounded-full bg-[#7C4DFF]" />
              <span>Prefilled from records</span>
            </div>
          )}
          {errors.grantorName && (
            <p className="text-sm text-red-500" role="alert" aria-live="polite">
              {errors.grantorName}
            </p>
          )}
        </div>

        {/* Grantee (TO) */}
        <div className="space-y-2">
          <label htmlFor="granteeName" className="block text-sm font-medium text-gray-900">
            TO (Grantee) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="granteeName"
            value={granteeName}
            onChange={(e) => onChange("granteeName", e.target.value)}
            placeholder="e.g., Jane Doe, a single woman"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
              errors.granteeName ? "border-red-500" : "border-gray-300"
            }`}
            aria-required="true"
            aria-invalid={!!errors.granteeName}
          />
          {errors.granteeName && (
            <p className="text-sm text-red-500" role="alert" aria-live="polite">
              {errors.granteeName}
            </p>
          )}
        </div>
      </div>

      {/* Vesting */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="vesting" className="block text-sm font-medium text-gray-900">
            Vesting (How will title be held?)
          </label>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowVestingTooltip(true)}
              onMouseLeave={() => setShowVestingTooltip(false)}
              onFocus={() => setShowVestingTooltip(true)}
              onBlur={() => setShowVestingTooltip(false)}
              className="text-gray-400 hover:text-[#7C4DFF] transition-colors"
              aria-label="Vesting information"
            >
              <Info className="w-4 h-4" />
            </button>
            {showVestingTooltip && (
              <div className="absolute left-0 top-6 z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                <p className="font-medium mb-1">Common vesting options:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Sole and Separate Property</li>
                  <li>Joint Tenants</li>
                  <li>Community Property</li>
                  <li>Tenants in Common</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <input
          type="text"
          id="vesting"
          value={vesting}
          onChange={(e) => onChange("vesting", e.target.value)}
          placeholder="e.g., Sole and Separate Property"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
        />
        <p className="text-sm text-gray-500 flex items-start gap-2">
          <span>💡</span>
          <span>Common options: "Sole and Separate", "Joint Tenants", "Community Property", "Tenants in Common"</span>
        </p>
      </div>

      {/* Legal Description */}
      <div className="space-y-2">
        <label htmlFor="legalDescription" className="block text-sm font-medium text-gray-900">
          Legal Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="legalDescription"
          value={legalDescription}
          onChange={(e) => onChange("legalDescription", e.target.value)}
          placeholder="Lot, Block, Tract information..."
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all resize-none ${
            errors.legalDescription ? "border-red-500" : "border-gray-300"
          }`}
          aria-required="true"
          aria-invalid={!!errors.legalDescription}
        />
        {prefilled.legalDescription && (
          <div className="flex items-center gap-2 text-sm text-[#7C4DFF]">
            <div className="w-2 h-2 rounded-full bg-[#7C4DFF]" />
            <span>Prefilled from county records</span>
          </div>
        )}
        {errors.legalDescription && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">
            {errors.legalDescription}
          </p>
        )}
      </div>
    </div>
  )
}
