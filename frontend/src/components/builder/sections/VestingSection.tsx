"use client"

import { useState, useMemo } from "react"
import { HelpCircle } from "lucide-react"
import { useGuidance } from "@/contexts/GuidanceContext"
import { FieldGuidance, FieldNote } from "../FieldGuidance"
import { getVestingSuggestion, type VestingSuggestion } from "@/lib/vestingSuggestion"
import { Scale, ShieldCheck, X } from "lucide-react"
import type { LegalChoiceRecord, VestingProposal } from "@/types/builder"

interface VestingSectionProps {
  value: string
  /** Legal-choice rule: onChange carries the officer's recorded instruction
   *  when the change is an officer action (accepting the proposal or choosing
   *  manually). Vesting is never auto-applied. */
  onChange: (vesting: string, decision?: LegalChoiceRecord) => void
  granteeCount: number
  deedType: string
  grantee: string
  decision?: LegalChoiceRecord
  /**
   * DOCTRINE A / H1 §2.2 — the vesting characterization that arrived welded
   * to the county record's or the prelim's owner string. It is HOW THE
   * CURRENT OWNER HOLDS TITLE, not how the grantees will hold it; it is
   * offered here because that is the question it bears on, and it is offered
   * as a proposal because answering that question is the officer's job.
   */
  recordProposal?: VestingProposal
}

export const VESTING_OPTIONS = [
  // X2.2: "a single person" and the gender-neutral sole-and-separate are
  // the values the AI proposes — they must exist as NAMED options or the
  // accepted suggestion lights the Custom radio (the recommended path
  // must not look like the risky path).
  { value: "a single person", label: "A Single Person", min: 1, max: 1 },
  { value: "a single man", label: "A Single Man", min: 1, max: 1 },
  { value: "a single woman", label: "A Single Woman", min: 1, max: 1 },
  { value: "an unmarried man", label: "An Unmarried Man", min: 1, max: 1 },
  { value: "an unmarried woman", label: "An Unmarried Woman", min: 1, max: 1 },
  { value: "a married man as his sole and separate property", label: "Married Man - Sole & Separate", min: 1, max: 1 },
  { value: "a married woman as her sole and separate property", label: "Married Woman - Sole & Separate", min: 1, max: 1 },
  { value: "a married person as their sole and separate property", label: "Married - Sole & Separate", min: 1, max: 1 },
  { value: "husband and wife as joint tenants", label: "Husband & Wife - Joint Tenants", min: 2, max: 2 },
  { value: "husband and wife as community property", label: "Husband & Wife - Community Property", min: 2, max: 2 },
  { value: "husband and wife as community property with right of survivorship", label: "Community Property w/ Survivorship", min: 2, max: 2 },
  { value: "as joint tenants with right of survivorship", label: "Joint Tenants", min: 2, max: 99 },
  { value: "as tenants in common", label: "Tenants in Common", min: 2, max: 99 },
]

// AI-powered explanations for each vesting type
const VESTING_EXPLANATIONS: Record<string, string> = {
  "joint tenants": "Right of survivorship — share passes to surviving owner(s)",
  "community property": "For married couples — each spouse owns 50%",
  "community property with right of survivorship": "Community property + automatic transfer on death",
  "tenants in common": "Shares can be unequal, can be willed separately",
  "sole and separate": "One spouse's separate property, not community",
  "single": "Single person — no co-owners",
  "trustee": "Property held by trustee for trust beneficiaries",
}

export function VestingSection({ value, onChange, granteeCount, deedType, grantee, decision, recordProposal }: VestingSectionProps) {
  const { enabled: aiEnabled } = useGuidance()
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState("")
  const [suggestionApplied, setSuggestionApplied] = useState(false)
  const [recordProposalDismissed, setRecordProposalDismissed] = useState(false)

  // Get AI suggestion
  const suggestion = useMemo(() => {
    if (!aiEnabled) return null
    return getVestingSuggestion(grantee, granteeCount, deedType)
  }, [grantee, granteeCount, deedType, aiEnabled])

  // Filter options based on grantee count
  const filteredOptions = VESTING_OPTIONS.filter(
    (opt) => granteeCount >= opt.min && granteeCount <= opt.max
  )

  // Get explanation for current selection
  const currentExplanation = useMemo(() => {
    if (!value || !aiEnabled) return null
    const valueLower = value.toLowerCase()
    
    for (const [key, explanation] of Object.entries(VESTING_EXPLANATIONS)) {
      if (valueLower.includes(key)) {
        return explanation
      }
    }
    return null
  }, [value, aiEnabled])

  // Any manual selection is the officer's instruction: record source 'user'.
  const manual = (vesting: string) => {
    onChange(vesting, {
      source: "user",
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })
  }

  // DOCTRINE A — accepting the RECORD's characterization. Same rule as every
  // other legal choice: the acceptance is the instruction, recorded with the
  // source that claimed it and the basis line the officer actually read.
  // Nothing here pre-selects, pre-fills or defaults; a proposal the officer
  // never touches leaves the vesting unset.
  const handleAcceptRecordProposal = () => {
    if (!recordProposal) return
    onChange(recordProposal.value, {
      source: recordProposal.source,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      basis: recordProposal.basis,
    })
    setRecordProposalDismissed(true)
  }

  // Accepting the proposal records it as the authorized instruction, with
  // the basis text the officer was shown.
  const handleApplySuggestion = () => {
    if (suggestion) {
      onChange(suggestion.value, {
        source: "ai_suggested",
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
        basis: suggestion.reason,
      })
      setSuggestionApplied(true)
    }
  }

  // Check if current value matches a standard option (case-insensitive —
  // an accepted suggestion must select its named option, X2.2).
  const matchesOption = (optValue: string) =>
    !!value && optValue.trim().toLowerCase() === value.trim().toLowerCase()
  const isStandardOption = filteredOptions.some((opt) => matchesOption(opt.value))
  const isCustom = value && !isStandardOption

  // Handle custom input
  const handleCustomSelect = () => {
    setShowCustom(true)
    setCustomValue(value || "")
  }

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue)
    manual(newValue)
  }

  // Show general guidance when AI is enabled but no specific suggestion
  const showGeneralGuidance = aiEnabled && !suggestion && !value && granteeCount > 0

  return (
    <div className="space-y-4">
      {/* DOCTRINE A / H1 §2.2 — the characterization that arrived attached to
          the owner's name. Violet, dashed, unapplied: the same treatment the
          AI proposal gets, because it is the same kind of thing — somebody
          else's reading of a legal question that is the officer's to answer.
          The heading says CURRENT because the commonest way to get this wrong
          is to carry yesterday's vesting into tomorrow's deed. */}
      {recordProposal && !value && !recordProposalDismissed && (
        <div className="p-4 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 uppercase tracking-wide">
              <Scale className="w-3.5 h-3.5" />
              How title is held TODAY — proposed, not applied
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">&quot;{recordProposal.value}&quot;</p>
          <p className="text-sm text-gray-700 mt-1">{recordProposal.basis}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleAcceptRecordProposal}
              className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-violet-700"
            >
              <ShieldCheck className="w-4 h-4" />
              Use this vesting
            </button>
            <button
              type="button"
              onClick={() => setRecordProposalDismissed(true)}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss — I&apos;ll choose manually
            </button>
          </div>
        </div>
      )}

      {/* PROPOSED vesting — visually distinct from an applied value.
          Nothing is written to the deed until the officer accepts. */}
      {suggestion && !value && !suggestionApplied && (
        <div className="p-4 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 uppercase tracking-wide">
              <Scale className="w-3.5 h-3.5" />
              Proposed — not applied
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">&quot;{suggestion.value}&quot;</p>
          <p className="text-sm text-gray-700 mt-1">{suggestion.reason}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-violet-700"
            >
              <ShieldCheck className="w-4 h-4" />
              Accept &amp; apply
            </button>
            <button
              type="button"
              onClick={() => setSuggestionApplied(true)}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss — I&apos;ll choose manually
            </button>
          </div>
        </div>
      )}

      {/* Recorded instruction indicator. Any accepted PROPOSAL shows it —
          not just the AI's. A vesting taken from the county record or the
          prelim is equally somebody else's reading that the officer adopted,
          and the record must say she adopted it. */}
      {decision && decision.source !== "user" && value && (
        <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          Vesting accepted by you
          {decision.confirmedAt ? ` · ${new Date(decision.confirmedAt).toLocaleString()}` : ""}
        </div>
      )}

      {/* General AI Guidance when no specific suggestion */}
      {showGeneralGuidance && (
        <FieldGuidance
          message={granteeCount === 1 
            ? "For a single grantee, select their marital status. Use 'sole and separate' if married but taking title individually."
            : granteeCount === 2
              ? "For two grantees, choose based on relationship: married couples often use community property or joint tenants."
              : "For multiple grantees, joint tenants provides survivorship rights; tenants in common allows separate shares."
          }
          details={granteeCount === 1
            ? "Single/unmarried: Property is owned individually. Married as sole & separate: Spouse has no claim to the property — often used when one spouse is purchasing with separate funds or for estate planning reasons."
            : granteeCount === 2
              ? "Joint Tenants: Equal ownership with right of survivorship — when one dies, the other automatically inherits. Community Property: For married couples — each spouse owns 50%. Tenants in Common: Unequal shares allowed, no survivorship — share passes to heirs."
              : "Joint Tenants: All owners have equal shares with right of survivorship. Tenants in Common: Shares can be unequal (e.g., 50/25/25) and each share can be willed separately. Specify percentages if using tenants in common."
          }
          onDismiss={() => setSuggestionApplied(true)}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How will title be held?
        </label>

        <div className="space-y-2">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className={`
                flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                ${matchesOption(option.value)
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <input
                type="radio"
                name="vesting"
                value={option.value}
                checked={matchesOption(option.value)}
                onChange={(e) => {
                  manual(e.target.value)
                  setShowCustom(false)
                }}
                className="w-4 h-4 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-gray-900">{option.label}</span>
            </label>
          ))}

          {/* Custom/Other Option */}
          <label
            className={`
              flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
              ${showCustom || isCustom
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <input
              type="radio"
              name="vesting"
              checked={showCustom || isCustom}
              onChange={handleCustomSelect}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-gray-900">Other / Custom</span>
          </label>

          {/* Custom Input */}
          {(showCustom || isCustom) && (
            <input
              type="text"
              value={isCustom ? value : customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Enter custom vesting language..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
            />
          )}
        </div>
      </div>

      {/* AI Explanation for current selection */}
      {currentExplanation && (
        <FieldNote message={currentExplanation} />
      )}

      {/* Warning: Joint tenancy with 1 grantee */}
      {granteeCount === 1 && value?.toLowerCase().includes("joint tenant") && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Joint tenancy requires 2 or more grantees. Add another grantee or select a different vesting.
          </p>
        </div>
      )}

      {/* Warning: Community property with 1 grantee */}
      {granteeCount === 1 && value?.toLowerCase().includes("community property") && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Community property requires a married couple (2 grantees).
          </p>
        </div>
      )}
    </div>
  )
}
