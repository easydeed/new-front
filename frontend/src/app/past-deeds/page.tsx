"use client"

import type React from "react"
import { authoringStateLabel } from "@/lib/authoringState"
import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { FileText, Download, Share2, Trash2, AlertCircle, CheckCircle, Clock, X, Plus, Loader2, Search, CalendarClock } from "lucide-react"
import { RequestSigningModal } from "@/features/signing/RequestSigningModal"
import { signingRowAction } from "@/lib/signingRowAction"
import { ShareForReviewModal } from "@/features/signing/ShareForReviewModal"
import { PartnersProvider } from "@/features/partners/PartnersContext"
import { toast } from "sonner"
import { SessionExpiredError, apiFetch } from "@/lib/apiClient"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { deedTypeLabel } from "@/lib/deedTypes"
import { StaleCluster, nudgeSentence, staleClusters } from "@/lib/staleDrafts"

interface Deed {
  id: number
  property_address: string
  deed_type: string
  grantee_name?: string
  /** FORMS parties migration: single-party instruments (declaration
   * family) name their parties here; grantor/grantee stay empty. */
  parties?: Record<string, string | null> | null
  apn?: string
  status: "completed" | "draft" | "in_progress"
  created_at: string
  updated_at: string
  /** UX2 items 8/9 — set means put away, never deleted. */
  archived_at?: string | null
  pdf_url?: string
}

/** Row display for single-party instruments: the named parties, joined —
 * shown (and searched) where two-party rows show "To {grantee}". */
function partyNames(deed: Deed): string {
  return Object.values(deed.parties || {})
    .filter((v): v is string => !!v && !!v.trim())
    .join("; ")
}

/**
 * `useSearchParams()` opts a page out of static prerendering unless it
 * sits under a Suspense boundary, and Next fails the BUILD rather than
 * the render — jest and tsc stay green while the deploy does not. Second
 * time this ticket; the same boundary the admin, success and signings
 * pages already use.
 */
// ✅ PHASE 24-E: V0-generated Past Deeds page with all business logic preserved
export default function PastDeedsPageV0() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </main>
      </div>
    }>
      <PastDeedsList />
    </Suspense>
  )
}

function PastDeedsList() {
  const router = useRouter()
  const [deeds, setDeeds] = useState<Deed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // NOTARY1: which deed, if any, has an open signing-request modal.
  const [signingDeedId, setSigningDeedId] = useState<number | null>(null)
  // PARTNER2/B: and which has the review modal. Two states because two
  // actions; a single "which modal" enum would have been the toggle this
  // part exists to remove.
  const [reviewDeedId, setReviewDeedId] = useState<number | null>(null)
  /* CANCEL1 item 4 — WHICH DEEDS ALREADY HAVE A SIGNING OUT.
     The row offered "Request signing" on a deed that already had one
     pending, with nothing on screen to say so — so the officer's way of
     checking was to create a second request and find out. `live` is the
     server's verdict (services/signing_loop.is_live); this screen only
     joins it to the row. */
  const [liveSignings, setLiveSignings] = useState<Record<number, { id: number; summary: string }>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; deedId: number | null; deed?: Deed }>({
    isOpen: false,
    deedId: null,
  })
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  // X2.7: find a deed without scrolling — text search + status filter.
  const [searchQuery, setSearchQuery] = useState("")
  /**
   * DASH1 — THE DASHBOARD LINKS IN HERE, so the links have to land.
   *
   * Stat tiles are drill-downs now ("4 Drafts" → those drafts) and the
   * activity feed points at a specific deed. A link that arrives and
   * shows an unfiltered list is the dead-button defect wearing a URL:
   * the affordance promises a filtered view and the outcome is not one.
   *
   * `?status=` seeds the filter; `?focus=` highlights one row.
   */
  const params = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "draft" | "archived">(() => {
    const wanted = params?.get("status")
    return wanted === "completed" || wanted === "draft" || wanted === "archived"
      ? wanted : "all"
  })
  /* UX2 item 6 — carried from the partner row. The rolodex cannot pick
     a deed (there is none on that row, and guessing one would be the
     product choosing her document), so it carries the notary here and
     the deed is chosen where the deeds are. */
  const notaryFromPartner = params?.get("notary") || null
  /* DASH-FIX friction — "Last 30 days" linked HERE and arrived at the
     full list, so the tile counting 10 and the tile counting all 10 were
     the same click with the same outcome. This page's own docstring
     already names that: "a link that arrives and shows an unfiltered
     list is the dead-button defect wearing a URL".
     `?since=<days>` seeds a window, and the banner below says the list
     is windowed and offers the way out — a filter nobody can see is a
     list that looks broken. */
  const [sinceDays, setSinceDays] = useState<number | null>(() => {
    const raw = Number(params?.get("since"))
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null
  })
  /* UX2 items 8/9 — the nudge. The rule is lib/staleDrafts.ts so it can
     be asked a question; this screen only renders the answer. */
  const [archiving, setArchiving] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const clusters = staleClusters(deeds).filter((c) => !dismissed.includes(c.address))

  const archiveCluster = async (cluster: StaleCluster) => {
    setArchiving(true)
    try {
      // Sequential, and every failure surfaces. A partial archive that
      // reported success would leave her list disagreeing with what she
      // was told — the §4 case, on a bulk action.
      for (const draft of cluster.older) {
        const res = await apiFetch(`/deeds/${draft.id}/archive`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: true }) },
          { label: "Archiving" })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(String(body.detail || `Could not archive #${draft.id}`))
        }
      }
      toast.success(`Archived ${cluster.older.length} drafts. They are kept — filter to Archived to see them.`)
      await fetchDeeds()
    } catch (err) {
      if (err instanceof SessionExpiredError) return
      toast.error(err instanceof Error ? err.message : "Could not archive those drafts")
    } finally {
      setArchiving(false)
    }
  }
  const focusId = (() => {
    const raw = params?.get("focus")
    const id = raw ? Number(raw) : NaN
    return Number.isInteger(id) ? id : null
  })()

  /* Refetch when she switches to or from Archived: those rows are not
     in the default payload, so filtering client-side alone would show
     an empty Archived list on a page that has them. */
  useEffect(() => {
    fetchDeeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter === "archived"])

  const fetchDeeds = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/login?redirect=/past-deeds")
        return
      }

      // X1: apiFetch surfaces every failure (401 = session-expired redirect).
      /* UX2 items 8/9 — archived rows only when she asks for them. The
         promise archiving makes is "kept, not deleted", and a filter
         that cannot show them is a promise she has no way to check. */
      const response = await apiFetch(
        `/deeds${statusFilter === "archived" ? "?include_archived=true" : ""}`,
        {}, { label: "Loading deeds" })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `Failed to fetch deeds (${response.status})`)
      }

      const data = await response.json()
      setDeeds(Array.isArray(data) ? data : data.deeds || [])

      /* Best-effort and SILENT: a failed lookup here must not blank a
         page full of real deeds. The cost of missing it is that the row
         offers "Request signing" as it always did — the pre-CANCEL1
         behaviour — rather than a broken page. */
      try {
        const sr = await apiFetch(`/signing-requests/v2`, {},
                                  { label: "Loading signings", silent: true })
        if (sr.ok) {
          const rows = await sr.json()
          const byDeed: Record<number, { id: number; summary: string }> = {}
          for (const r of Array.isArray(rows) ? rows : []) {
            // `live` is the server's verdict. This screen holds no list
            // of which states are over — see signing_loop.is_live.
            if (r.live && !byDeed[r.deed_id]) {
              byDeed[r.deed_id] = { id: r.id, summary: r.summary }
            }
          }
          setLiveSignings(byDeed)
        }
      } catch { /* the row keeps its old behaviour; the page is fine */ }
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

  const handleDeleteClick = (deed: Deed) => {
    setDeleteConfirm({ isOpen: true, deedId: deed.id, deed })
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

    // DASH-FIX #3 — the labels moved to `lib/authoringState.ts`. This
    // map said "Completed" while the dashboard rendered the raw token
    // and the queue said the same document was waiting on a reply: two
    // surfaces, two vocabularies, neither citing the other.

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
        {status === "in_progress" && <Clock className="w-3.5 h-3.5" />}
        {authoringStateLabel(status)}
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
    if (statusFilter === "archived") return !!deed.archived_at
    if (deed.archived_at) return false
    if (statusFilter === "completed" && deed.status !== "completed") return false
    if (statusFilter === "draft" && deed.status === "completed") return false
    if (sinceDays !== null) {
      // A row we cannot date stays IN. Dropping it would let a missing
      // timestamp hide a deed she made, which is the more expensive
      // mistake of the two (§4, and `days_since`'s reasoning).
      const made = deed.created_at ? new Date(deed.created_at).getTime() : null
      if (made !== null && made < Date.now() - sinceDays * 86400_000) return false
    }
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return [
      deed.property_address,
      deed.grantee_name,
      partyNames(deed),
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
                {sinceDays !== null && (
                  /* The window, said out loud. A list silently showing a
                     subset is a list she reads as "where did my deeds
                     go" — and the way out is beside the statement rather
                     than in a URL she would have to know about. */
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    <span>Last {sinceDays} days</span>
                    <button
                      type="button"
                      onClick={() => setSinceDays(null)}
                      className="font-semibold underline underline-offset-2"
                    >
                      Show all
                    </button>
                  </div>
                )}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(
                    e.target.value as "all" | "completed" | "draft" | "archived")}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Drafts</option>
                  <option value="archived">Archived</option>
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
          {/* UX2 items 8/9 — THE NUDGE.

              Five drafts at one address is somebody trying the same
              conveyance five times. The product cannot know which one is
              current, so it says what it sees and offers the action
              rather than tidying up on her behalf — archiving the
              attempt she is working on is the one outcome that would
              make this worse than nothing, so the newest is never in the
              offer. */}
          {clusters.map((cluster) => (
            <div key={cluster.address} role="status"
                 className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">{nudgeSentence(cluster)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => archiveCluster(cluster)}
                  disabled={archiving}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-60"
                >
                  {archiving ? "Archiving…" : `Archive the ${cluster.older.length} older`}
                </button>
                <button
                  onClick={() => setDismissed([...dismissed, cluster.address])}
                  disabled={archiving}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-amber-300 text-amber-900 hover:bg-white disabled:opacity-60"
                >
                  Not now
                </button>
              </div>
            </div>
          ))}

          {/* UX2 item 6 — SHE ARRIVED FROM A PARTNER ROW, and the page
              says so. Landing on an unfiltered list with a modal that
              mysteriously knows a notary is the dead-button defect
              inverted: the outcome is right and the reason is absent. */}
          {notaryFromPartner && signingDeedId === null && (
            <div role="status"
                 className="mb-4 rounded-xl border border-[#7C4DFF]/30 bg-[#7C4DFF]/5 p-4 text-sm text-slate-700">
              Pick the deed you want signed — the notary you chose is
              already selected.
            </div>
          )}
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
                      {/* UX2 item 7 — "UPDATED" IS GONE.

                          Seven columns at px-6 made the table 1197px in
                          a 1150px viewport. `overflow-x-auto` was
                          already here, so Actions was not clipped — it
                          was off-screen behind a sideways scroll nothing
                          signalled, which is worse: a clipped control
                          looks broken, an absent one looks like it does
                          not exist.

                          Owner-ruled: actions stay visible, the
                          lowest-value column goes. `updated_at` is the
                          one, and not by elimination — it is on
                          `deed_activity.FORBIDDEN` with the reason "it
                          moves for reasons that are not events, so
                          ordering by it narrates writes rather than
                          acts". A column showing it invites exactly the
                          reading this codebase already ruled against.

                          Every other column undoes a prior decision:
                          X2.7 promoted Doc ID out of the address cell on
                          purpose, and Created is what orders the list. */}
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDeeds.map((deed, index) => (
                      <tr
                        key={deed.id}
                        // DASH1: the deed the dashboard sent her here for,
                        // marked. Landing on the right list and leaving her
                        // to find the row is half a link.
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          deed.id === focusId
                            ? "bg-violet-50 ring-2 ring-inset ring-[#7C4DFF]"
                            : index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <td className="py-4 px-6 font-mono text-sm text-slate-600">
                          {/* DEEDDETAIL: the id is the way in. Every row
                              here used to be a set of actions with no
                              document behind them — the deed page existed
                              at no URL, so "open this deed" was the one
                              thing this list could not do. */}
                          <Link href={`/deeds/${deed.id}`}
                                className="hover:underline hover:text-[#7C4DFF]">
                            #{deed.id}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          {/* U3: a row identifies its deed — address alone
                              can't when one property has several. */}
                          <Link href={`/deeds/${deed.id}`}
                                className="font-medium text-slate-800 hover:text-[#7C4DFF] hover:underline">
                            {deed.property_address}
                          </Link>
                          {deed.grantee_name ? (
                            <p className="text-sm text-slate-500">To {deed.grantee_name}</p>
                          ) : partyNames(deed) ? (
                            /* Single-party instruments have no grantee — the
                               row reads by its named parties instead. */
                            <p className="text-sm text-slate-500">{partyNames(deed)}</p>
                          ) : null}
                        </td>
                        <td className="py-4 px-6 text-slate-600">{deedTypeLabel(deed.deed_type)}</td>
                        <td className="py-4 px-6">
                          {getStatusBadge(deed.status)}
                          {liveSignings[deed.id] && (
                            /* The server's sentence, verbatim. This screen
                               does not describe a scheduling state — one
                               place turns state into English (§13 rule 3). */
                            <p className="text-xs text-slate-500 mt-1 max-w-[16rem]">
                              {liveSignings[deed.id].summary}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">{formatDate(deed.created_at)}</td>

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
                                  aria-label={`Download deed PDF for ${deed.property_address}`}
                                  className="p-2 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white rounded-lg transition-colors disabled:opacity-60"
                                  title="Download PDF"
                                >
                                  {downloadingId === deed.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                                {/* PARTNER2/B: two actions, because they ask
                                    two different questions. "Will you check
                                    this?" and "are you free on Tuesday?" have
                                    different recipients, different emails and
                                    different outcomes — and the generic Share
                                    button quietly meant "review" without ever
                                    saying so. `share_kind` is set by which
                                    button she pressed, never inferred. */}
                                {/* FLOW1 item 1 — THE TWINS GET LABELS.
                                    These were the same size, the same
                                    slate, adjacent, and distinguished
                                    only by `Share2` vs `CalendarClock`
                                    plus a `title` attribute that
                                    requires a hover. On a row of icon
                                    buttons, "the one that means signing"
                                    is not discoverable — it is
                                    remembered, and the owner remembered
                                    wrong, which is how a notary came to
                                    receive a reviewer's email.

                                    A tooltip is not a label. It is
                                    invisible until you already suspect
                                    you need it, and absent entirely on
                                    touch. The words are on the buttons
                                    now; the icons stay as recognition
                                    aids rather than as the only
                                    distinction. */}
                                <button
                                  onClick={() => setReviewDeedId(deed.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  <Share2 className="w-4 h-4 shrink-0" />
                                  <span className="whitespace-nowrap">Share for review</span>
                                </button>
                                {/* CANCEL1 item 4 — a deed with a signing
                                    already out says so, and the action
                                    OPENS it. Offering "Request signing"
                                    on a request that exists is an
                                    invitation to create a second one,
                                    which is three more emails and two
                                    notaries who each think they have it. */}
                                {(() => {
                                  /* The decision is `lib/signingRowAction`,
                                     not this ternary — see that file for
                                     why: a string-presence pin could not
                                     tell a reachable branch from a dead
                                     one, and stayed green with the whole
                                     feature disabled. */
                                  const action = signingRowAction(deed.id, liveSignings)
                                  return action.kind === 'open' ? (
                                    <button
                                      onClick={() => router.push(action.href)}
                                      aria-label={`Open the signing request for ${deed.property_address}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
                                    >
                                      <CalendarClock className="w-4 h-4 shrink-0" />
                                      <span className="whitespace-nowrap">{action.label}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setSigningDeedId(deed.id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                      <CalendarClock className="w-4 h-4 shrink-0" />
                                      <span className="whitespace-nowrap">{action.label}</span>
                                    </button>
                                  )
                                })()}
                              </>
                            )}
                            {/* UX2 item 2 — THE DESTRUCTIVE ONE IS SET APART.
                                It used to sit in the same `gap-2` run as
                                Download, same size, one hand-width from a
                                button that is safe to press twice. The
                                divider and the margin are not decoration:
                                adjacency is what makes a misclick cheap to
                                make and impossible to undo. */}
                            <span
                              aria-hidden="true"
                              className="mx-1 h-6 w-px bg-slate-200 shrink-0"
                            />
                            <button
                              onClick={() => handleDeleteClick(deed)}
                              aria-label={`Delete deed for ${deed.property_address}`}
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

      {/* PARTNER2/B: the inline share modal that used to live here is
          GONE, not kept alongside the new one. It asked for a typed
          email and a free-text role and produced a review share
          without saying so; leaving it would have meant two code
          paths creating the same kind of share with different
          wording, which is the divergence this ticket is deleting
          everywhere else. S1's honesty pins moved with it — see
          ShareForReviewModal and __tests__/honestShare.test.ts. */}

      {/* PARTNER2/B — the two share actions, each with its own modal.
          Both are wrapped in PartnersProvider so the recipient picker and
          its inline "add a new partner" reuse the EXISTING partner path
          rather than growing a fourth creation form — a fourth form is
          how the category lists diverged in the first place. */}
      {(signingDeedId !== null || reviewDeedId !== null) && (
        <PartnersProvider>
          {signingDeedId !== null && (() => {
            const deed = deeds.find((d) => d.id === signingDeedId);
            return (
              <RequestSigningModal
                deedId={signingDeedId}
                preselectNotaryId={notaryFromPartner}
                propertyAddress={deed?.property_address}
                // The deed's party NAMES seed the signer rows. Names only:
                // the deed has never held a way to reach anybody (§13.1)
                // and does not start now — she types the addresses.
                suggestedSigners={[deed?.grantee_name, ...Object.values(deed?.parties || {})]
                  .filter((n): n is string => !!n && !!n.trim())}
                onClose={() => setSigningDeedId(null)}
              />
            );
          })()}
          {reviewDeedId !== null && (
            <ShareForReviewModal
              deedId={reviewDeedId}
              onClose={() => setReviewDeedId(null)}
              // FLOW1 item 1: the interrupt's other half. Asking "did
              // you mean a signing?" and then making her close the modal,
              // find the row again and press the other button would be a
              // scolding rather than a suggestion.
              onSwitchToSigning={() => {
                setSigningDeedId(reviewDeedId);
                setReviewDeedId(null);
              }}
            />
          )}
        </PartnersProvider>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, deedId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Deed"
        /* UX2 item 2: the deed is NAMED. "this deed" is the same sentence
           on every row of a table of near-identical rows, which makes it
           the sentence a misclick reads straight past — it confirms that
           something is being deleted without ever confirming WHICH. */
        message={
          deleteConfirm.deed
            ? `Delete the ${deedTypeLabel(deleteConfirm.deed.deed_type)} for ${deleteConfirm.deed.property_address}? This cannot be undone.`
            : "Are you sure you want to delete this deed? This action cannot be undone."
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

