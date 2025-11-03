"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Send, Eye, Clock, CheckCircle, XCircle, AlertCircle, RotateCw, X, Plus, FileText } from "lucide-react"

interface SharedDeed {
  id: number
  property: string
  deed_type: string
  shared_with: string
  recipient_email: string
  status: "sent" | "viewed" | "approved" | "rejected" | "expired" | "revoked"
  shared_date: string
  expires_at: string
  viewed_at?: string
  response_date?: string
  feedback?: string
}

// ✅ PHASE 24-E: V0-generated Shared Deeds page with feedback modal and expiry countdown
export default function SharedDeedsPageV0() {
  const router = useRouter()
  const [sharedDeeds, setSharedDeeds] = useState<SharedDeed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; text: string }>({
    open: false,
    text: "",
  })
  const [shareModalOpen, setShareModalOpen] = useState(false)

  useEffect(() => {
    fetchSharedDeeds()
  }, [])

  const fetchSharedDeeds = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login?redirect=/shared-deeds")
        return
      }

      const response = await fetch(`${api}/shared-deeds`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch shared deeds")
      }

      const data = await response.json()
      setSharedDeeds(Array.isArray(data) ? data : data.shared_deeds || [])
    } catch (err) {
      console.error("Error fetching shared deeds:", err)
      setError(err instanceof Error ? err.message : "Failed to load shared deeds")
    } finally {
      setLoading(false)
    }
  }

  const handleViewFeedback = async (shareId: number) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/shared-deeds/${shareId}/feedback`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFeedbackModal({
          open: true,
          text: data.feedback || "(No comments provided)",
        })
      } else {
        // Fallback to deed's feedback field
        const deed = sharedDeeds.find((d) => d.id === shareId)
        setFeedbackModal({
          open: true,
          text: deed?.feedback || "(No comments provided)",
        })
      }
    } catch (err) {
      console.error("Error fetching feedback:", err)
      alert("Failed to load feedback")
    }
  }

  const handleRemind = async (shareId: number) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/shared-deeds/${shareId}/resend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to send reminder")
      }

      alert("Reminder sent successfully!")
      fetchSharedDeeds()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send reminder")
    }
  }

  const handleRevoke = async (shareId: number) => {
    if (!confirm("Are you sure you want to revoke access to this deed?")) {
      return
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/shared-deeds/${shareId}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to revoke access")
      }

      alert("Access revoked successfully")
      fetchSharedDeeds()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access")
    }
  }

  const getStatusBadge = (status: SharedDeed["status"]) => {
    const styles = {
      sent: "bg-blue-100 text-blue-800 border-blue-200",
      viewed: "bg-amber-100 text-amber-800 border-amber-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      expired: "bg-slate-100 text-slate-800 border-slate-200",
      revoked: "bg-slate-100 text-slate-800 border-slate-200",
    }

    const icons = {
      sent: <Send className="w-3.5 h-3.5" />,
      viewed: <Eye className="w-3.5 h-3.5" />,
      approved: <CheckCircle className="w-3.5 h-3.5" />,
      rejected: <XCircle className="w-3.5 h-3.5" />,
      expired: <Clock className="w-3.5 h-3.5" />,
      revoked: <XCircle className="w-3.5 h-3.5" />,
    }

    const labels = {
      sent: "Sent",
      viewed: "Viewed",
      approved: "Approved",
      rejected: "Rejected",
      expired: "Expired",
      revoked: "Revoked",
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {icons[status]}
        {labels[status]}
      </span>
    )
  }

  // ✅ PHASE 24-E: Expiry countdown logic with red text when ≤3 days
  const calculateDaysRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: "Expired", isUrgent: true }
    if (diffDays === 0) return { text: "Expires today", isUrgent: true }
    if (diffDays <= 3) return { text: `${diffDays} days left`, isUrgent: true }
    return { text: `${diffDays} days left`, isUrgent: false }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  const canRemind = (deed: SharedDeed) => {
    return !["expired", "approved", "rejected", "revoked"].includes(deed.status)
  }

  const canRevoke = (deed: SharedDeed) => {
    return deed.status !== "revoked"
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 lg:p-16">
        <div className="max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">Shared Deeds</h1>
            <p className="text-lg text-slate-600 mb-6">
              Track deeds shared for approval and manage collaboration with title companies, lenders, and other parties.
            </p>

            {/* Subheader Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#7C4DFF]" />
                <span className="text-lg font-semibold text-slate-700">
                  {sharedDeeds.length} shared {sharedDeeds.length === 1 ? "deed" : "deeds"}
                </span>
              </div>
              <button
                onClick={() => setShareModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Share New Deed
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-100 animate-spin border-t-[#7C4DFF]" />
                <Send className="w-6 h-6 text-[#7C4DFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg text-slate-600 font-medium">Loading shared deeds...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-4 ring-red-100">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Failed to Load Shared Deeds</h3>
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
          {!loading && !error && sharedDeeds.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 bg-white rounded-2xl p-12 shadow-sm border border-slate-200">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-slate-50">
                <Send className="w-12 h-12 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-slate-700 mb-2">No shared deeds yet</h3>
                <p className="text-slate-500 mb-6">Share a deed from Past Deeds to start collaborating</p>
                <button
                  onClick={() => router.push("/past-deeds")}
                  className="px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Go to Past Deeds
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && sharedDeeds.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Property</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Deed Type</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Shared With</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Shared Date</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Expires</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Response</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedDeeds.map((deed, index) => {
                      const daysRemaining = calculateDaysRemaining(deed.expires_at)
                      const showCountdown = !["expired", "approved", "rejected"].includes(deed.status)

                      return (
                        <tr
                          key={deed.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <td className="py-4 px-6 font-medium text-slate-800">{deed.property}</td>
                          <td className="py-4 px-6 text-slate-600">{deed.deed_type}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{deed.shared_with}</span>
                              <span className="text-xs text-slate-500">{deed.recipient_email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-2">
                              {getStatusBadge(deed.status)}
                              {deed.status === "rejected" && (
                                <button
                                  onClick={() => handleViewFeedback(deed.id)}
                                  className="text-xs text-red-600 hover:text-red-700 underline font-medium text-left"
                                >
                                  View Feedback
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">{formatDate(deed.shared_date)}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600">{formatDate(deed.expires_at)}</span>
                              {showCountdown && (
                                <span
                                  className={`text-xs font-medium ${
                                    daysRemaining.isUrgent ? "text-red-500" : "text-slate-500"
                                  }`}
                                >
                                  {daysRemaining.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600">
                                {deed.response_date ? formatDate(deed.response_date) : "Pending"}
                              </span>
                              {deed.viewed_at && (
                                <span className="text-xs text-slate-500">Viewed: {formatDate(deed.viewed_at)}</span>
                              )}
                              {!deed.viewed_at && <span className="text-xs text-slate-400">Not viewed</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {canRemind(deed) && (
                                <button
                                  onClick={() => handleRemind(deed.id)}
                                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                  title="Send reminder"
                                >
                                  <RotateCw className="w-4 h-4" />
                                  Remind
                                </button>
                              )}
                              {canRevoke(deed) && (
                                <button
                                  onClick={() => handleRevoke(deed.id)}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium rounded-lg transition-colors"
                                  title="Revoke access"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Feedback Modal */}
      {feedbackModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Reviewer Feedback</h2>
              <button
                onClick={() => setFeedbackModal({ open: false, text: "" })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{feedbackModal.text}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setFeedbackModal({ open: false, text: "" })}
                className="px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share New Deed Modal (Placeholder) */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Share Deed for Review</h2>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">
                To share a deed, please go to the Past Deeds page and click the Share button on a completed deed.
              </p>
              <button
                onClick={() => {
                  setShareModalOpen(false)
                  router.push("/past-deeds")
                }}
                className="px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors"
              >
                Go to Past Deeds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

