"use client"
import { useCallback, useState } from "react"
import { Check, Copy, Edit2, FileText, Home, AlertTriangle, Loader2 } from "lucide-react"

type Props = {
  docType?: string // e.g. 'grant-deed'
  state?: Record<string, any> // All wizard data
  onEdit?: (field: string) => void // Called when user clicks "Edit" for a field
  onConfirm?: () => void // Called when user clicks "Confirm & Generate"
  busy?: boolean // True when generating deed (shows spinner)
}

/**
 * Presentational SmartReview
 * - Shows summary of wizard state with edit buttons
 * - NO direct network calls
 * - NO redirects
 * - Emits 'smartreview:confirm' event that ModernEngine listens for
 */
export default function SmartReview({ docType, state, onEdit, onConfirm, busy }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())

  // Handles confirm with fallback to DOM event
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === "function") {
      onConfirm()
    } else {
      // Fallback: dispatch a DOM event the engine listens for
      window.dispatchEvent(new Event("smartreview:confirm"))
    }
  }, [onConfirm])

  // Field labels for better display
  const fieldLabels: Record<string, string> = {
    grantorName: "Grantor (Transferring Title)",
    granteeName: "Grantee (Receiving Title)",
    requestedBy: "Requested By",
    vesting: "Vesting",
    propertyAddress: "Property Address",
    fullAddress: "Property Address",
    apn: "APN",
    county: "County",
    legalDescription: "Legal Description",
  }

  // Important fields to show (ALL of them, even if empty)
  const importantFields = [
    "grantorName",
    "granteeName",
    "requestedBy",
    "vesting",
    "propertyAddress",
    "fullAddress",
    "apn",
    "county",
    "legalDescription",
  ]

  // Deed information fields
  const deedFields = ["grantorName", "granteeName", "requestedBy", "vesting"]

  // Property information fields
  const propertyFields = ["propertyAddress", "fullAddress", "apn", "county", "legalDescription"]

  // Check if we have ANY state data at all
  const hasAnyData = state && Object.keys(state).length > 0
  const hasImportantData = importantFields.some((k) => state?.[k] && String(state[k]).trim() !== "")

  // Copy to clipboard handler
  const handleCopy = useCallback((field: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }, [])

  // Toggle expanded state for long text
  const toggleExpanded = useCallback((field: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }, [])

  // Check if text is long (needs truncation)
  const isLongText = (text: string) => text && text.length > 150

  // Render field row
  const renderField = (fieldKey: string) => {
    const label = fieldLabels[fieldKey] || fieldKey
    const value = state?.[fieldKey]
    const hasValue = value && String(value).trim() !== ""
    const displayValue = hasValue ? String(value) : "Not provided"
    const isExpanded = expandedFields.has(fieldKey)
    const needsTruncation = hasValue && isLongText(displayValue)
    const truncatedValue = needsTruncation && !isExpanded ? displayValue.substring(0, 150) + "..." : displayValue

    return (
      <div key={fieldKey} className="border-b border-gray-100 pb-4 mb-4 last:border-none last:pb-0 last:mb-0">
        <div className="flex items-start justify-between mb-2 gap-4">
          <div className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            {hasValue && <Check className="w-4 h-4 text-green-500" />}
            {label}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit?.(fieldKey)}
              disabled={busy}
              className="text-[#4F76F6] hover:text-[#3d5fd4] text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Edit ${label}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            {hasValue && (
              <button
                onClick={() => handleCopy(fieldKey, displayValue)}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors relative"
                aria-label={`Copy ${label}`}
              >
                {copiedField === fieldKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500 text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className={`text-base ${hasValue ? "text-gray-900" : "text-gray-400 italic"}`}>{truncatedValue}</div>
        {needsTruncation && (
          <button
            onClick={() => toggleExpanded(fieldKey)}
            className="text-[#4F76F6] hover:text-[#3d5fd4] text-sm font-medium mt-2 transition-colors"
          >
            {isExpanded ? "Show Less" : "Show More"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <h1 className="text-3xl md:text-4xl font-bold text-[#1F2B37] mb-2">Review Your Deed</h1>
      <p className="text-lg text-gray-600 mb-8">Please review the information below before generating the deed.</p>

      {/* Error State: No Data */}
      {!hasAnyData && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-900">Warning</div>
            <div className="text-sm text-red-700">No data to review. State is empty or undefined.</div>
          </div>
        </div>
      )}

      {/* Content: Show if we have any data */}
      {hasAnyData && (
        <>
          {/* Deed Information Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#1F2B37] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7C4DFF]" />
              Deed Information
            </h2>
            <div>{deedFields.map((field) => renderField(field))}</div>
          </div>

          {/* Property Information Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#1F2B37] mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-[#7C4DFF]" />
              Property Information
            </h2>
            <div>{propertyFields.map((field) => renderField(field))}</div>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-900">Important</div>
              <div className="text-sm text-yellow-700">
                Please verify all information is correct before generating the deed. Changes cannot be made after
                generation.
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex justify-center">
            <button
              onClick={handleConfirm}
              disabled={busy || !hasImportantData}
              className="w-full md:w-auto px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] 
                       active:scale-[0.98] text-white font-bold text-lg rounded-lg 
                       shadow-lg shadow-[#7C4DFF]/25 transition-all duration-200 
                       disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                       focus:ring-4 focus:ring-[#7C4DFF]/50 focus:outline-none
                       flex items-center justify-center gap-2"
              aria-label="Confirm and generate deed"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirm & Generate Deed
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
