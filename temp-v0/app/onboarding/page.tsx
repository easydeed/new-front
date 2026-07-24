"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthManager } from "../../utils/auth"
import { ShieldCheck, MapPin, ArrowRight, Sparkles } from "lucide-react"

const CA_COUNTIES = [
  "Alameda",
  "Alpine",
  "Amador",
  "Butte",
  "Calaveras",
  "Colusa",
  "Contra Costa",
  "Del Norte",
  "El Dorado",
  "Fresno",
  "Glenn",
  "Humboldt",
  "Imperial",
  "Inyo",
  "Kern",
  "Kings",
  "Lake",
  "Lassen",
  "Los Angeles",
  "Madera",
  "Marin",
  "Mariposa",
  "Mendocino",
  "Merced",
  "Modoc",
  "Mono",
  "Monterey",
  "Napa",
  "Nevada",
  "Orange",
  "Placer",
  "Plumas",
  "Riverside",
  "Sacramento",
  "San Benito",
  "San Bernardino",
  "San Diego",
  "San Francisco",
  "San Joaquin",
  "San Luis Obispo",
  "San Mateo",
  "Santa Barbara",
  "Santa Clara",
  "Santa Cruz",
  "Shasta",
  "Sierra",
  "Siskiyou",
  "Solano",
  "Sonoma",
  "Stanislaus",
  "Sutter",
  "Tehama",
  "Trinity",
  "Tulare",
  "Tuolumne",
  "Ventura",
  "Yolo",
  "Yuba",
]

export default function OnboardingPage() {
  const router = useRouter()
  const [defaultCounty, setDefaultCounty] = useState("Los Angeles")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const persistCounty = async (payload: { default_county: string }) => {
    // Submit handler contract: { default_county }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/onboarding`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AuthManager.getToken() ? { Authorization: `Bearer ${AuthManager.getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
      },
    )
    return response
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await persistCounty({ default_county: defaultCounty })
      router.push("/create-deed")
    } catch (err) {
      // Non-blocking: still let the user get to their first deed
      console.error("Onboarding error:", err)
      router.push("/create-deed")
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push("/create-deed")
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col">
      {/* Top brand bar */}
      <header className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#7C4DFF] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#1F2B37]">DeedPro</span>
          </Link>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-[#6B7280] hover:text-[#1F2B37] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Centered single-step */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
          {/* Welcome */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C4DFF] bg-[#7C4DFF]/10 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to DeedPro
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F2B37] text-balance">
              One quick thing before your first deed
            </h1>
            <p className="text-[15px] text-[#6B7280] leading-relaxed">
              Pick the county you record in most often. We&apos;ll pre-select it every time you start a new deed — you
              can always change it later.
            </p>
          </div>

          {/* Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-7 space-y-5">
            {error && (
              <div className="p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-[#DC2626] text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="default_county" className="block text-sm font-semibold text-[#1F2B37]">
                Default county
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF] pointer-events-none" />
                <select
                  id="default_county"
                  name="default_county"
                  value={defaultCounty}
                  onChange={(e) => setDefaultCounty(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2B37] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all appearance-none"
                >
                  {CA_COUNTIES.map((county) => (
                    <option key={county} value={county}>
                      {county} County
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[#9CA3AF]">California counties shown. More states coming soon.</p>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7C4DFF] hover:bg-[#6B3FE6] text-white font-semibold py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:ring-offset-2 flex items-center justify-center gap-2"
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

            {/* Skip affordance */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm font-medium text-[#6B7280] hover:text-[#1F2B37] transition-colors"
            >
              I&apos;ll set this up later
            </button>
          </form>

          {/* Trust footer */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your preferences stay private to your workspace
          </p>
        </div>
      </main>
    </div>
  )
}
