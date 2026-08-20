"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { getTimeGreeting } from "@/components/ui/AIGreeting"
import { AuthManager } from "@/utils/auth"
import EmailVerificationNotice from "@/features/account/EmailVerificationNotice"
import StartSomethingNew from "@/features/dashboard/StartSomethingNew"
import Worklist from "@/features/dashboard/Worklist"
import SetupChecklist, { activeStep } from "@/features/dashboard/SetupChecklist"
import DayOneRail from "@/features/dashboard/DayOneRail"
import { SessionExpiredError, apiFetch } from "@/lib/apiClient"
// The tile/feed icons went with the tiles and the feed.
import { Sparkles } from "lucide-react"

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
  /* Both added by the dashboard rebuild and both computed server-side:
     the hero number's two populations come from `required_fields.json`
     and a stored provenance block, and the instrument order comes from
     her own filing history. Neither is derivable here. */
  accuracy?: import('@/features/dashboard/AccuracySection').Accuracy;
  /* DASH3 — the rows the screen renders, and the count it prints.
     Both come from the server so the headline cannot disagree with the
     body it sits above. */
  worklist?: import('@/features/dashboard/Worklist').Worklist;
  instruments?: Array<{ deed_type: string; count: number; period: string }>;
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
  /* The accuracy block and the instrument list ride on the queue's one
     response (DASH1) — a second request would let the page render a
     partial truth when one of the two failed. */
  const [queueError, setQueueError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>("")
  // VERIFY-CHECK — this screen already fetches /users/profile, so saying
  // whether the address is confirmed costs one field and no request.
  const [account, setAccount] = useState<{ verified?: boolean; email?: string }>({})
  /* Undefined until /users/profile answers. The checklist is NOT rendered
     from a default of "nothing is set up" — that would tell a fully
     configured officer she has three things to do, for as long as the
     request takes. Same rule as the accuracy figure. */
  const [setup, setSetup] = useState<{
    county?: string | null; companyName?: string | null;
    businessAddress?: string | null; plan?: string | null; deedCount: number;
  } | null>(null)
  const [recentDeeds, setRecentDeeds] = useState<any[]>([])
  /* F4's ruling, and it needed rescuing during DASH3 rather than after:
     a failed `/deeds` load leaves `recentDeeds` empty, which makes
     `hasDeeds` false, which lands on "Nothing here yet." — a first-run
     welcome shown to an officer whose documents merely failed to load.
     That is the exact bug F4 fixed, and removing the renderer would have
     reintroduced it silently, because an error that renders nothing looks
     identical to a user who has nothing. §4: never swallowed. */
  const [deedsError, setDeedsError] = useState<string | null>(null)
  /* The greeting, demoted onto the headline. Kept — U3 ruled the page
     should say what it IS — but it no longer takes two lines above the
     work.

     Set in an effect, like `AIGreeting` does, because the hour is a
     CLIENT fact: computing it during render makes the server and the
     browser disagree whenever a deploy straddles noon.

     DECLARED WITH THE OTHER HOOKS, not beside the markup that uses it.
     I first wrote these two next to the headline they feed, which put
     them after `if (loading) return …` — so the first paint ran two
     fewer hooks than the second and React tears the component down the
     moment the profile answers. tsc is blind to it and the suites read
     source text rather than mounting through the transition; `eslint`'s
     rules-of-hooks is the control that sees it, which is the argument
     for running the linter as a gate and not as tidying. */
  const [greetingLine, setGreetingLine] = useState('')
  const router = useRouter()

  useEffect(() => {
    const when = new Date().toLocaleDateString(undefined,
      { weekday: 'long', month: 'long', day: 'numeric' })
    setGreetingLine(`${getTimeGreeting()}, ${userName} · ${when}`)
  }, [userName])

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
          setAccount({ verified: profileData.verified, email: profileData.email })
          /* The setup checklist's three signals, all of them already in
             this response — no second request and no new endpoint. The
             deed count is the server's, not `recentDeeds.length`, which
             is a page of the list rather than the whole of it. */
          setSetup({
            county: profileData.default_county,
            companyName: profileData.company_name,
            businessAddress: profileData.business_address,
            plan: profileData.plan,
            deedCount: Number(profileData.total_deeds) || 0,
          })

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

  /* The `/deeds/summary` fetch lived here and went with the tiles it
     fed — including its fallback, which re-requested the whole deed list
     to recompute four counters client-side. Nothing renders those
     counters now, so keeping the request would be two calls per load in
     support of a number nobody sees. DASH1's rolling-30-day ruling
     survives it only as a prohibition (no calendar-month counter comes
     back), which is pinned in `dashboardQueue.test.ts`. */

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
  /* U1.2's last-touched draft was the resume card's subject. The card
     is gone and the worklist decides what is next by consequence, so
     `pickInProgressDeed` has no caller HERE — it keeps its own tests and
     its other callers, and this is a removed call site, not a removed
     rule. */


  /* The rail exists to explain the steps, so it goes when they do —
     §13 rule 3: the page does not recompute "is setup finished", it
     asks the one function that decides which step is open. `activeStep`
     returning null IS "setup is done", and there is no second way to
     ask. */
  const setupIncomplete = !!setup && activeStep(setup) !== null

  /* DASH3 — the hero's unit is ROWS, and the server counts them.
     Read rather than derived: `worklist.count` is `hero_count(groups)`
     over the groups rendered below, so the headline and the body are
     the same arithmetic rather than two arithmetics that agree. */
  const worklist = queue?.worklist
  const worklistCount = worklist?.count ?? 0

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* VERIFY-CHECK — the one screen everybody lands on. It asks
              and offers; it withholds nothing, because nothing in this
              product is gated on the answer. */}
          <EmailVerificationNotice verified={account.verified} email={account.email} />

          {/* ═══ THE HEADLINE IS THE COUNT, AND THE GREETING RIDES ON IT ═══

              DASH3. The greeting took two lines of its own above a page
              of cards; it now sits to the right of the number, which is
              the thing she came for.

              THE NUMBER IS NOT COMPUTED HERE. `worklist.count` comes
              from the server, where `hero_count()` sums the same groups
              rendered below — so "3 things need you" and three rows
              cannot disagree. A hero that recounts client-side agrees by
              diligence; this one agrees by construction.

              AND IT NEVER RENDERS A FIGURE IT DID NOT RECEIVE: until the
              queue lands, the headline says what it is doing rather than
              showing a zero that would read as "you're clear". */}
          <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
              {queueError
                ? "Your queue didn't load"
                : !queue
                  ? 'Loading your queue…'
                  : worklistCount === 0
                    ? "You're clear"
                    : worklistCount === 1
                      ? '1 thing needs you'
                      : `${worklistCount} things need you`}
            </h1>
            <p className="ml-auto text-[13px] text-gray-400">
              {greetingLine}
            </p>
          </div>

          {/* ═══ FINISH SETTING UP ═══

              Where the welcome card and its four bullets used to be, and
              the shape its removal argued for: a list derived from state
              rather than a banner. It renders nothing once the three are
              done, and nothing at all until the profile has answered. */}
          {setup && (
            <div className="mb-6 grid gap-4 lg:grid-cols-[2fr,1fr] items-start">
              {/* The step carries its own destination, so the page does
                  not hold a second opinion about where "Add address"
                  goes. Invented routes in the reference set —
                  /settings/company, /settings/county, /settings/address,
                  /deeds/new — are corrected at the source rather than
                  translated here. */}
              <SetupChecklist state={setup} onAct={(_id, href) => router.push(href)} />
              {setupIncomplete && (
                <DayOneRail
                  companyName={setup.companyName}
                  businessAddress={setup.businessAddress}
                  county={setup.county}
                  plan={setup.plan}
                  onSeePlans={() => router.push('/pricing')}
                />
              )}
            </div>
          )}

          {/* ═══ START SOMETHING NEW, AS A CHIP STRIP ═══
              Above the divider, so it reads as "jump in, or clear your
              queue" rather than as a panel competing with the work. */}
          <StartSomethingNew
            instruments={queue?.instruments}
            onStart={(t) => router.push(`/deed-builder/${t}`)}
            onBrowse={() => router.push('/create-deed')}
          />

          {/* ═══ THE QUEUE IS THE WHOLE BODY ═══

              WHAT WAS REMOVED HERE, and each was ruled: the four stat
              tiles (counts now live in each group header, in the same
              unit as the hero); the green Create New Deed bar (the chip
              strip and the sidebar carry it); "Recently worked on" (every
              row read *Prepared* — it is the Past Deeds link now); the
              green all-clear banner and the three-column "What's waiting"
              split, both folded into the queue.

              THE RESUME CARD WENT WITH THEM, and that is #203's ruling
              surviving its source rather than being dropped: it ruled
              the resume target is the accuracy list's FIRST ROW, because
              that list was what existed. With rows as the unit, the
              first your-turn row IS the resume — same intent, new home,
              and it is now one press instead of a card above the work.

              THREE RESULTS, NOT TWO. A failed load, an empty board and a
              first morning are different things and say so — collapsing
              the last two would reverse #206, which is why
              `open_documents` exists. */}
          {queueError ? (
            <div role="alert"
                 className="rounded-2xl border border-red-200 bg-white p-6 text-center">
              <p className="font-medium text-red-700">Couldn&apos;t load your queue</p>
              <p className="mt-1 text-sm text-gray-500">{queueError}</p>
            </div>
          ) : !queue ? (
            /* NOT an empty state. The queue has not answered yet, and
               rendering "you're clear" here would be a claim we do not
               have — §4 in the one place a reader would never question
               it. */
            <p className="px-1 py-8 text-sm text-gray-400">Loading what needs you…</p>
          ) : worklistCount > 0 ? (
            <>
              <Worklist worklist={worklist} onOpen={(href) => router.push(href)} />
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border
                              border-dashed border-gray-200 bg-white px-4 py-3.5 text-[13px]
                              text-gray-500">
                <b className="font-semibold text-gray-700">That&apos;s everything.</b>
                <button type="button" onClick={() => router.push('/past-deeds')}
                        className="ml-auto font-semibold text-[var(--color-brand)]
                                   underline-offset-2 hover:underline">
                  Past deeds →
                </button>
              </div>
            </>
          ) : deedsError ? (
            /* A FAILED LIST IS NOT AN EMPTY ONE (F4). Ordered above both
               empty results deliberately: "clear" and "day one" are
               claims about her documents, and we do not know what her
               documents are. */
            <div role="alert"
                 className="rounded-2xl border border-red-200 bg-white p-6 text-center">
              <p className="font-medium text-red-700">Couldn&apos;t load your deeds</p>
              <p className="mt-1 text-sm text-gray-500">{deedsError}</p>
              <button type="button" onClick={() => fetchRecentDeeds()}
                      className="mt-4 text-[13px] font-semibold text-[var(--color-brand)]
                                 underline-offset-2 hover:underline">
                Try again
              </button>
            </div>
          ) : hasDeeds ? (
            /* CLEAR — a RESULT. She has documents and none of them needs
               her, which is a good morning and is said out loud rather
               than left as a blank page she has to interpret. */
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center
                              rounded-full bg-[var(--color-brand-light)]
                              text-[var(--color-brand)]">✓</div>
              <h3 className="text-lg font-bold tracking-tight text-gray-900">
                Nothing needs you.
              </h3>
              <p className="mt-1 text-[13.5px] text-gray-500">
                No document is waiting on you, and nobody is waiting on a reply.
              </p>
              <button type="button" onClick={() => router.push('/past-deeds')}
                      className="mt-4 text-[13px] font-semibold text-[var(--color-brand)]
                                 underline-offset-2 hover:underline">
                Past deeds →
              </button>
            </div>
          ) : (
            /* DAY ONE — a DIFFERENT result, and the distinction is #206's.
               She has made nothing, so there is nothing to be clear of;
               the checklist is the work. */
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">
                Nothing here yet.
              </h3>
              <p className="mt-1 text-[13.5px] text-gray-500">
                Your first document will appear here, with whatever it still needs.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

/* ═══ §16 — WHAT WAS REMOVED WITH THE LAYOUT, AND WHAT SURVIVED ═══
 *
 * `ActionQueue`, `QueueList`, `StatCard` and `DeedRow` lived here. Their
 * render sites went when the worklist became the body; the renderers did
 * not, and for one build this file held two dashboards — one reachable,
 * one not. Nothing failed: tsc does not flag an unreferenced function and
 * the suites only assert what renders. §14.5 again, in its own file:
 * checking that a change is right is not checking what depended on it.
 *
 * The rulings those modules carried did not go with them:
 *   · THE QUEUE LEADS — satisfied maximally; there is nothing left for it
 *     to lead. Pinned now as "the worklist IS the body".
 *   · EVERY COUNT GOES SOMEWHERE — moved to the group header's
 *     `N recorded` button, which is a real drill-down.
 *   · THE EMPTY STATE IS A RESULT — kept, as three explicit branches
 *     below rather than one collapsed absence.
 *   · ABSENCES NAMED BY KIND, "Prepared" not "Completed", stuck-marking,
 *     the hero never rendering a figure it did not receive — all kept,
 *     server-side in `services/worklist.py`.
 *
 * One did NOT survive, and is reported rather than dropped quietly:
 *   · THE FEED'S LAST-TOUCHED ORDERING (DASH1). "Recently worked on" is
 *     gone, so an ordering rule for it has no subject. It is not
 *     re-homed onto the worklist — the worklist orders by consequence,
 *     which is a different rule that would swallow it while looking like
 *     compliance. Recorded here so the removal is a decision on the
 *     record and not an omission.
 */
