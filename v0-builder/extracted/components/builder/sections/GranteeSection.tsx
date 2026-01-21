"use client"

import { User, AlertTriangle } from "lucide-react"

interface GranteeSectionProps {
  value: string
  onChange: (grantee: string) => void
  grantorName?: string
}

export function GranteeSection({ value, onChange, grantorName }: GranteeSectionProps) {
  const isSameAsGrantor = value && grantorName && value.trim().toUpperCase() === grantorName.trim().toUpperCase()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Grantee Name (New Owner)</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="JANE DOE"
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg uppercase
              focus:ring-2 focus:ring-primary focus:border-primary
              ${isSameAsGrantor ? "border-amber-400 bg-amber-50" : "border-gray-300"}
            `}
            autoFocus
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{'For multiple grantees, use "and" (e.g., JANE DOE AND JOHN DOE)'}</p>
      </div>

      {isSameAsGrantor && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Grantee is the same as Grantor.</strong> This is unusual — is this intentional?
          </div>
        </div>
      )}
    </div>
  )
}
