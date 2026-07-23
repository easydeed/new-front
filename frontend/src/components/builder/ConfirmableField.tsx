'use client'

// ─────────────────────────────────────────────────────────────────
// ConfirmableField — renders a Sourced<string> value the officer must
// confirm or edit before it is treated as authorized. Shared by
// PropertySection (apn / legal description / owner) and GrantorSection.
// ─────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { AlertCircle, Check, Pencil, ShieldCheck } from 'lucide-react'
import type { Sourced } from '@/types/builder'

export interface ConfirmableFieldProps {
  label: string
  field: Sourced<string>
  multiline?: boolean
  onConfirm: () => void
  onEdit: (newValue: string) => void
}

export function ConfirmableField({ label, field, multiline, onConfirm, onEdit }: ConfirmableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(field.value)

  const isConfirmed = field.status === 'confirmed'
  const isUserSourced = field.source === 'user'

  const startEdit = () => {
    setDraft(field.value)
    setIsEditing(true)
  }

  const saveEdit = () => {
    onEdit(draft)
    setIsEditing(false)
  }

  return (
    <div
      className={`p-3 rounded-lg border ${
        isConfirmed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isUserSourced ? 'Edited & confirmed' : 'Confirmed'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" />
            From county records — confirm
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="inline-flex items-center gap-1 bg-brand-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-brand-600"
            >
              <Check className="w-4 h-4" />
              Save &amp; confirm
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p
            className={`text-sm text-gray-900 break-words ${
              multiline ? 'max-h-32 overflow-y-auto' : ''
            }`}
          >
            {field.value || <span className="text-gray-400 italic">No value</span>}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {!isConfirmed && (
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700"
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            )}
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
          {isConfirmed && field.confirmedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Confirmed {new Date(field.confirmedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  )
}
