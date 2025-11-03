"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react"
import StepShell from "@/components/StepShell"
import ProgressBar from "@/components/ProgressBar"
import MicroSummary from "@/components/MicroSummary"
import SmartReview from "@/components/SmartReview"
import PrefillCombo from "@/components/PrefillCombo"
import { promptFlows } from "./config/promptFlows"
import type { Step } from "./config/promptFlows"

type Props = {
  docType: string // e.g. 'grant-deed', 'quitclaim-deed'
  onComplete?: (state: Record<string, any>) => void // Called when wizard completes
}

/**
 * ModernEngine - Main wizard orchestrator
 * Manages step-by-step Q&A flow with validation and state management
 */
export default function ModernEngine({ docType, onComplete }: Props) {
  // Get flow configuration for this deed type
  const flow = useMemo(() => promptFlows[docType] || promptFlows["grant-deed"], [docType])

  // State management
  const [i, setI] = useState(0) // Current step index (0-based)
  const [state, setState] = useState<Record<string, any>>({}) // All answers
  const [errors, setErrors] = useState<Record<string, string>>({}) // Validation errors
  const [touched, setTouched] = useState<Record<string, boolean>>({}) // Fields user has interacted with

  const total = flow.steps.length // Total steps
  const current = flow.steps[i] // Current step config
  const isReviewStep = i === total // At final review step

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`deedpro-wizard-${docType}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(parsed.state || {})
        setI(parsed.step || 0)
      } catch (error) {
        console.error("Failed to load saved wizard state:", error)
      }
    }
  }, [docType])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(state).length > 0) {
      localStorage.setItem(`deedpro-wizard-${docType}`, JSON.stringify({ state, step: i }))
    }
  }, [state, i, docType])

  // Validation logic
  const validateField = useCallback((step: Step, value: any): string | null => {
    if (!step.required) return null

    if (!value || String(value).trim() === "") {
      return "This field is required"
    }

    // Email validation
    if (step.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        return "Please enter a valid email address"
      }
    }

    // Checkbox validation (at least one selected)
    if (step.type === "checkbox") {
      if (!Array.isArray(value) || value.length === 0) {
        return "Please select at least one option"
      }
    }

    return null
  }, [])

  // Check if current step is valid
  const isValid = useCallback(() => {
    if (!current) return false
    const value = state[current.key]
    const error = validateField(current, value)
    return error === null
  }, [current, state, validateField])

  // Handle field change
  const handleChange = useCallback(
    (key: string, value: any) => {
      setState((prev) => ({ ...prev, [key]: value }))
      setTouched((prev) => ({ ...prev, [key]: true }))

      // Clear error when user starts typing
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    },
    [errors],
  )

  // Handle field blur (validate on blur)
  const handleBlur = useCallback(
    (key: string) => {
      setTouched((prev) => ({ ...prev, [key]: true }))

      const step = flow.steps.find((s) => s.key === key)
      if (step) {
        const error = validateField(step, state[key])
        if (error) {
          setErrors((prev) => ({ ...prev, [key]: error }))
        }
      }
    },
    [flow.steps, state, validateField],
  )

  // Navigation: Next
  const onNext = useCallback(() => {
    if (!current) return

    // Validate current field
    const error = validateField(current, state[current.key])
    if (error) {
      setErrors((prev) => ({ ...prev, [current.key]: error }))
      setTouched((prev) => ({ ...prev, [current.key]: true }))
      return
    }

    // Move to next step
    if (i < total) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [i, total, current, state, validateField])

  // Navigation: Back
  const onBack = useCallback(() => {
    if (i > 0) {
      setI(i - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [i])

  // Handle SmartReview edit
  const handleEdit = useCallback(
    (fieldKey: string) => {
      const stepIndex = flow.steps.findIndex((s) => s.key === fieldKey)
      if (stepIndex >= 0) {
        setI(stepIndex)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    [flow.steps],
  )

  // Handle SmartReview confirm
  const handleConfirm = useCallback(() => {
    // Clear saved state
    localStorage.removeItem(`deedpro-wizard-${docType}`)

    // Call completion handler
    if (onComplete) {
      onComplete(state)
    }

    // Dispatch event for external listeners
    window.dispatchEvent(new CustomEvent("wizard:complete", { detail: { docType, state } }))
  }, [docType, state, onComplete])

  // Listen for SmartReview confirm event
  useEffect(() => {
    const handleSmartReviewConfirm = () => {
      handleConfirm()
    }

    window.addEventListener("smartreview:confirm", handleSmartReviewConfirm)
    return () => window.removeEventListener("smartreview:confirm", handleSmartReviewConfirm)
  }, [handleConfirm])

  // Render final review step
  if (isReviewStep) {
    return (
      <StepShell>
        <SmartReview docType={docType} state={state} onEdit={handleEdit} onConfirm={handleConfirm} busy={false} />
      </StepShell>
    )
  }

  // Render current Q&A step
  return (
    <StepShell>
      {/* Progress Bar */}
      <ProgressBar current={i + 1} total={total} />

      {/* Question Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Question Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{current.title || current.question}</h1>

        {/* Why Text (Explanation) */}
        {current.why && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-base text-blue-900">{current.why}</p>
          </div>
        )}

        {/* Input Field */}
        <div className="mb-6">{renderInput(current, state, handleChange, handleBlur, errors, touched)}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          {i > 0 && (
            <button
              onClick={onBack}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 
                       hover:border-gray-400 hover:bg-gray-50 
                       font-semibold rounded-lg transition-all duration-200
                       focus:ring-4 focus:ring-gray-300/50
                       flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}

          <button
            onClick={onNext}
            disabled={!isValid()}
            className="ml-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 
                     active:scale-[0.98] text-white font-semibold rounded-lg 
                     shadow-lg shadow-purple-500/25 transition-all duration-200 
                     disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                     focus:ring-4 focus:ring-purple-500/50
                     flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Progress Summary */}
      <MicroSummary text={`Step ${i + 1} of ${total}`} />
    </StepShell>
  )
}

/**
 * Render input based on step type
 */
function renderInput(
  step: Step,
  state: Record<string, any>,
  onChange: (key: string, value: any) => void,
  onBlur: (key: string) => void,
  errors: Record<string, string>,
  touched: Record<string, boolean>,
) {
  const value = state[step.key] || ""
  const error = touched[step.key] ? errors[step.key] : null
  const hasError = !!error

  // Text Input
  if (step.type === "text" && !step.prefill) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(step.key, e.target.value)}
          onBlur={() => onBlur(step.key)}
          placeholder={step.placeholder}
          className={`w-full px-4 py-3 text-base rounded-lg border-2 
                   ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500/20"}
                   focus:ring-4 transition-all duration-200 
                   placeholder:text-gray-400`}
          aria-label={step.question}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${step.key}-error` : undefined}
        />
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Text Input with Prefill (Google Autocomplete)
  if (step.type === "text" && step.prefill) {
    return (
      <div>
        <PrefillCombo
          value={value}
          onChange={(newValue) => onChange(step.key, newValue)}
          placeholder={step.placeholder}
        />
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Email Input
  if (step.type === "email") {
    return (
      <div>
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(step.key, e.target.value)}
          onBlur={() => onBlur(step.key)}
          placeholder={step.placeholder}
          className={`w-full px-4 py-3 text-base rounded-lg border-2 
                   ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500/20"}
                   focus:ring-4 transition-all duration-200 
                   placeholder:text-gray-400`}
          aria-label={step.question}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${step.key}-error` : undefined}
        />
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Dropdown
  if (step.type === "dropdown") {
    return (
      <div>
        <select
          value={value}
          onChange={(e) => onChange(step.key, e.target.value)}
          onBlur={() => onBlur(step.key)}
          className={`w-full px-4 py-3 text-base rounded-lg border-2 
                   ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500/20"}
                   focus:ring-4 transition-all duration-200 
                   bg-white cursor-pointer`}
          aria-label={step.question}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${step.key}-error` : undefined}
        >
          <option value="">Select an option...</option>
          {step.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Textarea
  if (step.type === "textarea") {
    return (
      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(step.key, e.target.value)}
          onBlur={() => onBlur(step.key)}
          placeholder={step.placeholder}
          rows={6}
          className={`w-full px-4 py-3 text-base rounded-lg border-2 
                   ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500/20"}
                   focus:ring-4 transition-all duration-200 
                   placeholder:text-gray-400 resize-none`}
          aria-label={step.question}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${step.key}-error` : undefined}
        />
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Radio Buttons
  if (step.type === "radio") {
    return (
      <div className="space-y-3">
        {step.options?.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 
                     hover:border-purple-300 hover:bg-purple-50 
                     cursor-pointer transition-all duration-200"
          >
            <input
              type="radio"
              name={step.key}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(step.key, e.target.value)}
              className="w-5 h-5 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-base text-gray-900">{option}</span>
          </label>
        ))}
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Checkboxes
  if (step.type === "checkbox") {
    const selectedValues = Array.isArray(value) ? value : []

    return (
      <div className="space-y-3">
        {step.options?.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 
                     hover:border-purple-300 hover:bg-purple-50 
                     cursor-pointer transition-all duration-200"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={(e) => {
                const newValues = e.target.checked
                  ? [...selectedValues, option]
                  : selectedValues.filter((v: string) => v !== option)
                onChange(step.key, newValues)
              }}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-base text-gray-900">{option}</span>
          </label>
        ))}
        {hasError && (
          <div
            id={`${step.key}-error`}
            className="mt-2 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return null
}
