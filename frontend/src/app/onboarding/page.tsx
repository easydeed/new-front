"use client"

// F6: visual re-implementation from the V0 reference (temp-v0, reference
// only). F3 logic contracts preserved: county persists via
// PATCH /users/profile (the reference POSTed to a nonexistent
// /users/onboarding and swallowed failures — bugs in the reference),
// save errors keep the user on the page, skip records completion
// server-side, and the builder route is /deed-builder.
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, MapPin, ArrowRight, Sparkles } from "lucide-react"

// T-2's registry owns place identity, and now the county NAMES too:
// this was a local 58-element array until account-settings grew the
// second picker (DASH-FIX #1). One declaration, not one screen.
import { CA_COUNTY_NAMES } from "@/lib/jurisdictions"
import { saveProfile } from "@/lib/profileSave"

export default function OnboardingPage() {
  const router = useRouter()
  const [county, setCounty] = useState("Los Angeles")
  const [loading, setLoading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  // Set when the skip could not be recorded — she is told before
  // the navigation, because the consequence lands on another day.
  const [skipNotice, setSkipNotice] = useState(false)
  const [error, setError] = useState("")

  /**
   * ═══ THE ROUTE GUARD THIS PAGE NEVER HAD ═══
   *
   * Found by the HX0 sweep going red during an unrelated refactor, and
   * the way it was found is the finding.
   *
   * `routeGuards.test.ts` detects a guard by looking for one of four
   * strings in the file, one of which is
   * `localStorage.getItem("access_token")`. This page contained that
   * string — INSIDE the save function, reading a token to send it — and
   * so counted as guarded for as long as the save was written inline.
   * Moving the save into `lib/profileSave.ts` took the string with it
   * and the sweep immediately said what had always been true: there was
   * no guard here at all.
   *
   * A logged-out visitor could open the first screen a new customer
   * sees, choose a county, press Finish, and learn only then that
   * nothing had been saved — because the API refused a bearer token
   * reading `null`. Not a data exposure; the server was never fooled.
   * A late, confusing failure on the page least able to afford one.
   *
   * §14.1.1's silent half, in a security sweep: a pin matching a string
   * rather than the property CERTIFIED the gap it was meant to close.
   */
  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login?redirect=/onboarding")
    }
  }, [router])

  /**
   * SETTINGS1 — RETRY, because the first thing anybody does in this
   * product is the thing we least want to lose.
   *
   * The audit saw this PATCH return 503. A single attempt against a
   * service that cold-starts is a coin flip at the worst possible
   * moment, so it is attempted twice with a pause between.
   *
   * Retrying is asking again, not deciding: a failure that survives both
   * attempts is REPORTED, never swallowed.
   */
  /* The retry that used to live here moved to `lib/profileSave.ts`.
     It was written for this page and account-settings never got it —
     same endpoint, same payload, one tolerant of a sleeping server and
     the other not, neither knowing the other existed. §14.3: one
     declaration, not one screen. */

  const handleComplete = async (destination: string) => {
    setLoading(true)
    setError("")
    try {
      await saveProfile({ default_county: county, onboarding_completed: true })
      localStorage.setItem("onboarding_completed", "true")
      localStorage.setItem("default_county", county)
      router.push(destination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your county. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleComplete("/deed-builder")
  }

  const handleSkip = async () => {
    /**
     * SETTINGS1 — SKIP MAY LEAVE, BUT IT MAY NOT LIE.
     *
     * This swallowed the failure entirely. The comment called that "the
     * honest outcome" because a fresh device would ask again — but that
     * describes the SYSTEM's state, not what the person knows. What
     * actually happened: `onboarding_completed` stayed false, the
     * dashboard gate re-fired, and she was returned to onboarding
     * forever with no indication why.
     *
     * A trap loop, and worse than a lost field: a lost field is noticed
     * once, a loop is noticed every time and explains itself never.
     *
     * Skipping still navigates — "skip" means get me out of here, and
     * holding her hostage to our own 503 would be a second failure on
     * top of the first. But she is TOLD, so a repeat prompt is a thing
     * she was warned about rather than a product that will not let her
     * past.
     */
    setSkipping(true)
    try {
      await saveProfile({ onboarding_completed: true })
    } catch {
      setSkipNotice(true)
      // Long enough to read before the page changes under her.
      await new Promise((r) => setTimeout(r, 2600))
    } finally {
      setSkipping(false)
    }
    localStorage.setItem("onboarding_completed", "true")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top brand bar */}
      <header className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">DeedPro</span>
          </Link>
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-60"
          >
            {skipping ? "Skipping…" : "Skip for now"}
          </button>
        </div>
        {/* SETTINGS1: the skip was not recorded. She is told BEFORE the
            navigation, because the consequence — being asked again —
            arrives on a different day and would otherwise look like the
            product refusing to let her past. */}
        {skipNotice && (
          <div className="max-w-6xl mx-auto mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            We could not record that you skipped setup, so you may be asked
            again next time you sign in. Taking you to your dashboard now.
          </div>
        )}
      </header>

      {/* Centered single-step */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
          {/* Welcome */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 bg-brand-50 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to DeedPro
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              One quick thing before your first deed
            </h1>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              Pick the county you record in most often. We&apos;ll use it as your default — you can
              always change it later.
            </p>
          </div>

          {/* Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 space-y-5">
            {error && (
              <div className="p-3.5 bg-error-50 border border-error-500/20 rounded-lg text-error-600 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="default_county" className="block text-sm font-semibold text-gray-900">
                Default county
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  id="default_county"
                  name="default_county"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none"
                >
                  {CA_COUNTY_NAMES.map((c) => (
                    <option key={c} value={c}>
                      {c} County
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400">California counties shown. More states coming soon.</p>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Setting up...
                </span>
              ) : (
                <>
                  Take me to my first deed
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Secondary: save the county but land on the dashboard */}
            <button
              type="button"
              onClick={() => handleComplete("/dashboard")}
              disabled={loading}
              className="w-full text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-60"
            >
              Save and take me to my dashboard
            </button>
          </form>

          {/* Trust footer */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your preferences stay private to your workspace
          </p>
        </div>
      </main>
    </div>
  )
}
