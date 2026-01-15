"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check, HelpCircle, Sparkles, Loader2 } from "lucide-react"
import { aiAssistant, type AIGuidance as AIGuidanceType } from "@/services/aiAssistant"
import { AIGuidance } from "@/components/AIGuidance"

/**
 * Common vesting types in California real estate
 */
const COMMON_VESTING_OPTIONS = [
  {
    value: "joint_tenants",
    label: "Joint Tenants with Right of Survivorship",
    description: "Equal ownership, automatically transfers to survivor",
    shortLabel: "Joint Tenants",
  },
  {
    value: "community_property",
    label: "Community Property",
    description: "Married couples, equal ownership",
    shortLabel: "Community Property",
  },
  {
    value: "community_property_survivorship",
    label: "Community Property with Right of Survivorship",
    description: "Married couples, avoids probate",
    shortLabel: "Community Property w/ Survivorship",
  },
  {
    value: "tenants_in_common",
    label: "Tenants in Common",
    description: "Separate ownership shares, no survivorship",
    shortLabel: "Tenants in Common",
  },
  {
    value: "sole_and_separate",
    label: "Sole and Separate Property",
    description: "Single owner, not community property",
    shortLabel: "Sole and Separate",
  },
  {
    value: "trust",
    label: "As Trustee of [Trust Name]",
    description: "Property held in trust",
    shortLabel: "Trust",
    requiresInput: true,
    inputPlaceholder: "Enter trust name",
  },
  {
    value: "custom",
    label: "Custom vesting language",
    description: "Enter specific vesting language",
    shortLabel: "Custom",
    requiresInput: true,
    inputPlaceholder: "Enter custom vesting language",
  },
] as const

type VestingValue = (typeof COMMON_VESTING_OPTIONS)[number]["value"]

interface VestingInputProps {
  /** Current vesting value */
  value: string
  /** Called when vesting value changes */
  onChange: (value: string) => void
  /** Whether input is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Additional class name */
  className?: string
  /** Label text */
  label?: string
  /** Whether field is required */
  required?: boolean
  /** Enable AI guidance on vesting selection */
  showAIGuidance?: boolean
  /** Number of grantees (for AI validation) */
  granteeCount?: number
  /** Deed type context for AI */
  deedType?: string
  /** County context for AI */
  county?: string
}

/**
 * VestingInput Component
 * 
 * Provides dropdown selection for common California vesting types
 * with descriptions and optional custom input.
 * 
 * Phase 2.5 of DeedPro Enhancement Project
 */
export default function VestingInput({
  value,
  onChange,
  disabled = false,
  error,
  className = "",
  label = "Vesting",
  required = false,
  showAIGuidance = false,
  granteeCount = 1,
  deedType = "Grant Deed",
  county = "",
}: VestingInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<VestingValue | null>(null)
  const [customValue, setCustomValue] = useState("")
  const [trustName, setTrustName] = useState("")
  
  // AI Guidance state
  const [guidance, setGuidance] = useState<AIGuidanceType | null>(null)
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false)
  const guidanceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Determine selected type from value
  useEffect(() => {
    if (!value) {
      setSelectedType(null)
      return
    }

    // Try to match value to a known type
    const matchedOption = COMMON_VESTING_OPTIONS.find(
      (opt) => !opt.requiresInput && (opt.label === value || opt.value === value)
    )

    if (matchedOption) {
      setSelectedType(matchedOption.value)
    } else if (value.toLowerCase().includes("trustee") || value.toLowerCase().includes("trust")) {
      setSelectedType("trust")
      // Extract trust name if present
      const trustMatch = value.match(/As Trustee of (.+)/i)
      if (trustMatch) {
        setTrustName(trustMatch[1])
      }
    } else {
      setSelectedType("custom")
      setCustomValue(value)
    }
  }, [value])

  // ✅ AI INTEGRATION: Fetch guidance when vesting changes
  useEffect(() => {
    if (!showAIGuidance || !value) {
      setGuidance(null)
      return
    }

    // Clear previous timer
    if (guidanceTimerRef.current) {
      clearTimeout(guidanceTimerRef.current)
    }

    // Debounce AI guidance request
    guidanceTimerRef.current = setTimeout(async () => {
      setIsLoadingGuidance(true)
      try {
        const result = await aiAssistant.getVestingGuidance(
          value,
          granteeCount,
          { deedType, county }
        )
        setGuidance(result)
      } catch (err) {
        console.error("AI vesting guidance error:", err)
        setGuidance(null)
      } finally {
        setIsLoadingGuidance(false)
      }
    }, 800) // 800ms debounce

    return () => {
      if (guidanceTimerRef.current) {
        clearTimeout(guidanceTimerRef.current)
      }
    }
  }, [value, granteeCount, deedType, county, showAIGuidance])

  const handleSelect = (option: (typeof COMMON_VESTING_OPTIONS)[number]) => {
    setSelectedType(option.value)

    if (!option.requiresInput) {
      onChange(option.label)
      setIsOpen(false)
    } else {
      // Keep dropdown open for input
      setIsOpen(true)
    }
  }

  const handleTrustNameChange = (name: string) => {
    setTrustName(name)
    if (name.trim()) {
      onChange(`As Trustee of ${name.trim()}`)
    }
  }

  const handleCustomChange = (text: string) => {
    setCustomValue(text)
    onChange(text)
  }

  const selectedOption = selectedType
    ? COMMON_VESTING_OPTIONS.find((opt) => opt.value === selectedType)
    : null

  const displayValue = selectedOption?.requiresInput
    ? selectedOption.value === "trust"
      ? trustName
        ? `As Trustee of ${trustName}`
        : selectedOption.label
      : customValue || selectedOption.label
    : selectedOption?.label || value

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left rounded-lg border-2 transition-all duration-200
          flex items-center justify-between gap-2
          ${disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white hover:border-purple-400"}
          ${error ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-purple-500"}
          ${isOpen ? "ring-4 ring-purple-500/20 border-purple-500" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!displayValue ? "text-gray-400" : "text-gray-900"}`}>
          {displayValue || "Select vesting type..."}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
            role="listbox"
          >
            {COMMON_VESTING_OPTIONS.map((option) => (
              <div key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedType === option.value}
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-4 py-3 text-left transition-colors
                    ${selectedType === option.value ? "bg-purple-50" : "hover:bg-gray-50"}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                      flex items-center justify-center
                      ${selectedType === option.value ? "border-purple-600 bg-purple-600" : "border-gray-300"}
                    `}
                    >
                      {selectedType === option.value && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{option.shortLabel}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{option.description}</div>
                    </div>
                  </div>
                </button>

                {/* Inline Input for Trust or Custom */}
                {selectedType === option.value && option.requiresInput && (
                  <div className="px-4 pb-3">
                    <input
                      type="text"
                      value={option.value === "trust" ? trustName : customValue}
                      onChange={(e) =>
                        option.value === "trust"
                          ? handleTrustNameChange(e.target.value)
                          : handleCustomChange(e.target.value)
                      }
                      placeholder={option.inputPlaceholder}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    {option.value === "trust" && trustName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Will appear as: "As Trustee of {trustName}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Help Text */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Vesting determines how property ownership is held. Consult a legal professional
                  if unsure which option applies to your situation.
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ✅ AI INTEGRATION: Show AI guidance below dropdown */}
      {showAIGuidance && isLoadingGuidance && (
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          <span className="text-sm text-purple-700">Getting AI guidance...</span>
        </div>
      )}
      
      {showAIGuidance && guidance && !isLoadingGuidance && (
        <AIGuidance 
          guidance={guidance} 
          onDismiss={() => setGuidance(null)}
          compact
        />
      )}
    </div>
  )
}

