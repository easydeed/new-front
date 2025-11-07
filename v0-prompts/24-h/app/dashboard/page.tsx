"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { FileText, Clock, CheckCircle, Calendar, TrendingUp, Activity } from "lucide-react"

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recentDeeds, setRecentDeeds] = useState([])
  const [summary, setSummary] = useState<{
    total: number
    completed: number
    in_progress: number
    month: number
  } | null>(null)
  const router = useRouter()

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.push("/login?redirect=/dashboard")
          return
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (response.ok) {
          setIsAuthenticated(true)
          await fetchRecentDeeds()
        } else {
          localStorage.removeItem("access_token")
          router.push("/login?redirect=/dashboard")
          return
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login?redirect=/dashboard")
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Fetch dashboard summary stats
  useEffect(() => {
    if (!isAuthenticated) return

    const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
    const token = localStorage.getItem("access_token")
    ;(async () => {
      try {
        const res = await fetch(`${api}/deeds/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (res.ok) {
          setSummary(await res.json())
        } else {
          // Fallback: calculate from deeds list
          const list = await fetch(`${api}/deeds`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (list.ok) {
            const data = await list.json()
            const deeds = Array.isArray(data.deeds) ? data.deeds : []
            const total = deeds.length
            const completed = deeds.filter((d: any) => d.status === "completed").length
            const in_progress = deeds.filter((d: any) => d.status !== "completed").length
            setSummary({ total, completed, in_progress, month: completed })
          }
        }
      } catch (e) {
        console.error("Failed to load dashboard summary:", e)
      }
    })()
  }, [isAuthenticated])

  const fetchRecentDeeds = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return

      const response = await fetch("https://deedpro-main-api.onrender.com/deeds", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentDeeds(data.deeds || [])
      }
    } catch (error) {
      console.error("Error fetching recent deeds:", error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4DFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex bg-[#F9F9F9] min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1F2B37] mb-2">Welcome to DeedPro</h1>
            <p className="text-gray-600">Your smooth path to professional deeds — guided, simple, effortless.</p>
          </div>

          {/* Resume Draft Banner */}
          <ResumeDraftBanner />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <StatCard
              label="Total Deeds"
              value={summary?.total ?? "—"}
              icon={<FileText className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              label="In Progress"
              value={summary?.in_progress ?? "—"}
              icon={<Clock className="w-6 h-6" />}
              color="yellow"
            />
            <StatCard
              label="Completed"
              value={summary?.completed ?? "—"}
              icon={<CheckCircle className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              label="This Month"
              value={summary?.month ?? "—"}
              icon={<Calendar className="w-6 h-6" />}
              color="purple"
            />
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#7C4DFF]" />
              <h3 className="text-xl font-bold text-[#1F2B37]">Recent Activity</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-700">Property</th>
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeeds.length > 0 ? (
                    recentDeeds.slice(0, 5).map((deed: any) => (
                      <tr key={deed.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 md:px-4 text-sm">Deed Created</td>
                        <td className="py-3 px-2 md:px-4 text-sm">{deed.property || deed.address || "No address"}</td>
                        <td className="py-3 px-2 md:px-4 text-sm text-gray-600">
                          {deed.created_at ? new Date(deed.created_at).toLocaleDateString() : "No date"}
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              deed.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {deed.status || "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="w-12 h-12 text-gray-300" />
                          <p>No recent activity.</p>
                          <a href="/create-deed" className="text-[#7C4DFF] hover:underline font-semibold">
                            Create your first deed
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: "blue" | "yellow" | "green" | "purple"
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-[#7C4DFF]/10 text-[#7C4DFF]",
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <TrendingUp className="w-4 h-4 text-gray-400" />
      </div>
      <div className="text-3xl font-bold text-[#1F2B37] mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

// Resume Draft Banner Component
function ResumeDraftBanner() {
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<{
    formData?: { deedType?: string }
    currentStep?: number
    savedAt?: string
  } | null>(null)

  useEffect(() => {
    const checkForDraft = () => {
      if (typeof window === "undefined") return
      try {
        const raw = localStorage.getItem("deedWizardDraft")
        if (!raw) {
          setHasDraft(false)
          return
        }
        const parsed = JSON.parse(raw)
        if (!parsed?.formData || !parsed?.formData?.deedType) {
          setHasDraft(false)
          return
        }
        setHasDraft(true)
        setDraftInfo(parsed)
      } catch {
        setHasDraft(false)
      }
    }

    checkForDraft()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "deedWizardDraft") {
        checkForDraft()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(checkForDraft, 1000)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (!hasDraft || !draftInfo) return null

  const deedType = draftInfo.formData?.deedType || "Deed"
  const currentStep = draftInfo.currentStep || 1
  const savedAt = draftInfo.savedAt ? new Date(draftInfo.savedAt).toLocaleDateString() : "recently"

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-[#1F2B37] mb-1">Resume {deedType} Creation</h3>
        <p className="text-gray-600 text-sm">
          Step {currentStep} of 5 • Saved {savedAt}
        </p>
      </div>
      <a
        href="/create-deed"
        className="bg-[#7C4DFF] hover:bg-[#6A3FE6] text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full md:w-auto text-center"
      >
        Continue
      </a>
    </div>
  )
}
