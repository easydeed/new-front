"use client"

import { useMemo, useEffect, useState } from "react"
import { Calculator } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"
import { AIApplied, AISuggestion } from "../AISuggestion"
import { getTransferTaxSuggestion } from "@/lib/ai-helpers"
import type { DTTData } from "@/types/builder"

interface TransferTaxSectionProps {
  value: DTTData | null
  onChange: (dtt: DTTData) => void
  city?: string
  deedType: string
  grantor: string
  grantee: string
}

// Cities with their own DTT rates
const CITIES_WITH_OWN_DTT = [
  "los angeles",
  "san francisco",
  "oakland",
  "berkeley",
  "san jose",
  "sacramento",
  "riverside",
  "pomona",
  "culver city",
  "santa monica",
  "redondo beach",
  "inglewood",
  "long beach",
  "pasadena",
]

// DTT exemption codes
const EXEMPTION_REASONS = [
  { value: "R&T 11911", label: "R&T 11911 - Gift / No Consideration" },
  { value: "R&T 11927", label: "R&T 11927 - Interspousal Transfer" },
  { value: "R&T 11930", label: "R&T 11930 - Transfer to/from Revocable Trust" },
  { value: "R&T 11923", label: "R&T 11923 - Court Order / Decree" },
  { value: "R&T 11925", label: "R&T 11925 - Foreclosure / Deed in Lieu" },
  { value: "R&T 11922", label: "R&T 11922 - Government Entity" },
  { value: "R&T 11926", label: "R&T 11926 - Confirmation Deed" },
  { value: "Other", label: "Other Exemption" },
]

export function TransferTaxSection({
  value,
  onChange,
  city,
  deedType,
  grantor,
  grantee,
}: TransferTaxSectionProps) {
  const { enabled: aiEnabled } = useAIAssist()
  const [aiAppliedMessage, setAiAppliedMessage] = useState<string | null>(null)
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)

  // Get AI suggestion
  const suggestion = useMemo(() => {
    if (!aiEnabled) return null
    return getTransferTaxSuggestion(deedType, grantor, grantee)
  }, [deedType, grantor, grantee, aiEnabled])

  // Initialize with smart defaults
  useEffect(() => {
    if (!value) {
      const isInCity = city && CITIES_WITH_OWN_DTT.some((c) => city.toLowerCase().includes(c))

      // If AI is enabled and we have a high-confidence suggestion, auto-apply
      if (aiEnabled && suggestion && suggestion.confidence === "high") {
        onChange({
          isExempt: suggestion.isExempt,
          exemptReason: suggestion.exemptReason,
          transferValue: "",
          calculatedAmount: "",
          basis: "full_value",
          areaType: isInCity ? "city" : "unincorporated",
          cityName: isInCity ? city : "",
        })
        setAiAppliedMessage(suggestion.reason)
      } else {
        // Default initialization without AI
        onChange({
          isExempt: false,
          exemptReason: "",
          transferValue: "",
          calculatedAmount: "",
          basis: "full_value",
          areaType: isInCity ? "city" : "unincorporated",
          cityName: isInCity ? city : "",
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, value === null])

  // Calculate DTT when values change
  const calculatedAmount = useMemo(() => {
    if (!value || value.isExempt || !value.transferValue) return ""

    const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ""))
    if (isNaN(amount) || amount <= 0) return ""

    // County rate: $1.10 per $1,000
    const countyTax = (amount / 1000) * 1.1

    // City rate varies
    let cityTax = 0
    if (value.areaType === "city") {
      const cityLower = (value.cityName || "").toLowerCase()

      if (cityLower.includes("los angeles")) {
        cityTax = (amount / 1000) * 4.5
      } else if (cityLower.includes("san francisco")) {
        cityTax = (amount / 1000) * 7.5
      } else if (cityLower.includes("oakland")) {
        cityTax = (amount / 1000) * 15.0
      } else {
        cityTax = (amount / 1000) * 2.2
      }
    }

    return (countyTax + cityTax).toFixed(2)
  }, [value])

  // Update calculated amount when it changes
  useEffect(() => {
    if (value && calculatedAmount !== value.calculatedAmount) {
      onChange({ ...value, calculatedAmount })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedAmount])

  // Handle applying AI suggestion manually
  const handleApplySuggestion = () => {
    if (suggestion && value) {
      onChange({
        ...value,
        isExempt: suggestion.isExempt,
        exemptReason: suggestion.exemptReason,
        transferValue: "",
        calculatedAmount: "",
      })
      setAiAppliedMessage(suggestion.reason)
      setSuggestionDismissed(true)
    }
  }

  if (!value) return null

  return (
    <div className="space-y-4">
      {/* AI Applied Message (for auto-applied high-confidence suggestions) */}
      {aiAppliedMessage && value.isExempt && <AIApplied message={aiAppliedMessage} />}

      {/* AI Suggestion (for medium-confidence, show as dismissible suggestion) */}
      {suggestion &&
        suggestion.confidence === "medium" &&
        !value.isExempt &&
        !suggestionDismissed && (
          <AISuggestion
            message={suggestion.reason}
            action="Mark as exempt"
            onApply={handleApplySuggestion}
            onDismiss={() => setSuggestionDismissed(true)}
          />
        )}

      {/* Exempt Toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!value.isExempt}
            onChange={() => {
              onChange({ ...value, isExempt: false, exemptReason: "" })
              setAiAppliedMessage(null)
            }}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Calculate Tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value.isExempt}
            onChange={() => {
              onChange({ ...value, isExempt: true, transferValue: "", calculatedAmount: "" })
            }}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Exempt</span>
        </label>
      </div>

      {value.isExempt ? (
        /* Exemption Reason */
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exemption Reason
          </label>
          <select
            value={value.exemptReason}
            onChange={(e) => onChange({ ...value, exemptReason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">Select reason...</option>
            {EXEMPTION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Tax Calculation */
        <div className="space-y-4">
          {/* Transfer Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={value.transferValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "")
                  const formatted = raw ? parseInt(raw).toLocaleString() : ""
                  onChange({ ...value, transferValue: formatted })
                }}
                placeholder="500,000"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Basis */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === "full_value"}
                onChange={() => onChange({ ...value, basis: "full_value" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Full value</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === "less_liens"}
                onChange={() => onChange({ ...value, basis: "less_liens" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Less liens/encumbrances</span>
            </label>
          </div>

          {/* Area Type */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === "city"}
                onChange={() => onChange({ ...value, areaType: "city" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">
                City{value.cityName ? ` of ${value.cityName}` : ""}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === "unincorporated"}
                onChange={() => onChange({ ...value, areaType: "unincorporated" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Unincorporated</span>
            </label>
          </div>

          {/* Calculated Result */}
          {calculatedAmount && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-emerald-700">
                Documentary Transfer Tax: ${calculatedAmount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
