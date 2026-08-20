/**
 * FIELD GUIDANCE — static explanatory copy, and NOT a model.
 *
 * ═══ WHY THIS IS NO LONGER CALLED `AISuggestion` (GUIDE1) ═══
 *
 * Nothing here infers anything. Every `message` and `details` string this
 * renders is hand-written, in the section file that renders it. There is
 * no request, no model, and nothing that can drift.
 *
 * It was named `AISuggestion`, sat behind a toggle labelled "AI Assist",
 * and lived among components called `AI*`. **That is a claim the code
 * does not support** — the banned-claims family arriving in a UI label
 * rather than in marketing prose, which is the harder place to see it
 * because nobody reviews a component name for truth.
 *
 * Owner-ruled 2026-08-20: call it what it is. If a model ever backs this
 * surface, the label can come back honestly.
 *
 * ═══ WHAT IT IS INSTEAD, AND WHY THAT IS THE GOOD NEWS ═══
 *
 * GUIDE0 found that the copy here is ALREADY doctrine-compliant: it
 * hedges ("may be exempt", "typically calculated on"), cites statutes
 * rather than outcomes, and never asserts what a recorder will accept.
 * The EXPLAIN half of Doctrine B — explain yes, select no — was built and
 * shipped here months ago, unmodelled and undrifting, while the endpoint
 * that was supposed to provide it sat unreachable.
 *
 * Keep it that way. Copy is cheaper, faster, pinnable, reviewable by
 * someone who knows recording practice, and cannot invent a citation.
 */
"use client"

import { useState } from "react"
import { Sparkles, X, ChevronRight, HelpCircle } from "lucide-react"
import { useGuidance } from "@/contexts/GuidanceContext"

interface FieldGuidanceProps {
  message: string
  details?: string // Expandable "learn more" content
  action?: string
  onApply?: () => void
  onDismiss?: () => void
  variant?: "default" | "success" | "info" // All now use green, kept for compatibility
}

export function FieldGuidance({ 
  message, 
  details,
  action, 
  onApply, 
  onDismiss,
  variant = "default" 
}: FieldGuidanceProps) {
  const { enabled } = useGuidance()
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Don't show if guidance is switched off, or already dismissed
  if (!enabled || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Consistent green styling for all field guidance
  const styles = {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-500",
    text: "text-emerald-800",
    action: "text-emerald-600 hover:text-emerald-700",
    dismiss: "text-emerald-400 hover:text-emerald-600",
    details: "text-emerald-700",
    detailsBg: "bg-emerald-100/50",
  }

  return (
    <div 
      className={`${styles.bg} border ${styles.border} rounded-lg mb-3 overflow-hidden`}
    >
      <div className="flex items-start gap-2 p-3">
        <Sparkles className={`w-4 h-4 ${styles.icon} mt-0.5 flex-shrink-0 animate-pulse`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${styles.text}`}>{message}</p>
          
          {action && onApply && (
            <button
              onClick={() => {
                onApply()
                handleDismiss()
              }}
              className={`flex items-center gap-1 text-sm font-medium ${styles.action} mt-1`}
            >
              {action}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Question mark for more details */}
          {details && (
            <button 
              onClick={() => setShowDetails(!showDetails)}
              aria-label="Show details for this suggestion"
              className={`p-1 rounded-full hover:bg-emerald-100 transition-colors ${styles.dismiss}`}
              title="Learn more"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
          
          {/* Dismiss button */}
          <button 
            onClick={handleDismiss} 
            aria-label="Dismiss this suggestion"
            className={`p-1 rounded-full hover:bg-emerald-100 transition-colors ${styles.dismiss}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable details section */}
      {details && (
        <div 
          className={`
            ${styles.detailsBg} border-t ${styles.border} overflow-hidden
            transition-all duration-300 ease-out
            ${showDetails ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="p-3 text-sm ${styles.details}">
            <p className="text-emerald-700">{details}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Auto-applied suggestion (just shows explanation, no action button)
export function FieldNote({ message }: { message: string }) {
  const { enabled } = useGuidance()

  if (!enabled) return null

  return (
    <p className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1">
      <Sparkles className="w-3 h-3" />
      {message}
    </p>
  )
}
