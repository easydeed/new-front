"use client"

// F6: visual re-implementation from the V0 reference (temp-v0, reference
// only). Logic contracts preserved: auth check, ?registered banner + email
// prefill, ?redirect param, admin-role redirect, per-status error copy,
// AuthManager.setAuth storage. The demo-credentials card stays gated to
// development builds (the reference showed it unconditionally — that and
// its dropped admin redirect were bugs in the reference, not the design).
import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthManager } from "../../utils/auth"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Zap, Copy, Check, ShieldCheck } from "lucide-react"

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
    const email = "gerardoh@gmail.com"
    const password = "Test123!"
    setFormData({ email, password })

    const emailEl = document.getElementById("email") as HTMLInputElement
    const passEl = document.getElementById("password") as HTMLInputElement

    if (emailEl) {
      emailEl.value = email
      emailEl.dispatchEvent(new Event("change", { bubbles: true }))
    }
    if (passEl) {
      passEl.value = password
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
          <Link
            href="/register"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Don&apos;t have an account? <span className="text-brand-500">Sign up</span>
          </Link>
        </div>
      </header>

      {/* Centered form column */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              Sign in to continue creating recorder-ready deeds.
            </p>
          </div>

          {/* Main Login Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 space-y-5">
            {/* Success Message */}
            {successMessage && (
              <div className="flex items-start gap-3 p-3.5 bg-success-50 border border-success-500/20 rounded-lg animate-in slide-in-from-top duration-300">
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success-600 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-error-50 border border-error-500/20 rounded-lg animate-in slide-in-from-top duration-300">
                <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-600 font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
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
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
          </div>

          {/* Demo Credentials — dev only, collapsible */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDemo((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-left"
                aria-expanded={showDemo}
              >
                <span className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-brand-50 rounded-md flex items-center justify-center">
                    <Zap className="w-4 h-4 text-brand-500" />
                  </span>
                  <span className="text-sm font-semibold text-gray-900">Demo credentials</span>
                  <span className="text-xs text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">Dev only</span>
                </span>
                <span className="text-xs font-medium text-brand-500">{showDemo ? "Hide" : "Show"}</span>
              </button>

              {showDemo && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <code className="text-sm text-gray-900 font-mono">gerardoh@gmail.com</code>
                      <button
                        onClick={() => copyToClipboard("gerardoh@gmail.com", "email")}
                        className="text-gray-500 hover:text-brand-500 transition-colors"
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
                      <code className="text-sm text-gray-900 font-mono">Test123!</code>
                      <button
                        onClick={() => copyToClipboard("Test123!", "password")}
                        className="text-gray-500 hover:text-brand-500 transition-colors"
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
          )}

          {/* Trust footer */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Trusted by escrow &amp; title professionals
          </p>
        </div>
      </main>
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
