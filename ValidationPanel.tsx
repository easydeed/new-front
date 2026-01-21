"use client"

import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"
import { validateDeedData, type ValidationIssue } from "@/lib/ai-helpers"
import type { DeedBuilderState } from "@/types/builder"

interface ValidationPanelProps {
  state: DeedBuilderState
  onJumpToSection?: (section: string) => void
}

export function ValidationPanel({ state, onJumpToSection }: ValidationPanelProps) {
  const { enabled: aiEnabled } = useAIAssist()

  // Don't show validation if AI is disabled
  if (!aiEnabled) return null

  const issues = validateDeedData(state)

  const errors = issues.filter((i) => i.level === "error")
  const warnings = issues.filter((i) => i.level === "warning")
  const infos = issues.filter((i) => i.level === "info")

  // All good!
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
        <CheckCircle className="w-4 h-4" />
        <span>All sections look good</span>
      </div>
    )
  }

  return (
    <div className="space-y-2 mb-3">
      {/* Errors - Red */}
      {errors.map((issue, i) => (
        <ValidationItem
          key={`error-${i}`}
          issue={issue}
          icon={<AlertCircle className="w-4 h-4 text-red-500" />}
          bgColor="bg-red-50"
          borderColor="border-red-200"
          textColor="text-red-800"
          subtextColor="text-red-600"
          onJump={onJumpToSection}
        />
      ))}

      {/* Warnings - Amber */}
      {warnings.map((issue, i) => (
        <ValidationItem
          key={`warning-${i}`}
          issue={issue}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          bgColor="bg-amber-50"
          borderColor="border-amber-200"
          textColor="text-amber-800"
          subtextColor="text-amber-600"
          onJump={onJumpToSection}
        />
      ))}

      {/* Info - Blue */}
      {infos.map((issue, i) => (
        <ValidationItem
          key={`info-${i}`}
          issue={issue}
          icon={<Info className="w-4 h-4 text-blue-500" />}
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          subtextColor="text-blue-600"
          onJump={onJumpToSection}
        />
      ))}
    </div>
  )
}

interface ValidationItemProps {
  issue: ValidationIssue
  icon: React.ReactNode
  bgColor: string
  borderColor: string
  textColor: string
  subtextColor: string
  onJump?: (section: string) => void
}

function ValidationItem({
  issue,
  icon,
  bgColor,
  borderColor,
  textColor,
  subtextColor,
  onJump,
}: ValidationItemProps) {
  return (
    <button
      onClick={() => onJump?.(issue.section)}
      className={`
        w-full flex items-start gap-2 p-2 ${bgColor} border ${borderColor} rounded-lg text-sm text-left
        hover:opacity-90 transition-opacity
      `}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${textColor}`}>{issue.message}</p>
        {issue.suggestion && <p className={subtextColor}>{issue.suggestion}</p>}
      </div>
    </button>
  )
}

// Compact version - just shows count
export function ValidationSummary({ state }: { state: DeedBuilderState }) {
  const { enabled: aiEnabled } = useAIAssist()

  if (!aiEnabled) return null

  const issues = validateDeedData(state)
  const errors = issues.filter((i) => i.level === "error").length
  const warnings = issues.filter((i) => i.level === "warning").length

  if (errors === 0 && warnings === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle className="w-3 h-3" />
        Ready
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      {errors > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <AlertCircle className="w-3 h-3" />
          {errors}
        </span>
      )}
      {warnings > 0 && (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          {warnings}
        </span>
      )}
    </span>
  )
}
