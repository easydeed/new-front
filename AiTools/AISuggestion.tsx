"use client"

import { useState } from "react"
import { Sparkles, X, ChevronRight } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"

interface AISuggestionProps {
  message: string
  action?: string
  onApply?: () => void
  onDismiss?: () => void
  variant?: "default" | "success" | "info"
}

export function AISuggestion({ 
  message, 
  action, 
  onApply, 
  onDismiss,
  variant = "default" 
}: AISuggestionProps) {
  const { enabled } = useAIAssist()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if AI is disabled or dismissed
  if (!enabled || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const variants = {
    default: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      icon: "text-violet-500",
      text: "text-violet-900",
      action: "text-violet-600 hover:text-violet-700",
      dismiss: "text-violet-400 hover:text-violet-600",
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-500",
      text: "text-emerald-900",
      action: "text-emerald-600 hover:text-emerald-700",
      dismiss: "text-emerald-400 hover:text-emerald-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-500",
      text: "text-blue-900",
      action: "text-blue-600 hover:text-blue-700",
      dismiss: "text-blue-400 hover:text-blue-600",
    },
  }

  const v = variants[variant]

  return (
    <div className={`flex items-start gap-2 p-3 ${v.bg} border ${v.border} rounded-lg mb-3`}>
      <Sparkles className={`w-4 h-4 ${v.icon} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${v.text}`}>{message}</p>
        {action && onApply && (
          <button
            onClick={() => {
              onApply()
              setDismissed(true)
            }}
            className={`flex items-center gap-1 text-sm font-medium ${v.action} mt-1`}
          >
            {action}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <button onClick={handleDismiss} className={v.dismiss}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Auto-applied suggestion (just shows explanation, no action button)
export function AIApplied({ message }: { message: string }) {
  const { enabled } = useAIAssist()

  if (!enabled) return null

  return (
    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
      <Sparkles className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// Inline hint (very subtle, no dismiss)
export function AIHint({ message }: { message: string }) {
  const { enabled } = useAIAssist()

  if (!enabled) return null

  return (
    <p className="flex items-center gap-1.5 text-xs text-violet-600 mt-1">
      <Sparkles className="w-3 h-3" />
      {message}
    </p>
  )
}
