"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Send } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      )

      if (response.ok) {
        setMessage("Password reset link sent to your email!")
      } else if (response.status === 404) {
        setError("Email address not found")
      } else {
        setError("Error sending reset link. Please try again.")
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1F2B37] mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your email address and we'll send you a reset link</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#10B981] font-medium">{message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg">
              <p className="text-sm text-[#EF4444] font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7C4DFF] text-white font-semibold py-4 rounded-lg hover:bg-[#6A3FE8] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Reset Link
                </>
              )}
            </button>

            {/* Back to Login */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-[#7C4DFF] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center mt-6 text-gray-600">
          Remember your password?{" "}
          <Link href="/login" className="text-[#7C4DFF] hover:text-[#6A3FE8] font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
