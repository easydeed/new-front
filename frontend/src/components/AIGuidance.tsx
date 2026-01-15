"use client"

import { useState } from "react"
import {
  Lightbulb,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react"
import type { AIGuidance as AIGuidanceType } from "@/services/aiAssistant"

interface AIGuidanceProps {
  guidance: AIGuidanceType
  onDismiss?: () => void
  expandable?: boolean
  compact?: boolean
}

/**
 * AIGuidance Component
 * 
 * Displays AI-generated guidance with appropriate styling based on type.
 * Supports info, warning, suggestion, and error states.
 * 
 * Part 2.2 of DeedPro Wizard Integration
 */
export function AIGuidance({
  guidance,
  onDismiss,
  expandable = true,
  compact = false,
}: AIGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(!expandable)

  const styles = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Info className="w-5 h-5 text-blue-600" />,
      titleColor: "text-blue-800",
      textColor: "text-blue-700",
      sparkleColor: "text-blue-400",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      titleColor: "text-amber-800",
      textColor: "text-amber-700",
      sparkleColor: "text-amber-400",
    },
    suggestion: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: <Lightbulb className="w-5 h-5 text-purple-600" />,
      titleColor: "text-purple-800",
      textColor: "text-purple-700",
      sparkleColor: "text-purple-400",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      titleColor: "text-red-800",
      textColor: "text-red-700",
      sparkleColor: "text-red-400",
    },
  }

  const style = styles[guidance.type]

  if (compact) {
    return (
      <div
        className={`${style.bg} ${style.border} border rounded-lg px-3 py-2 mt-2 flex items-start gap-2`}
      >
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
        <p className={`text-sm ${style.textColor} flex-1`}>{guidance.message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-0.5 hover:bg-white/50 rounded flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${style.titleColor}`}>{guidance.title}</h4>
              <Sparkles className={`w-3 h-3 ${style.sparkleColor}`} />
            </div>

            <div className="flex items-center gap-2">
              {expandable && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {(isExpanded || !expandable) && (
            <p className={`mt-1 text-sm ${style.textColor} leading-relaxed`}>
              {guidance.message}
            </p>
          )}

          {guidance.action && isExpanded && (
            <button
              onClick={guidance.action.handler}
              className={`mt-2 text-sm font-medium underline hover:no-underline ${style.titleColor}`}
            >
              {guidance.action.label}
            </button>
          )}

          {guidance.learnMoreUrl && isExpanded && (
            <a
              href={guidance.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 text-sm font-medium underline hover:no-underline ${style.titleColor} block`}
            >
              Learn more →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Loading state for AI guidance
 */
export function AIGuidanceLoading() {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-purple-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-purple-200 rounded w-1/3" />
          <div className="h-3 bg-purple-100 rounded w-full" />
          <div className="h-3 bg-purple-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

export default AIGuidance

