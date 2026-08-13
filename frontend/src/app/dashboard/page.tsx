"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { AIGreeting } from "@/components/ui/AIGreeting"
import { AICard } from "@/components/ui/AICard"
import { AIEmptyState } from "@/components/ui/AIEmptyState"
import { AuthManager } from "@/utils/auth"
import { pickInProgressDeed } from "@/lib/latestDraft"
import { SessionExpiredError, apiFetch } from "@/lib/apiClient"
import { 
  FileText, Clock, CheckCircle, Send, 
  TrendingUp, Activity, Download, Share2, 
  ArrowRight, Sparkles, Eye
} from "lucide-react"

/**
 * DASH1 — WHAT IS WAITING ON SOMEBODY.
 *
 * The dashboard showed only AUTHORING state: four counters and a feed of
 * completed deeds. Nothing on it was workflow state — and workflow state
 * is the escrow officer's job. She could not answer "what is stuck?",
 * "what signs tomorrow?" or "who has not responded?" without visiting two
 * other pages, while this page carried four entry points for creating a
 * deed, which she does once per file.
 *
 * The shape below is the server's, asserted by equality in
 * `services/officer_queue.py`. Nothing here decides what "stale" means.
 */
type Queue = {
  upcoming: Array<{ kind: string; id: number; deed_id: number; property: string | null;
                    when: string; who: string | null; summary: string }>;
  awaiting: Array<{ kind: string; id: number; deed_id: number; property: string | null;
                    who: string | null; days_waiting: number | null; stale: boolean;
                    summary: string }>;
  idle_drafts: Array<{ kind: string; id: number; deed_type: string | null;
                       property: string | null; days_idle: number | null }>;
  needs_attention: number;
  thresholds: { stale_after_days: number; upcoming_days: number; idle_draft_days: number };
};

export default function Dashboard() {
  const [queue, setQueue] = useState<Queue | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>("")
  const [recentDeeds, setRecentDeeds] = useState<any[]>([])
  const [deedsError, setDeedsError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    total: number
    completed: number
    drafts: number
    lastThirtyDays: number
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

    ;(async () => {
      try {
        // X1: loud failures — apiFetch toasts non-2xx and handles 401.
        const res = await apiFetch(`/deeds/summary`, {}, { label: "Loading dashboard summary" })

        if (res.ok) {
          const data = await res.json()
          setSummary({
            total: data.total || 0,
            completed: data.completed || 0,
            drafts: data.drafts || 0,
            lastThirtyDays: data.last_30_days ?? data.month ?? 0,
          })
        } else {
          // Fallback: calculate from deeds list
          const list = await apiFetch(`/deeds`, {}, { label: "Loading deeds", silent: true })
          if (list.ok) {
            const data = await list.json()
            const deeds = Array.isArray(data.deeds) ? data.deeds : []
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)
            setSummary({
              total: deeds.length,
              completed: deeds.filter((d: any) => d.status === "completed").length,
              drafts: deeds.filter((d: any) => d.status !== "completed").length,
              // Fallback path: 30 days back, matching the endpoint it is
              // standing in for rather than the calendar it used to use.
              lastThirtyDays: deeds.filter((d: any) => d.created_at
                && new Date(d.created_at) >= thirtyDaysAgo).length,
            })
          }
        }
      } catch (e) {
        if (e instanceof SessionExpiredError) return
        console.error("Failed to load dashboard summary:", e)
      }
    })()
  }, [isAuthenticated])

  // The queue. Its own state and its own error, because a failed queue
  // must not blank a page of real deeds and a failed deed list must not
  // hide the queue — §4 in both directions, the rule FLOW1 item 3 landed
  // on when Shared Deeds grew a second feed.
  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      try {
        const res = await apiFetch(`/dashboard/queue`, {}, { label: "Loading what's waiting" })
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}))
          throw new Error(detail.detail || `Couldn't load your queue (${res.status})`)
        }
        setQueue(await res.json())
      } catch (e) {
        if (e instanceof SessionExpiredError) return
        setQueueError(e instanceof Error ? e.message : "Couldn't load what's waiting")
      }
    })()
  }, [isAuthenticated])

  const fetchRecentDeeds = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return

      const response = await apiFetch(`/deeds`, {}, { label: "Loading your deeds" })

      if (response.ok) {
        const data = await response.json()
        setRecentDeeds(data.deeds || [])
        setDeedsError(null)
      } else {
        // F4: a failed load used to render as the "welcome, create your
        // first deed" empty state — say what actually happened instead.
        const data = await response.json().catch(() => ({}))
        setDeedsError(data.detail || `Couldn't load your deeds (${response.status})`)
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) return
      console.error("Error fetching recent deeds:", error)
      setDeedsError("Couldn't load your deeds. Check your connection and try again.")
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
  // U1.2: the LAST-TOUCHED draft (updated_at desc), not the first draft in
  // a created_at-ordered list — that offered users their oldest work back.
  const inProgressDeed = pickInProgressDeed(recentDeeds)
  // DASH1: by when something last happened to it, drafts included —
  // which is what "recent activity" claimed and creation order is not.
  const recentlyTouched = [...recentDeeds].sort((a: any, b: any) =>
    String(b.updated_at || b.created_at || '').localeCompare(
      String(a.updated_at || a.created_at || '')))

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* AI Greeting */}
          <div className="mb-8">
            <AIGreeting userName={userName} />
          </div>

          {/* Draft deed card (Ticket R: resume is real — the card opens the
              builder hydrated from the saved row, decisions intact) */}
          {inProgressDeed && (
            <AICard
              message={`You have a deed in progress. Continue where you left off?`}
              action={{
                label: `Continue: ${inProgressDeed.property_address || inProgressDeed.deed_type || 'Draft'}`,
                onClick: () => router.push(`/deed-builder/${inProgressDeed.deed_type || 'grant-deed'}?resume=${inProgressDeed.id}`)
              }}
              secondaryAction={{
                label: "Start a new deed",
                onClick: () => router.push('/deed-builder')
              }}
              details="Your saved draft reopens with everything you entered — confirmations and tax decisions included."
              className="mb-8"
            />
          )}

          {/* DASH1 — THE QUEUE LEADS. What is waiting on somebody comes
              before what has been made, because that is the order she
              works in. */}
          <ActionQueue queue={queue} error={queueError} />

          {/* Stats Grid — DASH1: every tile is a LINK now. A count with
              no drill-down is trivia: "4 Drafts" that cannot be pressed
              tells her a number and makes her go and find the four. */}
          {hasDeeds && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Deeds"
                value={summary?.total ?? 0}
                icon={<FileText className="w-5 h-5" />}
                color="purple"
                href="/past-deeds"
              />
              <StatCard
                label="Drafts"
                value={summary?.drafts ?? 0}
                icon={<Clock className="w-5 h-5" />}
                color="yellow"
                href="/past-deeds?status=draft"
              />
              {/* DASH1: "This Month" is gone. It rendered a big zero on
                  the first of every month for a user whose work had not
                  stopped — the counter told her she had done nothing when
                  what happened is that a calendar page turned. The admin
                  surface already carries a paragraph apologising for the
                  same framing; this is the honest version it settled on. */}
              <StatCard
                label="Last 30 days"
                value={summary?.lastThirtyDays ?? 0}
                icon={<TrendingUp className="w-5 h-5" />}
                color="blue"
                href="/past-deeds"
              />
              <StatCard
                label="Completed"
                value={summary?.completed ?? 0}
                icon={<CheckCircle className="w-5 h-5" />}
                color="green"
                href="/past-deeds?status=completed"
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

          {/* Recent Activity, load error, or Empty State */}
          {deedsError ? (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
              <p className="text-red-700 font-medium mb-1">Couldn&apos;t load your deeds</p>
              <p className="text-sm text-gray-500 mb-4">{deedsError}</p>
              <button
                onClick={() => fetchRecentDeeds()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : hasDeeds ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* DASH1 — "RECENT ACTIVITY" WAS SORTED BY CREATION.
                  `GET /deeds` orders by `created_at DESC`, so a draft
                  edited this morning sat below five deeds made last week
                  and never touched since. The feed was "recently made",
                  labelled "recently happened" — and because completed
                  deeds cluster at the top of a creation-ordered list, it
                  read as a completed-deeds feed while the Drafts counter
                  said otherwise.
                  Two fixes, not one: it sorts by when something last
                  HAPPENED to the deed, and every row now links to it. */}
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Recently worked on</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {recentlyTouched.slice(0, 5).map((deed: any) => (
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

/**
 * DASH1 — the action queue.
 *
 * THREE LISTS, NOT ONE PILE. "Chase somebody", "be somewhere" and
 * "finish something" are different actions, and merging them makes her
 * sort them by hand every morning.
 *
 * THE EMPTY STATE IS A RESULT, NOT AN ABSENCE. An honest empty queue is
 * a good morning — the screen says so rather than rendering nothing and
 * letting her wonder whether it loaded.
 */
function ActionQueue({ queue, error }: { queue: Queue | null; error: string | null }) {
  const router = useRouter()

  if (error) {
    // §4: a queue we could not load says so. Rendering the empty state
    // would tell her nothing is waiting, which is a claim about her work
    // rather than about our request.
    return (
      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-800">Couldn&apos;t load what&apos;s waiting</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    )
  }
  if (!queue) return null

  const empty =
    queue.upcoming.length === 0 &&
    queue.awaiting.length === 0 &&
    queue.idle_drafts.length === 0

  return (
    <section className="mb-8" aria-label="What's waiting">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">What&apos;s waiting</h2>
        {/* ONE NUMBER, and it means something. Not "there are rows
            below" — a signing booked for Thursday needs nothing from
            her. It is the requests that have gone quiet. */}
        {queue.needs_attention > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            {/* UX2 item 4 — THIS NUMBER SAYS SOMETHING NARROWER THAN THE
                SIDEBAR BADGES, and now says so.

                "Needs your attention" is true of everything on this
                page, so it named nothing. This count is the STALE
                unanswered requests — the ones that have gone quiet —
                which is the number that means "nobody is waiting on me
                and nobody has gone silent" when it is zero.

                The threshold rides on the payload so no screen retypes
                it (DASH1). */}
            {queue.needs_attention} {queue.needs_attention === 1 ? 'has' : 'have'} gone
            quiet — no answer in {queue.thresholds.stale_after_days}+ days
          </span>
        )}
      </div>

      {empty ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="font-medium text-gray-900">Nothing is waiting on anyone.</p>
          <p className="mt-1 text-sm text-gray-500">
            No signings in the next {queue.thresholds.upcoming_days} days, no unanswered
            requests, and no drafts left sitting.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <QueueList
            title={`Signing in the next ${queue.thresholds.upcoming_days} days`}
            emptyNote="Nothing booked this week."
            rows={queue.upcoming.map((r) => ({
              key: `up-${r.id}`,
              title: r.property || `Deed #${r.deed_id}`,
              // The server's sentence, verbatim (§13 rule 3).
              detail: r.summary,
              meta: `${new Date(r.when).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}${r.who ? ` · ${r.who}` : ''}`,
              urgent: false,
              // DEEDDETAIL: the deed, not the tracker. The queue's job is
              // "what needs me"; the answer to "and then what" is the
              // deed page's state-and-next-action, which the tracker
              // cannot show because it is a cross-deed list.
              onOpen: () => router.push(`/deeds/${r.deed_id}`),
            }))}
          />
          <QueueList
            title="Waiting on a reply"
            emptyNote="Everyone has answered."
            rows={queue.awaiting.map((r) => ({
              key: `aw-${r.kind}-${r.id}`,
              title: r.property || `Deed #${r.deed_id}`,
              detail: r.summary,
              meta: `${r.who || 'Unnamed'} · ${
                r.days_waiting === null ? 'waiting'
                  : r.days_waiting === 0 ? 'sent today'
                  : `${r.days_waiting} day${r.days_waiting === 1 ? '' : 's'}`
              }`,
              urgent: r.stale,
              // Both kinds land on the same page, because from here the
              // question is the same one: what is happening on this deed
              // and what do I do about it. Which table the delay lives in
              // is our problem, not hers.
              onOpen: () => router.push(`/deeds/${r.deed_id}`),
            }))}
          />
          <QueueList
            title={`Untouched for ${queue.thresholds.idle_draft_days}+ days`}
            emptyNote="No forgotten drafts."
            rows={queue.idle_drafts.map((r) => ({
              key: `id-${r.id}`,
              title: r.property || `Deed #${r.id}`,
              detail: 'Draft — nobody is waiting on this but you.',
              meta: r.days_idle === null ? 'untouched' : `${r.days_idle} days`,
              urgent: false,
              // Deliberately NOT the deed page. A draft has exactly one
              // action and the deed page would only offer that same
              // action one navigation later — a hop that buys nothing.
              onOpen: () => router.push(
                `/deed-builder/${r.deed_type || 'grant-deed'}?resume=${r.id}`),
            }))}
          />
        </div>
      )}
    </section>
  )
}

type QueueRow = {
  key: string
  title: string
  detail: string
  meta: string
  urgent: boolean
  onOpen: () => void
}

function QueueList({ title, rows, emptyNote }: {
  title: string
  rows: QueueRow[]
  emptyNote: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-500">{emptyNote}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.slice(0, 5).map((r) => (
            <li key={r.key}>
              {/* EVERY ROW LINKS TO THE THING ITSELF. A queue that tells
                  her something is stuck and then makes her go and find it
                  is a list of chores, not a queue. */}
              <button
                onClick={r.onOpen}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  r.urgent ? 'border-l-4 border-amber-400' : ''
                }`}
              >
                <p className="font-medium text-gray-900 truncate">{r.title}</p>
                <p className="text-sm text-gray-600 truncate">{r.detail}</p>
                <p className={`text-xs mt-0.5 ${r.urgent ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
                  {r.meta}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: "blue" | "yellow" | "green" | "purple"
  /** DASH1: a count with no drill-down is trivia. Required rather than
   * optional — a tile added later without one would silently be the
   * thing this ticket removed. */
  href: string
}) {
  const router = useRouter()
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  }

  return (
    <button
      onClick={() => router.push(href)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <ArrowRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  )
}

// Deed Row Component
function DeedRow({ deed }: { deed: any }) {
  const router = useRouter()

  // pdf_url is a backend-relative authenticated path — window.open can't
  // reach it; fetch the stored PDF as a blob like Past Deeds does.
  const handleDownload = async () => {
    try {
      // X1: loud failures — apiFetch toasts non-2xx and handles 401.
      const response = await apiFetch(`/deeds/${deed.id}/download`, {}, { label: `Downloading deed #${deed.id}` })
      if (!response.ok) throw new Error("Download failed")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${deed.deed_type || "Deed"}_${deed.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      if (err instanceof SessionExpiredError) return
      console.error("Download error:", err)
    }
  }

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

  const needsAction = deed.status === 'draft' || deed.status === 'in_progress'

  return (
    // X2.7: drafts read as "needs action" at a glance — amber edge + a
    // labeled Continue button, not an unexplained arrow.
    <div className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 ${
      needsAction ? 'border-l-4 border-amber-400' : ''
    }`}>
      {/* DASH1: THE ROW LINKS TO THE DEED. A feed of things she has
          worked on, where pressing one does nothing, is a list of
          reminders that she owns some deeds. A draft opens where the
          work is; a finished one opens focused in Past Deeds — there is
          still no deed detail route (ledgered as DEEDDETAIL), so this
          uses the same `?focus=` pattern the Signings agenda does. */}
      <button
        onClick={() => router.push(
          needsAction
            ? `/deed-builder/${deed.deed_type || 'grant-deed'}?resume=${deed.id}`
            : `/past-deeds?focus=${deed.id}`)}
        className="flex items-center gap-4 min-w-0 flex-1 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {formatDeedType(deed.deed_type)} {deed.property_address ? `- ${deed.property_address}` : ''}
          </p>
          <p className="text-sm text-gray-500 truncate">
            Doc #{deed.id} • {deed.grantor_name || 'Draft'} → {deed.grantee_name || '...'}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(deed.status)}`}>
          {getStatusIcon(deed.status)}
          {deed.status || 'Draft'}
        </span>
        <span className="text-sm text-gray-400 hidden sm:block">
          {formatDate(deed.updated_at || deed.created_at)}
        </span>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {deed.status === 'completed' && deed.pdf_url && (
            <button
              onClick={handleDownload}
              aria-label="Download deed PDF"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {/* FLOW1 item 2: the share icon that used to sit here is
              DELETED. It carried a Share2 glyph and the hover title
              "Share from Past Deeds", and it did not share — it routed
              to /past-deeds and left her to find the row again and press
              a different button. An icon that means "share" attached to
              an act that means "navigate" is the twins problem in
              miniature: the affordance and the outcome disagree.

              Deleted rather than wired up, per the ruling's "prefer
              deleting". Wiring it would mean mounting both share modals
              and a PartnersProvider on the dashboard — a third surface
              for two flows, on a page whose job is a glance. */}
          {needsAction && (
            <button
              onClick={() => router.push(`/deed-builder/${deed.deed_type || 'grant-deed'}?resume=${deed.id}`)}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors text-sm font-medium"
              title="Continue this draft"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
