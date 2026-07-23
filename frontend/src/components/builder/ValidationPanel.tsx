"use client"

// Ticket V: two-stage pre-generate checklist. Substantive readiness and
// recorder preflight are DIFFERENT QUESTIONS rendered as distinct, labeled
// sections — never conflate recorder acceptance with legal sufficiency.
// Copy here must not imply legal validity.
import { AlertTriangle, ArrowRight, CheckCircle, ShieldAlert } from "lucide-react"
import type { CheckResult } from "@/lib/deedValidation"

interface ValidationPanelProps {
  substantive: CheckResult[]
  preflight: CheckResult[]
  overrides: Record<string, string>
  onOverride: (id: string) => void
  onNavigate: (sectionId: string) => void
}

function CheckRow({
  check,
  overriddenAt,
  onOverride,
  onNavigate,
  overridable,
}: {
  check: CheckResult
  overriddenAt?: string
  onOverride?: (id: string) => void
  onNavigate: (sectionId: string) => void
  overridable: boolean
}) {
  const resolved = check.ok || !!overriddenAt
  return (
    <div
      className={`flex items-start justify-between gap-3 px-3 py-2 rounded-md ${
        check.ok ? "bg-emerald-50" : overriddenAt ? "bg-gray-50" : overridable ? "bg-yellow-50" : "bg-red-50"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {resolved ? (
            <CheckCircle className={`w-4 h-4 ${check.ok ? "text-emerald-600" : "text-gray-400"}`} />
          ) : overridable ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-600" />
          )}
          <span className="text-sm font-medium text-gray-900">{check.label}</span>
          {overriddenAt && (
            <span className="text-xs text-gray-500">
              overridden {new Date(overriddenAt).toLocaleString()}
            </span>
          )}
        </div>
        {!resolved && check.detail && (
          <p className="text-xs text-gray-600 mt-0.5">{check.detail}</p>
        )}
      </div>
      {!resolved && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {check.sectionId && (
            <button
              type="button"
              onClick={() => onNavigate(check.sectionId!)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              Fix <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {overridable && onOverride && (
            <button
              type="button"
              onClick={() => onOverride(check.id)}
              className="text-xs font-medium text-yellow-800 border border-yellow-400 rounded px-2 py-1 hover:bg-yellow-100"
              title="Proceed despite this formatting warning; your override is recorded with the deed."
            >
              Override
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ValidationPanel({
  substantive,
  preflight,
  overrides,
  onOverride,
  onNavigate,
}: ValidationPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Substantive readiness
        </h3>
        <div className="space-y-1.5">
          {substantive.map((c) => (
            <CheckRow key={c.id} check={c} onNavigate={onNavigate} overridable={false} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Recorder preflight (formatting)
        </h3>
        <div className="space-y-1.5">
          {preflight.map((c) => (
            <CheckRow
              key={c.id}
              check={c}
              overriddenAt={overrides[c.id]}
              onOverride={onOverride}
              onNavigate={onNavigate}
              overridable
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 leading-snug">
        These checks verify document completeness and common recorder formatting
        conventions. They are not legal advice, and passing them does not
        determine the legal validity or effect of the transfer.
      </p>
    </div>
  )
}
