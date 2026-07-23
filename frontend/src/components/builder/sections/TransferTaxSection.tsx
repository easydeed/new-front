"use client"

import { useMemo, useEffect } from "react"
import { Calculator, Scale, ShieldCheck, X } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"
import { AISuggestion } from "../AISuggestion"
import { detectDttSuggestion } from "@/lib/dttSuggestions"
import type { DTTData, LegalChoiceRecord } from "@/types/builder"

interface TransferTaxSectionProps {
  value: DTTData | null
  /**
   * Ticket TT: legal-choice rule. onChange carries the officer's recorded
   * instruction when (and only when) the change IS an officer action —
   * accepting a proposal or entering values manually. Derived recalculations
   * and neutral initialization pass no decision.
   */
  onChange: (dtt: DTTData, decision?: LegalChoiceRecord) => void
  city?: string
  deedType: string
  grantor: string
  grantee: string
  decision?: LegalChoiceRecord
  suggestionDismissed?: boolean
  onDismissSuggestion: () => void
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
  decision,
  suggestionDismissed,
  onDismissSuggestion,
}: TransferTaxSectionProps) {
  const { enabled: aiEnabled } = useAIAssist()

  // Deterministic detection. Proposes only — never writes state.
  const suggestion = useMemo(
    () => detectDttSuggestion(deedType, grantor, grantee),
    [deedType, grantor, grantee]
  )
  const suggestionPending = !!suggestion && !decision && !suggestionDismissed

  // Neutral initialization only. A legal choice is NEVER auto-applied —
  // the exemption fields stay unset until the officer explicitly accepts
  // or enters values manually (the pre-TT auto-apply behavior is removed).
  useEffect(() => {
    if (!value) {
      const isInCity = city && CITIES_WITH_OWN_DTT.some((c) => city.toLowerCase().includes(c))
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, value === null])

  // Any manual edit is the officer's instruction: record source 'user'.
  const manual = (dtt: DTTData) => {
    onChange(dtt, {
      source: "user",
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })
  }

  const handleAccept = () => {
    if (!suggestion || !value) return
    onChange(
      {
        ...value,
        isExempt: suggestion.proposed.isExempt,
        exemptReason: suggestion.proposed.exemptReason,
        transferValue: "",
        calculatedAmount: "",
      },
      {
        source: "ai_suggested",
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
        codeSection: suggestion.codeSection,
        basis: suggestion.explanation,
      }
    )
  }

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

  // Derived recalculation — not an officer action, no decision stamp.
  useEffect(() => {
    if (value && calculatedAmount !== value.calculatedAmount) {
      onChange({ ...value, calculatedAmount })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedAmount])

  if (!value) return null

  return (
    <div className="space-y-4">
      {/* ── PROPOSED treatment — visually distinct from applied/candidate data.
             Nothing below is written to the deed until Accept is clicked. ── */}
      {suggestionPending && suggestion && (
        <div className="p-4 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 uppercase tracking-wide">
              <Scale className="w-3.5 h-3.5" />
              Proposed — not applied
            </span>
            <span className="text-xs font-mono text-violet-700">{suggestion.codeSection}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{suggestion.title}</p>
          <p className="text-sm text-gray-700 mt-1">{suggestion.explanation}</p>
          <p className="text-xs text-gray-500 mt-2">
            The exemption is not part of this deed unless you accept it. You remain
            responsible for the tax treatment.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-violet-700"
            >
              <ShieldCheck className="w-4 h-4" />
              Accept &amp; apply {suggestion.codeSection}
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss — I&apos;ll decide manually
            </button>
          </div>
        </div>
      )}

      {/* Recorded instruction indicator */}
      {decision?.source === "ai_suggested" && value.isExempt && (
        <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          Exemption {decision.codeSection} accepted by you
          {decision.confirmedAt ? ` · ${new Date(decision.confirmedAt).toLocaleString()}` : ""}
        </div>
      )}

      {/* General AI guidance when there is no confident suggestion */}
      {aiEnabled && !suggestion && !value.isExempt && !suggestionDismissed && (
        <AISuggestion
          message={`For a ${deedType.replace(/-/g, " ")}, documentary transfer tax is typically calculated on the full transfer value.`}
          details="California DTT is $1.10 per $1,000 of transfer value. Some cities add their own tax (e.g., LA adds $4.50/1,000). Common exemptions: R&T 11911 (gift), R&T 11927 (interspousal), R&T 11930 (trust transfer). If the transfer involves no cash exchange (like adding a spouse), it may be exempt."
          onDismiss={onDismissSuggestion}
        />
      )}

      {/* Exempt Toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!value.isExempt}
            onChange={() => manual({ ...value, isExempt: false, exemptReason: "" })}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Calculate Tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value.isExempt}
            onChange={() => manual({ ...value, isExempt: true, transferValue: "", calculatedAmount: "" })}
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
            onChange={(e) => manual({ ...value, exemptReason: e.target.value })}
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
                  manual({ ...value, transferValue: formatted })
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
                onChange={() => manual({ ...value, basis: "full_value" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Full value</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === "less_liens"}
                onChange={() => manual({ ...value, basis: "less_liens" })}
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
                onChange={() => manual({ ...value, areaType: "city" })}
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
                onChange={() => manual({ ...value, areaType: "unincorporated" })}
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
