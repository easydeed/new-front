"use client"

import { useState, useEffect } from "react"
import { Sparkles, X, ChevronRight, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"

interface AISuggestionProps {
  message: string
  details?: string // Expandable "learn more" content
  action?: string
  onApply?: () => void
  onDismiss?: () => void
  variant?: "default" | "success" | "info" // All now use green, kept for compatibility
}

export function AISuggestion({ 
  message, 
  details,
  action, 
  onApply, 
  onDismiss,
  variant = "default" 
}: AISuggestionProps) {
  const { enabled } = useAIAssist()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Don't show if AI is disabled or dismissed
  if (!enabled || dismissed) return null

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => {
      setDismissed(true)
      onDismiss?.()
    }, 200)
  }

  // Consistent green styling for all AI guidance
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
      className={`
        ${styles.bg} border ${styles.border} rounded-lg mb-3 overflow-hidden
        transform transition-all duration-300 ease-out
        ${visible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-2'
        }
      `}
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
              className={`p-1 rounded-full hover:bg-emerald-100 transition-colors ${styles.dismiss}`}
              title="Learn more"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
          
          {/* Dismiss button */}
          <button 
            onClick={handleDismiss} 
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
export function AIApplied({ message }: { message: string }) {
  const { enabled } = useAIAssist()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  if (!enabled) return null

  return (
    <div 
      className={`
        flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3
        transform transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse" />
      <span>{message}</span>
    </div>
  )
}

// Inline hint (very subtle, no dismiss)
export function AIHint({ message }: { message: string }) {
  const { enabled } = useAIAssist()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!enabled) return null

  return (
    <p 
      className={`
        flex items-center gap-1.5 text-xs text-emerald-600 mt-1
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <Sparkles className="w-3 h-3" />
      {message}
    </p>
  )
}
