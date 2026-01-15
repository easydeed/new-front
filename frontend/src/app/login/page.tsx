"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthManager } from "../../utils/auth"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Zap, Copy, Check } from "lucide-react"

function LoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
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
        const redirectTo = searchParams.get("redirect") || "/dashboard"
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

    setSuccessMessage("Credentials filled! Click 'Sign In' above.")
    setError("")
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-[#1F2B37] tracking-tight">DeedPro</h1>
          </Link>
          <h2 className="text-2xl font-bold text-[#1F2B37]">Welcome Back</h2>
          <p className="text-[#6B7280]">Sign in to your account to continue</p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-3 p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg animate-in slide-in-from-top duration-300">
              <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#10B981] font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg animate-in slide-in-from-top duration-300">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#EF4444] font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-[#1F2B37]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2B37] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-[#1F2B37]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2B37] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2B37] transition-colors"
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
              className="w-full bg-[#7C4DFF] hover:bg-[#6B3FE6] text-white font-semibold py-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7C4DFF]/20 hover:shadow-xl hover:shadow-[#7C4DFF]/30"
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
                "Sign In"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-[#7C4DFF] hover:text-[#6B3FE6] font-medium transition-colors">
              Forgot password?
            </Link>
            <Link href="/register" className="text-[#6B7280] hover:text-[#1F2B37] font-medium transition-colors">
              Don't have an account? <span className="text-[#7C4DFF]">Sign up</span>
            </Link>
          </div>
        </div>

        {/* Demo Credentials Card - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#7C4DFF]/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#7C4DFF]" />
              </div>
              <h3 className="font-bold text-[#1F2B37]">Demo Credentials</h3>
              <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Dev only</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Email</p>
                <div className="flex items-center justify-between gap-2 p-3 bg-[#F9F9F9] rounded-lg border border-[#E5E7EB]">
                  <code className="text-sm text-[#1F2B37] font-mono">gerardoh@gmail.com</code>
                  <button
                    onClick={() => copyToClipboard("gerardoh@gmail.com", "email")}
                    className="text-[#6B7280] hover:text-[#7C4DFF] transition-colors"
                    aria-label="Copy email"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Password</p>
                <div className="flex items-center justify-between gap-2 p-3 bg-[#F9F9F9] rounded-lg border border-[#E5E7EB]">
                  <code className="text-sm text-[#1F2B37] font-mono">Test123!</code>
                  <button
                    onClick={() => copyToClipboard("Test123!", "password")}
                    className="text-[#6B7280] hover:text-[#7C4DFF] transition-colors"
                    aria-label="Copy password"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full bg-[#1F2B37] hover:bg-[#374151] text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Fill Login Form
            </button>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1F2B37] font-medium transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#7C4DFF] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
