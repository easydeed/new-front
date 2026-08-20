"use client"

import { useMemo, useEffect } from "react"
import { Calculator, Scale, ShieldCheck, X } from "lucide-react"
import { useGuidance } from "@/contexts/GuidanceContext"
import { FieldGuidance } from "../FieldGuidance"
import { exemptionScope } from '@/lib/exemptionScope'
import { detectDttSuggestion } from "@/lib/dttSuggestions"
import { computeDttBreakdown } from "@/lib/dttCalc"
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
  const { enabled: aiEnabled } = useGuidance()

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
      // The property's city is DATA (from county records) — default the
      // declaration's area to it whenever one exists. The old init only
      // set "city" for cities with their OWN transfer tax, so ordinary
      // incorporated properties initialized as "unincorporated" with a
      // blank City-of line on the deed. The own-DTT list matters for the
      // RATE calculation below, not for whether a city exists.
      onChange({
        isExempt: false,
        exemptReason: "",
        transferValue: "",
        calculatedAmount: "",
        basis: "full_value",
        areaType: city ? "city" : "unincorporated",
        cityName: city || "",
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

  // Calculate DTT when values change. X2.3: the breakdown (county + city
  // portions) is computed here so the result can SHOW it — one opaque
  // total hid what was being declared. DISCOVERY fixed alongside: the old
  // math added a generic $2.20/$1,000 "city tax" for ANY city, including
  // cities with no municipal transfer tax at all — a fabricated number on
  // a legal declaration. City portion now applies only to cities on the
  // own-DTT list (named rates for LA/SF/Oakland; the $2.20 approximation
  // for the other listed cities — owner/legal to verify current
  // schedules; all city rates here are approximations of tiered rates).
  const dttBreakdown = useMemo(() => computeDttBreakdown(value), [value])

  const calculatedAmount = dttBreakdown?.total ?? ""

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
          {/* GUIDE2 — THE OTHER HALF OF THE BASIS. `explanation` says why
              we are proposing this FROM HER FACTS; this says what the
              SECTION reaches, so she can judge whether her facts fall
              inside it. Scope is a fact about California law, not about
              her transfer — the basis made legible, not an inference
              stacked on one. */}
          {exemptionScope(suggestion.codeSection) && (
            <div className="mt-2 rounded-md bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-gray-700">
              <p><span className="font-semibold">What {suggestion.codeSection} covers: </span>
                {exemptionScope(suggestion.codeSection)!.covers}</p>
              {exemptionScope(suggestion.codeSection)!.limit && (
                <p className="mt-1 text-gray-600">
                  <span className="font-semibold">Worth checking: </span>
                  {exemptionScope(suggestion.codeSection)!.limit}
                </p>
              )}
            </div>
          )}
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
        <FieldGuidance
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
          {/* GUIDE2 — THE PATH THAT HAD NOTHING.
              The violet proposal block carries a code section, a title
              and an explanation. This dropdown carried none of it, and
              the officer using it is the one who most needs it: no
              suggestion is guiding her, and she has chosen to decide
              unaided. Help concentrated where the software is already
              confident is help pointed away from the person needing it.

              Scope only. Nothing here says the exemption applies to her
              transfer or that a recorder will accept it. */}
          {exemptionScope(value.exemptReason) && (
            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5
                            text-xs leading-relaxed text-gray-700">
              <p><span className="font-semibold">What {value.exemptReason} covers: </span>
                {exemptionScope(value.exemptReason)!.covers}</p>
              {exemptionScope(value.exemptReason)!.limit && (
                <p className="mt-1 text-gray-600">
                  <span className="font-semibold">Worth checking: </span>
                  {exemptionScope(value.exemptReason)!.limit}
                </p>
              )}
              <p className="mt-1.5 text-gray-500">
                The section recorded is the one you select, and the basis is yours.
              </p>
            </div>
          )}
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
                data-builder-field="dtt-value"
                value={value.transferValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "")
                  const formatted = raw ? parseInt(raw).toLocaleString() : ""
                  manual({ ...value, transferValue: formatted })
                }}
                // U2.4: a realistic dollar amount as placeholder reads as an
                // entered value — the hint must be words, not a number.
                placeholder="Enter amount"
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
                onChange={() => manual({ ...value, areaType: "city", cityName: value.cityName || city || "" })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">City</span>
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

          {/* City name — fills the deed's "City of ____" line */}
          {value.areaType === "city" && (
            <div className="space-y-1">
              <label htmlFor="dtt-city" className="block text-sm font-medium text-gray-700">
                City of
              </label>
              <input
                id="dtt-city"
                data-builder-field="dtt-city"
                type="text"
                value={value.cityName || ""}
                onChange={(e) => manual({ ...value, cityName: e.target.value })}
                // U2.4 same defect class: the real city as a placeholder
                // looked like a filled-in value while printing nothing.
                placeholder="City name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          )}

          {/* Calculated Result — X2.3: the breakdown, not one opaque total */}
          {dttBreakdown && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-emerald-700">
                  Documentary Transfer Tax: ${dttBreakdown.total}
                </span>
              </div>
              <div className="text-sm text-emerald-700 pl-7">
                County ($1.10 / $1,000): ${dttBreakdown.county}
                {dttBreakdown.city && (
                  <> · City of {value.cityName}: ${dttBreakdown.city}</>
                )}
              </div>
              {/* T-2 — the unknown state, said out loud.
                  This used to be indistinguishable from "levies none":
                  a city we had never rated simply contributed $0 and the
                  total read as complete. An invented $0 is the same class
                  of error as the invented $7,500 substring matching
                  produced for South San Francisco — it just costs the
                  other party. Amber, because it is a real value the
                  officer must not take at face value. */}
              {/* T-2a — the tiered high-value bracket, FLAGGED not computed.
                  Measure ULA's thresholds adjust annually; Measure GS and
                  Measure RE have their own brackets. A rate compiled into
                  the registry would go stale silently while still printing
                  a confident number, and understating a City of LA
                  transfer by ULA's margin (base 0.45% against 4%) is the
                  failure being avoided. So: name the measure, state no
                  rate, compute no city portion. */}
              {dttBreakdown.cityTierFlag && (
                <div className="mt-2 ml-7 p-2.5 rounded-md border border-amber-300 bg-amber-50 text-sm text-amber-900">
                  <span className="font-semibold">
                    High-value transfer — tiered city tax applies
                    {' '}({dttBreakdown.cityTierFlag.measure}).
                  </span>{' '}
                  Verify the current schedule and enter the city portion
                  manually. No city amount is computed above $
                  {dttBreakdown.cityTierFlag.threshold.toLocaleString()} —
                  these tiers change, and a stale figure here would be worse
                  than none.
                </div>
              )}
              {dttBreakdown.cityRateUnknown && (
                <div className="mt-2 ml-7 p-2.5 rounded-md border border-amber-300 bg-amber-50 text-sm text-amber-900">
                  <span className="font-semibold">
                    No rate on file for {dttBreakdown.unknownPlace || 'this city'}.
                  </span>{' '}
                  The county portion above is complete. Any city transfer tax
                  must be confirmed against that city&apos;s current schedule
                  and entered manually — it is not included in the total.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
