"use client"

import { useState, useMemo } from "react"
import { HelpCircle } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"
import { AISuggestion, AIHint } from "../AISuggestion"
import { getVestingSuggestion, type VestingSuggestion } from "@/lib/ai-helpers"

interface VestingSectionProps {
  value: string
  onChange: (vesting: string) => void
  granteeCount: number
  deedType: string
  grantee: string
}

const VESTING_OPTIONS = [
  { value: "a single man", label: "A Single Man", min: 1, max: 1 },
  { value: "a single woman", label: "A Single Woman", min: 1, max: 1 },
  { value: "an unmarried man", label: "An Unmarried Man", min: 1, max: 1 },
  { value: "an unmarried woman", label: "An Unmarried Woman", min: 1, max: 1 },
  { value: "a married man as his sole and separate property", label: "Married Man - Sole & Separate", min: 1, max: 1 },
  { value: "a married woman as her sole and separate property", label: "Married Woman - Sole & Separate", min: 1, max: 1 },
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

export function VestingSection({ value, onChange, granteeCount, deedType, grantee }: VestingSectionProps) {
  const { enabled: aiEnabled } = useAIAssist()
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState("")
  const [suggestionApplied, setSuggestionApplied] = useState(false)

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

  // Handle suggestion application
  const handleApplySuggestion = () => {
    if (suggestion) {
      onChange(suggestion.value)
      setSuggestionApplied(true)
    }
  }

  // Check if current value matches a standard option
  const isStandardOption = filteredOptions.some((opt) => opt.value === value)
  const isCustom = value && !isStandardOption

  // Handle custom input
  const handleCustomSelect = () => {
    setShowCustom(true)
    setCustomValue(value || "")
  }

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue)
    onChange(newValue)
  }

  // Show general guidance when AI is enabled but no specific suggestion
  const showGeneralGuidance = aiEnabled && !suggestion && !value && granteeCount > 0

  return (
    <div className="space-y-4">
      {/* AI Suggestion (only show if no value selected and suggestion exists) */}
      {suggestion && !value && !suggestionApplied && (
        <AISuggestion
          message={suggestion.reason}
          action={`Use "${suggestion.label}"`}
          onApply={handleApplySuggestion}
        />
      )}

      {/* General AI Guidance when no specific suggestion */}
      {showGeneralGuidance && (
        <AISuggestion
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
                ${value === option.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <input
                type="radio"
                name="vesting"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => {
                  onChange(e.target.value)
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
        <AIHint message={currentExplanation} />
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
