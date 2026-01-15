"use client"

import { Info } from "lucide-react"
import { useState } from "react"
import VestingInput from "@/components/ui/VestingInput"
import { AIHelpButton } from "@/components/AIHelpButton"

interface ConsolidatedPartiesSectionProps {
  grantorName: string
  granteeName: string
  vesting: string
  legalDescription: string
  deedType?: string
  county?: string
  onChange: (field: string, value: string) => void
  errors?: {
    grantorName?: string
    granteeName?: string
    legalDescription?: string
    vesting?: string
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
  deedType = "Grant Deed",
  county = "",
  onChange,
  errors = {},
  prefilled = {},
}: ConsolidatedPartiesSectionProps) {
  const [showVestingTooltip, setShowVestingTooltip] = useState(false)
  
  // Count grantees for vesting validation hints
  const granteeCount = granteeName ? granteeName.split(/\s+and\s+/i).length : 0

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Parties to the Transfer</h3>
        <div className="h-0.5 bg-gradient-to-r from-[#7C4DFF] to-[#7C4DFF]/20" />
      </div>

      {/* Grantor and Grantee - Full Width Stacked */}
      <div className="grid grid-cols-1 gap-6">
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
            className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
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
            className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
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

      {/* Vesting - Now using enhanced VestingInput component */}
      <div className="space-y-2">
        <VestingInput
          value={vesting}
          onChange={(value) => onChange("vesting", value)}
          error={errors.vesting}
          label="Vesting (How will title be held?)"
        />
        
        {/* AI Help for Vesting */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 flex items-start gap-2">
            <span>💡</span>
            <span>Select from common California vesting types or enter custom language</span>
          </p>
          <AIHelpButton
            context={{ deedType, county, vesting, granteeName }}
            fieldName="vesting"
            placeholder="E.g., What's the difference between joint tenants and community property?"
          />
        </div>
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
          className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all resize-none ${
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

