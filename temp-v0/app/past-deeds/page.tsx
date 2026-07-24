"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { FileText, Download, Share2, Trash2, AlertCircle, CheckCircle, Clock, X, Plus, Loader2 } from "lucide-react"

interface Deed {
  id: number
  property: string
  deed_type: string
  status: "completed" | "draft" | "in_progress"
  progress: number
  created_at: string
  updated_at: string
  pdf_url?: string
}

interface ShareFormData {
  recipient_name: string
  recipient_email: string
  recipient_role: string
  message: string
  expires_in_days: number
}

export default function PastDeedsPage() {
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
    expires_in_days: 30,
  })

  useEffect(() => {
    fetchDeeds()
  }, [])

  const fetchDeeds = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login?redirect=/past-deeds")
        return
      }

      const response = await fetch(`${api}/deeds`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch deeds")
      }

      const data = await response.json()
      setDeeds(Array.isArray(data) ? data : data.deeds || [])
    } catch (err) {
      console.error("Error fetching deeds:", err)
      setError(err instanceof Error ? err.message : "Failed to load deeds")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = (deed: Deed) => {
    router.push(`/create-deed/${deed.deed_type.toLowerCase().replace(" ", "-")}`)
  }

  const handleDownload = (deed: Deed) => {
    if (deed.pdf_url) {
      window.open(deed.pdf_url, "_blank")
    } else {
      alert("PDF not available for this deed")
    }
  }

  const handleShareClick = (deedId: number) => {
    setSelectedDeedId(deedId)
    setShareModalOpen(true)
    setShareError(null)
  }

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShareLoading(true)
    setShareError(null)

    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/shared-deeds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deed_id: selectedDeedId,
          ...shareForm,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to share deed")
      }

      // Success - close modal and reset form
      setShareModalOpen(false)
      setShareForm({
        recipient_name: "",
        recipient_email: "",
        recipient_role: "Title Officer",
        message: "",
        expires_in_days: 30,
      })
      alert("Deed shared successfully!")
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share deed")
    } finally {
      setShareLoading(false)
    }
  }

  const handleDelete = async (deedId: number) => {
    if (!confirm("Are you sure you want to delete this deed? This action cannot be undone.")) {
      return
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/deeds/${deedId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete deed")
      }

      // Remove from local state
      setDeeds(deeds.filter((d) => d.id !== deedId))
      alert("Deed deleted successfully")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete deed")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

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
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7C4DFF]" />
                <span className="text-lg font-semibold text-slate-700">
                  Showing {deeds.length} {deeds.length === 1 ? "deed" : "deeds"}
                </span>
              </div>
              <button
                onClick={() => router.push("/create-deed")}
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
                  onClick={() => router.push("/create-deed")}
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
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Property</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Deed Type</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Progress</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Created</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Updated</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deeds.map((deed, index) => (
                      <tr
                        key={deed.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <td className="py-4 px-6 font-medium text-slate-800">{deed.property}</td>
                        <td className="py-4 px-6 text-slate-600">{deed.deed_type}</td>
                        <td className="py-4 px-6">{getStatusBadge(deed.status)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  deed.progress === 100 ? "bg-green-500" : "bg-[#7C4DFF]"
                                }`}
                                style={{ width: `${deed.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 font-medium">{deed.progress}%</span>
                          </div>
                        </td>
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
                                  className="p-2 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white rounded-lg transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
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
                              onClick={() => handleDelete(deed.id)}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[550px] w-full p-8 max-h-[90vh] overflow-y-auto">
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

            {/* Form */}
            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
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
          </div>
        </div>
      )}
    </div>
  )
}
