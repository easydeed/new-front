"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, MapPin, ArrowRight } from "lucide-react"

// California counties for the dropdown
const CA_COUNTIES = [
  "Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa", "Del Norte",
  "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake",
  "Lassen", "Los Angeles", "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc",
  "Mono", "Monterey", "Napa", "Nevada", "Orange", "Placer", "Plumas", "Riverside", "Sacramento",
  "San Benito", "San Bernardino", "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo",
  "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra", "Siskiyou",
  "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare", "Tuolumne",
  "Ventura", "Yolo", "Yuba"
]

/**
 * Single-question onboarding (F3). Name and role are collected at signup —
 * the only thing worth asking here is the default county, and it persists
 * server-side via PATCH /users/profile so the completion gate is server
 * truth, never a localStorage-only flag (bugs #9/#10).
 */
export default function OnboardingPage() {
  const router = useRouter()
  const [county, setCounty] = useState("Los Angeles")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const saveProfile = async (body: { default_county?: string; onboarding_completed: boolean }) => {
    const token = localStorage.getItem("access_token")
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/profile`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.detail || `Save failed (${response.status})`)
    }
  }

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

  const handleSkip = async () => {
    // Skip still records completion server-side so the dashboard gate stops
    // re-prompting; if the save fails, this device passes via localStorage
    // and a fresh device gets asked again — which is the honest outcome.
    try {
      await saveProfile({ onboarding_completed: true })
    } catch {
      // non-blocking: skip means "get me out of here"
    }
    localStorage.setItem("onboarding_completed", "true")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DP</span>
            </div>
            <span className="font-bold text-gray-900">DeedPro</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-emerald-800 mb-1">Welcome to DeedPro!</h1>
                <p className="text-emerald-700">
                  One quick question and you&apos;re in: which county do you work in most often?
                  We&apos;ll use it as your default.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              <MapPin className="w-5 h-5 inline mr-2 text-gray-400" />
              Default County
            </label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            >
              {CA_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {county === "Los Angeles" && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>💡 Tip:</strong> Los Angeles has both county ($1.10/1000) and city
                  transfer taxes. We&apos;ll help you calculate the right amount for each property.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-8">
            <button
              onClick={() => handleComplete("/deed-builder")}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              {loading ? "Saving..." : "Take me to my first deed"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleComplete("/dashboard")}
              disabled={loading}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-3 transition-colors disabled:opacity-60"
            >
              Take me to my dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
