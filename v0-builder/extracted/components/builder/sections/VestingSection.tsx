"use client"

import { useState, useEffect } from "react"
import { HelpCircle, Sparkles } from "lucide-react"

interface VestingSectionProps {
  value: string
  onChange: (vesting: string) => void
  granteeCount: number
  deedType: string
}

const VESTING_OPTIONS = [
  { value: "a single man", label: "A Single Man", min: 1, max: 1 },
  { value: "a single woman", label: "A Single Woman", min: 1, max: 1 },
  { value: "an unmarried man", label: "An Unmarried Man", min: 1, max: 1 },
  { value: "an unmarried woman", label: "An Unmarried Woman", min: 1, max: 1 },
  { value: "a married man as his sole and separate property", label: "Married Man - Sole & Separate", min: 1, max: 1 },
  {
    value: "a married woman as her sole and separate property",
    label: "Married Woman - Sole & Separate",
    min: 1,
    max: 1,
  },
  { value: "husband and wife as joint tenants", label: "Husband & Wife - Joint Tenants", min: 2, max: 2 },
  { value: "husband and wife as community property", label: "Husband & Wife - Community Property", min: 2, max: 2 },
  {
    value: "husband and wife as community property with right of survivorship",
    label: "Community Property w/ Survivorship",
    min: 2,
    max: 2,
  },
  { value: "as joint tenants", label: "Joint Tenants", min: 2, max: 99 },
  { value: "as tenants in common", label: "Tenants in Common", min: 2, max: 99 },
]

export function VestingSection({ value, onChange, granteeCount }: VestingSectionProps) {
  const [aiGuidance, setAiGuidance] = useState<string | null>(null)

  const filteredOptions = VESTING_OPTIONS.filter((opt) => granteeCount >= opt.min && granteeCount <= opt.max)

  useEffect(() => {
    if (!value) {
      setAiGuidance(null)
      return
    }

    if (value.includes("joint tenants")) {
      setAiGuidance(
        "Joint Tenancy includes right of survivorship — if one owner dies, their share automatically passes to the surviving owner(s).",
      )
    } else if (value.includes("community property")) {
      setAiGuidance(
        "Community Property is for married couples. Each spouse owns 50%. With survivorship, it passes directly to the surviving spouse.",
      )
    } else if (value.includes("tenants in common")) {
      setAiGuidance("Tenants in Common can have unequal shares. Each owner can sell or will their share independently.")
    } else {
      setAiGuidance(null)
    }
  }, [value])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">How will title be held?</label>

        <div className="space-y-2">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className={`
                flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                ${value === option.value ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
              `}
            >
              <input
                type="radio"
                name="vesting"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {aiGuidance && (
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-800">{aiGuidance}</p>
        </div>
      )}

      {granteeCount === 1 && value?.includes("joint tenants") && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Joint tenancy requires 2 or more grantees.</p>
        </div>
      )}
    </div>
  )
}
