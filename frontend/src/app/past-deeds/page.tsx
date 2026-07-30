"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { FileText, Download, Share2, Trash2, AlertCircle, CheckCircle, Clock, X, Plus, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { SessionExpiredError, apiFetch } from "@/lib/apiClient"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { deedTypeLabel } from "@/lib/deedTypes"

interface Deed {
  id: number
  property_address: string
  deed_type: string
  grantee_name?: string
  apn?: string
  status: "completed" | "draft" | "in_progress"
  created_at: string
  updated_at: string
  pdf_url?: string
}

interface ShareFormData {
  recipient_name: string
  recipient_email: string
  recipient_role: string
  message: string
  expires_in_hours: number
}

// ✅ PHASE 24-E: V0-generated Past Deeds page with all business logic preserved
export default function PastDeedsPageV0() {
  const router = useRouter()
  const [deeds, setDeeds] = useState<Deed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedDeedId, setSelectedDeedId] = useState<number | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareForm, setShareForm] = useState<ShareFormData>({
    recipient_name: "",
    recipient_email: "",
    recipient_role: "Title Officer",
    message: "",
    expires_in_hours: 168, // 7 days default
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; deedId: number | null }>({
    isOpen: false,
    deedId: null,
  })
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  // S1: the share result panel — email status reported truthfully, and the
  // review link surfaced for manual sending (shares must be usable even
  // with no email transport configured).
  const [shareResult, setShareResult] = useState<{ approvalUrl: string; emailSent: boolean } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  // X2.7: find a deed without scrolling — text search + status filter.
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "draft">("all")

  useEffect(() => {
    fetchDeeds()
  }, [])

  const fetchDeeds = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/login?redirect=/past-deeds")
        return
      }

      // X1: apiFetch surfaces every failure (401 = session-expired redirect).
      const response = await apiFetch(`/deeds`, {}, { label: "Loading deeds" })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `Failed to fetch deeds (${response.status})`)
      }

      const data = await response.json()
      setDeeds(Array.isArray(data) ? data : data.deeds || [])
    } catch (err) {
      if (err instanceof SessionExpiredError) return
      console.error("Error fetching deeds:", err)
      setError(err instanceof Error ? err.message : "Failed to load deeds")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = (deed: Deed) => {
    // Ticket R: drafts resume into a hydrated builder, not a blank one.
    router.push(`/deed-builder/${deed.deed_type.toLowerCase().replace(" ", "-")}?resume=${deed.id}`)
  }

  const handleDownload = async (deed: Deed) => {
    // The stored PDF is served by the authenticated download endpoint; fetch
    // it as a blob since window.open can't carry the Authorization header.
    // U3: the click acknowledges itself — spinner on the row's button while
    // fetching, toast on the outcome either way.
    setDownloadingId(deed.id)
    try {
      const response = await apiFetch(`/deeds/${deed.id}/download`, {}, { label: `Downloading deed #${deed.id}` })
      if (!response.ok) {
        // The endpoint's 500 carries the real reason (exception class +
        // message) — surface it, don't shrug.
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Download failed (${response.status})`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${deedTypeLabel(deed.deed_type).replace(/ /g, "_")}_${deed.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Deed #${deed.id} PDF downloaded`)
    } catch (err) {
      console.error("Download error:", err)
      toast.error(err instanceof Error ? err.message : "PDF not available for this deed")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleShareClick = (deedId: number) => {
    setSelectedDeedId(deedId)
    setShareModalOpen(true)
    setShareError(null)
    setShareResult(null)
    setLinkCopied(false)
  }

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShareLoading(true)
    setShareError(null)

    try {
      const response = await apiFetch(
        `/shared-deeds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deed_id: selectedDeedId, ...shareForm }),
        },
        { label: "Sharing deed" }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `Failed to share deed (${response.status})`)
      }

      // S1: the backend says whether the email actually went out
      // (email_sent) and hands back the review link — report THAT, never
      // a fabricated "the recipient will receive an email."
      const data = await response.json().catch(() => ({}))
      setShareForm({
        recipient_name: "",
        recipient_email: "",
        recipient_role: "Title Officer",
        message: "",
        expires_in_hours: 168,
      })
      setShareResult({
        approvalUrl: data?.shared_deed?.approval_url || "",
        emailSent: !!data?.email_sent,
      })
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share deed")
    } finally {
      setShareLoading(false)
    }
  }

  const handleDeleteClick = (deedId: number) => {
    setDeleteConfirm({ isOpen: true, deedId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.deedId) return

    try {
      const response = await apiFetch(`/deeds/${deleteConfirm.deedId}`, { method: "DELETE" }, { label: "Deleting deed" })

      if (!response.ok) {
        throw new Error("Failed to delete deed")
      }

      // Remove from local state
      setDeeds(deeds.filter((d) => d.id !== deleteConfirm.deedId))
      toast.success("Deed deleted successfully")
      setDeleteConfirm({ isOpen: false, deedId: null })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete deed")
      setDeleteConfirm({ isOpen: false, deedId: null })
    }
  }

  const getStatusBadge = (status: Deed["status"]) => {
    const styles = {
      completed: "bg-green-100 text-green-800 border-green-200",
      draft: "bg-amber-100 text-amber-800 border-amber-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    }

    const labels = {
      completed: "Completed",
      draft: "Draft",
      in_progress: "In Progress",
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
        {status === "in_progress" && <Clock className="w-3.5 h-3.5" />}
        {labels[status]}
      </span>
    )
  }

  // U3: rows identify deeds — with several drafts on one address, the date
  // alone can't; show the time too (U1.4's full ISO timestamps make it real).
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  // X2.7: filter over address, grantee, doc id, APN, and type label.
  const visibleDeeds = deeds.filter((deed) => {
    if (statusFilter === "completed" && deed.status !== "completed") return false
    if (statusFilter === "draft" && deed.status === "completed") return false
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return [
      deed.property_address,
      deed.grantee_name,
      deed.apn,
      String(deed.id),
      deedTypeLabel(deed.deed_type),
    ].some((field) => (field || "").toLowerCase().includes(q))
  })

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 lg:p-16">
        <div className="max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">Past Deeds</h1>
            <p className="text-lg text-slate-600 mb-6">
              View and manage all your created deeds. Continue working on drafts or download completed documents.
            </p>

            {/* Subheader Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#7C4DFF]" />
                  <span className="text-lg font-semibold text-slate-700">
                    {visibleDeeds.length === deeds.length
                      ? `Showing ${deeds.length} ${deeds.length === 1 ? "deed" : "deeds"}`
                      : `Showing ${visibleDeeds.length} of ${deeds.length} deeds`}
                  </span>
                </div>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search address, grantee, APN, or Doc ID"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "completed" | "draft")}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Drafts</option>
                </select>
              </div>
              <button
                onClick={() => router.push("/deed-builder")}
                className="flex items-center gap-2 px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Deed
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-100 animate-spin border-t-[#7C4DFF]" />
                <FileText className="w-6 h-6 text-[#7C4DFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg text-slate-600 font-medium">Loading deeds...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-4 ring-red-100">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Failed to Load Deeds</h3>
                <p className="text-slate-600">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && deeds.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 bg-white rounded-2xl p-12 shadow-sm border border-slate-200">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-slate-50">
                <FileText className="w-12 h-12 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-slate-700 mb-2">No deeds yet</h3>
                <p className="text-slate-500 mb-6">Create your first deed to get started</p>
                <button
                  onClick={() => router.push("/deed-builder")}
                  className="px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Create Your First Deed
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && deeds.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Doc ID</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Property</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Deed Type</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Created</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Updated</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDeeds.map((deed, index) => (
                      <tr
                        key={deed.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <td className="py-4 px-6 font-mono text-sm text-slate-600">#{deed.id}</td>
                        <td className="py-4 px-6">
                          {/* U3: a row identifies its deed — address alone
                              can't when one property has several. */}
                          <p className="font-medium text-slate-800">{deed.property_address}</p>
                          {deed.grantee_name && (
                            <p className="text-sm text-slate-500">To {deed.grantee_name}</p>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-600">{deedTypeLabel(deed.deed_type)}</td>
                        <td className="py-4 px-6">{getStatusBadge(deed.status)}</td>
                        <td className="py-4 px-6 text-sm text-slate-600">{formatDate(deed.created_at)}</td>
                        <td className="py-4 px-6 text-sm text-slate-600">{formatDate(deed.updated_at)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {deed.status === "draft" && (
                              <button
                                onClick={() => handleContinue(deed)}
                                className="px-4 py-2 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white text-sm font-medium rounded-lg transition-colors"
                                title="Continue editing"
                              >
                                Continue
                              </button>
                            )}
                            {deed.status === "completed" && (
                              <>
                                <button
                                  onClick={() => handleDownload(deed)}
                                  disabled={downloadingId === deed.id}
                                  className="p-2 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white rounded-lg transition-colors disabled:opacity-60"
                                  title="Download PDF"
                                >
                                  {downloadingId === deed.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleShareClick(deed.id)}
                                  className="p-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                  title="Share deed"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteClick(deed.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                              title="Delete deed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[550px] w-full p-6 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Share Deed</h2>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Error Banner */}
            {shareError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{shareError}</p>
              </div>
            )}

            {/* S1: result panel — the truth about what happened, plus the
                review link so the share works even with no email transport. */}
            {shareResult ? (
              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 font-medium">
                    Share saved — the review link is active until it expires.
                  </p>
                </div>

                {shareResult.emailSent ? (
                  <p className="text-sm text-slate-600">
                    A notification email with the review link was sent to the recipient.
                  </p>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      The notification email could <strong>not</strong> be sent (email
                      isn&apos;t configured on the server). Copy the review link below
                      and send it to the recipient yourself.
                    </p>
                  </div>
                )}

                {shareResult.approvalUrl && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Review link</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareResult.approvalUrl}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareResult.approvalUrl)
                          setLinkCopied(true)
                          setTimeout(() => setLinkCopied(false), 2000)
                        }}
                        className="px-4 py-2.5 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                      >
                        {linkCopied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShareModalOpen(false)
                      setShareResult(null)
                    }}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleShareSubmit} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recipient Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={shareForm.recipient_name}
                  onChange={(e) => setShareForm({ ...shareForm, recipient_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recipient Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={shareForm.recipient_email}
                  onChange={(e) => setShareForm({ ...shareForm, recipient_email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipient Role</label>
                <select
                  value={shareForm.recipient_role}
                  onChange={(e) => setShareForm({ ...shareForm, recipient_role: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
                >
                  <option>Title Officer</option>
                  <option>Lender</option>
                  <option>Escrow Officer</option>
                  <option>Attorney</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message (Optional)</label>
                <textarea
                  rows={3}
                  value={shareForm.message}
                  onChange={(e) => setShareForm({ ...shareForm, message: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors resize-none"
                  placeholder="Add a message for the recipient..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link Expires In</label>
                <select
                  value={shareForm.expires_in_hours}
                  onChange={(e) => setShareForm({ ...shareForm, expires_in_hours: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
                >
                  <option value="24">24 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days (recommended)</option>
                  <option value="336">14 days</option>
                  <option value="720">30 days</option>
                </select>
                {/* X2.5: say what expiry actually does. */}
                <p className="text-xs text-slate-500 mt-1">
                  When the link expires it stops working and the share is marked
                  expired — the deed itself is unaffected, and you can share it
                  again anytime.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareLoading}
                  className="px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {shareLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Share Deed"
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, deedId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Deed"
        message="Are you sure you want to delete this deed? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

