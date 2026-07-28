"use client"

// Login refresh (owner request 2026-07-29): modern split-screen — form
// column left, brand panel right (hidden on mobile). Logic contracts
// unchanged from F6: auth check, ?registered banner + email prefill,
// ?redirect param, admin-role redirect, per-status error copy,
// AuthManager.setAuth storage, always-visible demo-credentials card
// (owner decision 2026-07-27; credentials updated 2026-07-29).
import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthManager } from "../../utils/auth"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Zap, Copy, Check, ShieldCheck, FileCheck2, Landmark, ScrollText } from "lucide-react"

const DEMO_EMAIL = "realty.reports@gmail.com"
const DEMO_PASSWORD = "Alpha637#"

function LoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showDemo, setShowDemo] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if already authenticated and handle registration success
  useEffect(() => {
    if (AuthManager.isAuthenticated()) {
      router.push("/dashboard")
      return
    }

    // Check for registration success message
    if (searchParams.get("registered") === "true") {
      const email = searchParams.get("email")
      setSuccessMessage(
        email
          ? `Account created successfully! Please log in with ${email}`
          : "Account created successfully! Please log in with your credentials",
      )
      if (email) {
        setFormData((prev) => ({ ...prev, email: decodeURIComponent(email) }))
      }
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password")
      return
    }

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        const token = data.access_token || data.token || data.jwt
        if (token) {
          AuthManager.setAuth(token, data.user)
        }
        setSuccessMessage("Login successful! Redirecting...")

        // Check if user is admin and redirect accordingly
        let redirectTo = searchParams.get("redirect") || "/dashboard"
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const role = (payload.role || '').toLowerCase().trim()
            const isAdmin = ['admin', 'administrator', 'superadmin', 'super_admin'].includes(role)
            if (isAdmin && !searchParams.get("redirect")) {
              redirectTo = "/admin"
            }
          } catch (e) {
            // Token decode failed, use default redirect
          }
        }
        setTimeout(() => router.push(redirectTo), 1000)
      } else if (response.status === 401) {
        setError("Invalid email or password. Please check your credentials and try again.")
      } else if (response.status === 429) {
        setError("Too many login attempts. Please wait a moment and try again.")
      } else if (response.status === 500) {
        setError("Server error. Please try again later or contact support.")
      } else {
        setError(`Login failed (${response.status}). Please try again.`)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Network error. Please check your internet connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDemoFill = () => {
    setFormData({ email: DEMO_EMAIL, password: DEMO_PASSWORD })

    const emailEl = document.getElementById("email") as HTMLInputElement
    const passEl = document.getElementById("password") as HTMLInputElement

    if (emailEl) {
      emailEl.value = DEMO_EMAIL
      emailEl.dispatchEvent(new Event("change", { bubbles: true }))
    }
    if (passEl) {
      passEl.value = DEMO_PASSWORD
      passEl.dispatchEvent(new Event("change", { bubbles: true }))
    }

    setSuccessMessage("Credentials filled! Click 'Sign in' above.")
    setError("")
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">

      {/* ── Form column ─────────────────────────────────────────── */}
      <div className="flex flex-col px-6 sm:px-12 py-8">
        {/* Brand row */}
        <Link href="/" className="flex items-center gap-2.5 self-start">
          <span className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand">
            <ShieldCheck className="w-5 h-5 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight text-gray-900">DeedPro</span>
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h1>
              <p className="text-[15px] text-gray-500 leading-relaxed">
                Sign in to continue creating recorder-ready deeds.
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="flex items-start gap-3 p-3.5 bg-success-50 border border-success-500/20 rounded-xl animate-in slide-in-from-top duration-300">
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success-600 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-error-50 border border-error-500/20 rounded-xl animate-in slide-in-from-top duration-300">
                <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-600 font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl shadow-brand hover:shadow-brand-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Demo Credentials — always shown, collapsible */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDemo((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={showDemo}
              >
                <span className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-brand-500" />
                  </span>
                  <span className="text-sm font-semibold text-gray-900">Demo credentials</span>
                </span>
                <span className="text-xs font-medium text-brand-500">{showDemo ? "Hide" : "Show"}</span>
              </button>

              {showDemo && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <code className="text-sm text-gray-900 font-mono">{DEMO_EMAIL}</code>
                      <button
                        onClick={() => copyToClipboard(DEMO_EMAIL, "email")}
                        className="text-gray-400 hover:text-brand-500 transition-colors"
                        aria-label="Copy email"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-4 h-4 text-success-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</p>
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <code className="text-sm text-gray-900 font-mono">{DEMO_PASSWORD}</code>
                      <button
                        onClick={() => copyToClipboard(DEMO_PASSWORD, "password")}
                        className="text-gray-400 hover:text-brand-500 transition-colors"
                        aria-label="Copy password"
                      >
                        {copiedField === "password" ? (
                          <Check className="w-4 h-4 text-success-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <Zap className="w-4 h-4" />
                    Fill login form
                  </button>
                </div>
              )}
            </div>

            {/* Sign-up link */}
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-brand-500 hover:text-brand-600 font-semibold transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </div>

        {/* Trust footer */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Trusted by escrow &amp; title professionals
        </p>
      </div>

      {/* ── Brand panel (desktop only) ───────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-500 to-brand-400 p-14 text-white relative overflow-hidden">
        {/* Decorative document silhouettes */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-[3rem] bg-white/10 rotate-12" aria-hidden="true" />
        <div className="absolute -right-10 top-40 w-72 h-96 rounded-[2rem] bg-white/10 -rotate-6" aria-hidden="true" />
        <div className="absolute right-24 -bottom-32 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />

        <div className="relative z-10" />

        <div className="relative z-10 max-w-md space-y-8">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Recorder-ready deeds in minutes.
          </h2>
          <ul className="space-y-4 text-[15px] text-white/90">
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-4 h-4" />
              </span>
              <span className="pt-1">Property data pulled straight from county records — you confirm every value.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <ScrollText className="w-4 h-4" />
              </span>
              <span className="pt-1">Statutory transfer-tax declarations and the &sect;1189 acknowledgment, built into every document.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </span>
              <span className="pt-1">Every PDF stored immutably and fingerprinted the moment it&apos;s generated.</span>
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/70">
          Built for California escrow &amp; title workflows.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
