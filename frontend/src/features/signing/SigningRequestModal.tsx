"use client"

/**
 * NOTARY1 — the officer asks a notary about her availability.
 *
 * WHAT IS DELIBERATELY ABSENT is the point of this form. There is no
 * field for a signer's name, email or phone, and there is no place to
 * put one: the product coordinates officer↔notary and stops there. The
 * officer already has her clients' numbers and already calls them; what
 * she cannot do without help is stop playing phone tag with a notary.
 *
 * Times are sent WITH the browser's UTC offset. A "2:00" with no offset
 * is not a time, it is a hope — and the server would have to guess a
 * zone, which is how a calendar entry lands an hour out and somebody
 * arrives at an empty office.
 */

import { useState } from "react"
import { CalendarClock, Loader2, Plus, Trash2, X } from "lucide-react"
import { apiFetch } from "@/lib/apiClient"

const MAX_WINDOWS = 3

type Window = { start: string; end: string }

type Result = {
  link: string
  emailSent: boolean
  emailError?: string
  windowLabels: string[]
}

/** "2026-08-12T10:00" (local, from an <input type="datetime-local">) →
 *  "2026-08-12T10:00:00-07:00". The offset is the browser's, which is
 *  the officer's, which is the property's — near enough, and infinitely
 *  better than sending a bare wall-clock time and letting the server
 *  assume. */
function withOffset(local: string): string {
  const parsed = new Date(local)
  if (Number.isNaN(parsed.getTime())) return local
  const minutes = -parsed.getTimezoneOffset()
  const sign = minutes >= 0 ? "+" : "-"
  const abs = Math.abs(minutes)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${local}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function SigningRequestModal({
  deedId,
  onClose,
}: {
  deedId: number
  onClose: () => void
}) {
  const [notaryEmail, setNotaryEmail] = useState("")
  const [notaryName, setNotaryName] = useState("")
  const [location, setLocation] = useState("")
  const [windows, setWindows] = useState<Window[]>([{ start: "", end: "" }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const setWindow = (i: number, patch: Partial<Window>) =>
    setWindows((prev) => prev.map((w, n) => (n === i ? { ...w, ...patch } : w)))

  const complete = windows.filter((w) => w.start && w.end)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await apiFetch(
        "/signing-requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deed_id: deedId,
            notary_email: notaryEmail,
            notary_name: notaryName || undefined,
            location: location || undefined,
            proposed_windows: complete.map((w) => ({
              start: withOffset(w.start),
              end: withOffset(w.end),
            })),
          }),
        },
        { label: "Sending signing request" },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || `Failed to send the request (${response.status})`)
      }
      // The email status is reported as it actually is, and the link is
      // surfaced either way — a signing request must be usable when the
      // transport is not configured (S1's rule, same as sharing).
      setResult({
        link: data.link || "",
        emailSent: !!data.email_sent,
        emailError: typeof data.email_error === "string" ? data.email_error : undefined,
        windowLabels: (data.windows || []).map((w: { label: string }) => w.label),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[#7C4DFF]" />
            Request a signing
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="text-slate-700">
              The request is on the record. The notary chooses one of the times you
              proposed; you will be told which.
            </p>
            {result.windowLabels.length > 0 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {result.windowLabels.map((label) => (
                  <li key={label}>• {label}</li>
                ))}
              </ul>
            )}
            <div
              className={`rounded-lg border p-4 text-sm ${
                result.emailSent
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {result.emailSent
                ? `Email sent to ${notaryEmail}.`
                : `The email did not go out${result.emailError ? `: ${result.emailError}` : ""}. Send the link below yourself.`}
            </div>
            {result.link && (
              <div className="rounded-lg border border-slate-200 p-3 break-all text-xs text-slate-600">
                {result.link}
              </div>
            )}
            <p className="text-xs text-slate-500">
              DeedPro does not contact the signers — arranging their attendance stays
              with you.
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notary email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={notaryEmail}
                onChange={(e) => setNotaryEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                placeholder="notary@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notary name</label>
                <input
                  type="text"
                  value={notaryName}
                  onChange={(e) => setNotaryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Where</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                  placeholder="Defaults to the property address"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Proposed times <span className="text-red-500">*</span>
                </label>
                {windows.length < MAX_WINDOWS && (
                  <button
                    type="button"
                    onClick={() => setWindows((prev) => [...prev, { start: "", end: "" }])}
                    className="inline-flex items-center gap-1 text-sm text-[#7C4DFF] hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add a time
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {windows.map((w, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <span className="block text-xs text-slate-500 mb-1">Start</span>
                      <input
                        type="datetime-local"
                        value={w.start}
                        onChange={(e) => setWindow(i, { start: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs text-slate-500 mb-1">End</span>
                      <input
                        type="datetime-local"
                        value={w.end}
                        onChange={(e) => setWindow(i, { end: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                      />
                    </div>
                    {windows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setWindows((prev) => prev.filter((_, n) => n !== i))}
                        className="p-2 mb-0.5 text-slate-400 hover:text-red-600"
                        aria-label="Remove this time"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Three at most. More than three choices is a negotiation, and this is
                not one.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="text-xs text-slate-500">
              The notary is told the document, the property and these times. The
              signers are not contacted — that stays with you.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !notaryEmail || complete.length === 0}
                className="flex-1 px-4 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send the request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
