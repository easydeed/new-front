"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { AIGreeting } from "@/components/ui/AIGreeting"
import { AICard } from "@/components/ui/AICard"
import { AIEmptyState } from "@/components/ui/AIEmptyState"
import { AuthManager } from "@/utils/auth"
import { 
  FileText, Clock, CheckCircle, Send, 
  TrendingUp, Activity, Download, Share2, 
  ArrowRight, Sparkles, Eye
} from "lucide-react"

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>("")
  const [recentDeeds, setRecentDeeds] = useState<any[]>([])
  const [summary, setSummary] = useState<{
    total: number
    completed: number
    in_progress: number
    pending: number
  } | null>(null)
  const router = useRouter()

  // Authentication check and load user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.push("/login?redirect=/dashboard")
          return
        }

        // Get user info
        const user = AuthManager.getUser()
        if (user?.full_name) {
          setUserName(user.full_name.split(' ')[0]) // First name only
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (response.ok) {
          const profileData = await response.json()
          if (profileData.full_name) {
            setUserName(profileData.full_name.split(' ')[0])
          }
          
          // Check if onboarding is completed
          const onboardingComplete = localStorage.getItem("onboarding_completed") === "true"
          const hasDeeds = profileData.total_deeds > 0
          
          // Redirect to onboarding if new user hasn't completed it
          if (!onboardingComplete && !hasDeeds && !profileData.onboarding_completed) {
            router.push("/onboarding")
            return
          }
          
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
          const data = await res.json()
          setSummary({
            total: data.total || 0,
            completed: data.completed || 0,
            in_progress: data.in_progress || 0,
            pending: data.pending || data.shared || 0,
          })
        } else {
          // Fallback: calculate from deeds list
          const list = await fetch(`${api}/deeds`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (list.ok) {
            const data = await list.json()
            const deeds = Array.isArray(data.deeds) ? data.deeds : []
            setSummary({
              total: deeds.length,
              completed: deeds.filter((d: any) => d.status === "completed").length,
              in_progress: deeds.filter((d: any) => d.status === "draft" || d.status === "in_progress").length,
              pending: deeds.filter((d: any) => d.status === "shared" || d.status === "pending").length,
            })
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/deeds`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
          </div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const hasDeeds = recentDeeds.length > 0
  const inProgressDeed = recentDeeds.find((d: any) => d.status === "draft" || d.status === "in_progress")

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* AI Greeting */}
          <div className="mb-8">
            <AIGreeting userName={userName} />
          </div>

          {/* Continue where you left off (AI Card) */}
          {inProgressDeed && (
            <AICard
              message={`You have a deed in progress. Want to continue where you left off?`}
              action={{
                label: `Continue: ${inProgressDeed.property_address || inProgressDeed.deed_type || 'Draft'}`,
                onClick: () => router.push('/deed-builder')
              }}
              secondaryAction={{
                label: "Start fresh",
                onClick: () => router.push('/deed-builder')
              }}
              details="Your work is automatically saved. You can continue anytime without losing progress."
              className="mb-8"
            />
          )}

          {/* Stats Grid */}
          {hasDeeds && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Deeds"
                value={summary?.total ?? 0}
                icon={<FileText className="w-5 h-5" />}
                color="purple"
              />
              <StatCard
                label="In Progress"
                value={summary?.in_progress ?? 0}
                icon={<Clock className="w-5 h-5" />}
                color="yellow"
              />
              <StatCard
                label="Pending Review"
                value={summary?.pending ?? 0}
                icon={<Send className="w-5 h-5" />}
                color="blue"
              />
              <StatCard
                label="Completed"
                value={summary?.completed ?? 0}
                icon={<CheckCircle className="w-5 h-5" />}
                color="green"
              />
            </div>
          )}

          {/* Create New Deed Button (Always visible) */}
          {hasDeeds && (
            <button
              onClick={() => router.push('/deed-builder')}
              className="w-full mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl p-4 font-semibold transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-5 h-5" />
              Create New Deed
            </button>
          )}

          {/* Recent Activity or Empty State */}
          {hasDeeds ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {recentDeeds.slice(0, 5).map((deed: any) => (
                  <DeedRow key={deed.id} deed={deed} />
                ))}
              </div>
            </div>
          ) : (
            <AIEmptyState
              title="Welcome to your dashboard!"
              message="This is where you'll see all your deeds. Let's create your first one — I'll guide you through every step."
              action={{
                label: "Create Your First Deed",
                onClick: () => router.push('/deed-builder')
              }}
              icon="deed"
              tips={[
                "Enter an address — I'll find the property data",
                "Tell me who's involved — I'll format the names",
                "I'll calculate transfer tax (including city rates)",
                "Download a ready-to-record PDF in under 2 minutes"
              ]}
            />
          )}
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
    yellow: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

// Deed Row Component
function DeedRow({ deed }: { deed: any }) {
  const router = useRouter()
  
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'draft':
      case 'in_progress':
        return 'bg-amber-100 text-amber-700'
      case 'shared':
      case 'pending':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'draft':
      case 'in_progress':
        return <Clock className="w-3 h-3" />
      case 'shared':
      case 'pending':
        return <Send className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  const formatDeedType = (type: string) => {
    return type
      ?.replace(/_/g, ' ')
      ?.replace(/-/g, ' ')
      ?.split(' ')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || 'Deed'
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {formatDeedType(deed.deed_type)} {deed.property_address ? `- ${deed.property_address}` : ''}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {deed.county || 'California'} • {deed.grantor_name || 'Draft'} → {deed.grantee_name || '...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(deed.status)}`}>
          {getStatusIcon(deed.status)}
          {deed.status || 'Draft'}
        </span>
        <span className="text-sm text-gray-400 hidden sm:block">
          {formatDate(deed.created_at)}
        </span>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {deed.status === 'completed' && deed.pdf_url && (
            <button 
              onClick={() => window.open(deed.pdf_url, '_blank')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {deed.status === 'completed' && (
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {(deed.status === 'draft' || deed.status === 'in_progress') && (
            <button 
              onClick={() => router.push('/deed-builder')}
              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600"
              title="Continue"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
