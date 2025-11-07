"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2, Zap, Shield } from "lucide-react"

const states = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

const roles = [
  "Escrow Officer",
  "Title Agent",
  "Real Estate Agent",
  "Real Estate Broker",
  "Attorney",
  "Paralegal",
  "Administrative Assistant",
  "Other",
]

const companyTypes = ["Independent Escrow Company", "Title Company", "Real Estate Brokerage", "Law Firm", "Other"]

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "",
    companyName: "",
    companyType: "",
    phone: "",
    state: "",
    agreeTerms: false,
    subscribe: false,
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Email: Required, valid format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!formData.email) {
      errors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Password: 8+ chars, uppercase, lowercase, number
    if (!formData.password) {
      errors.password = "Password is required"
    } else {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters long"
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        errors.password = "Password must contain at least one lowercase letter"
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = "Password must contain at least one uppercase letter"
      } else if (!/(?=.*\d)/.test(formData.password)) {
        errors.password = "Password must contain at least one number"
      }
    }

    // Confirm Password: Must match
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    // Required text fields
    if (!formData.fullName) errors.fullName = "Full name is required"
    if (!formData.role) errors.role = "Role is required"
    if (!formData.state) errors.state = "State is required"

    // Terms checkbox
    if (!formData.agreeTerms) {
      errors.agreeTerms = "You must agree to the terms and conditions"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      setError("Please fix the errors below")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            confirm_password: formData.confirmPassword,
            full_name: formData.fullName,
            role: formData.role,
            company_name: formData.companyName || null,
            company_type: formData.companyType || null,
            phone: formData.phone || null,
            state: formData.state,
            agree_terms: formData.agreeTerms,
            subscribe: formData.subscribe,
          }),
        },
      )

      if (response.ok) {
        router.push(`/login?registered=true&email=${encodeURIComponent(formData.email)}`)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || "Registration failed. Please try again.")
      }
    } catch (err) {
      setError("Registration failed. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const getPasswordStrength = () => {
    const password = formData.password
    if (!password) return { strength: 0, label: "", color: "" }

    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" }
    if (strength <= 3) return { strength, label: "Fair", color: "bg-yellow-500" }
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" }
    return { strength, label: "Strong", color: "bg-green-500" }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-[#1F2B37]">
            DeedPro
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#1F2B37] mb-3">Join DeedPro Today</h1>
            <p className="text-lg text-gray-600">Start creating professional deeds in seconds</p>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${
                    validationErrors.email ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all`}
                  placeholder="you@company.com"
                />
                {validationErrors.email && <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${
                        validationErrors.password ? "border-red-500" : "border-gray-300"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all pr-12`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
                      </div>
                    </div>
                  )}
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${
                        validationErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all pr-12`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${
                    validationErrors.fullName ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all`}
                  placeholder="John Smith"
                />
                {validationErrors.fullName && <p className="mt-1 text-sm text-red-500">{validationErrors.fullName}</p>}
              </div>

              {/* Role & State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    Professional Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${
                      validationErrors.role ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all bg-white`}
                  >
                    <option value="">Select your role</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {validationErrors.role && <p className="mt-1 text-sm text-red-500">{validationErrors.role}</p>}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${
                      validationErrors.state ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all bg-white`}
                  >
                    <option value="">Select your state</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.state && <p className="mt-1 text-sm text-red-500">{validationErrors.state}</p>}
                </div>
              </div>

              {/* Company Name & Company Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    Company Name <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
                    placeholder="Your Company LLC"
                  />
                </div>

                <div>
                  <label htmlFor="companyType" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                    Company Type <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <select
                    id="companyType"
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Select company type</option>
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[#1F2B37] mb-2">
                  Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-[#7C4DFF] border-gray-300 rounded focus:ring-[#7C4DFF] focus:ring-2"
                  />
                  <label htmlFor="agreeTerms" className="ml-3 text-sm text-gray-700">
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#7C4DFF] hover:underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#7C4DFF] hover:underline font-medium">
                      Privacy Policy
                    </Link>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                </div>
                {validationErrors.agreeTerms && (
                  <p className="ml-7 text-sm text-red-500">{validationErrors.agreeTerms}</p>
                )}

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="subscribe"
                    name="subscribe"
                    checked={formData.subscribe}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-[#7C4DFF] border-gray-300 rounded focus:ring-[#7C4DFF] focus:ring-2"
                  />
                  <label htmlFor="subscribe" className="ml-3 text-sm text-gray-700">
                    Send me product updates and tips via email
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7C4DFF] text-white font-semibold py-4 rounded-lg hover:bg-[#6A3FE8] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7C4DFF]/20"
              >
                {loading ? "Creating Account..." : "Create My Account"}
              </button>

              {/* Sign In Link */}
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-[#7C4DFF] hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </form>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
              <h3 className="font-bold text-[#1F2B37] mb-2">Free to Start</h3>
              <p className="text-sm text-gray-600">No credit card required. Start creating deeds immediately.</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-[#7C4DFF]" size={24} />
              </div>
              <h3 className="font-bold text-[#1F2B37] mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-600">Generate professional deeds in seconds with AI assistance.</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h3 className="font-bold text-[#1F2B37] mb-2">Secure & Compliant</h3>
              <p className="text-sm text-gray-600">Bank-level security with state-specific compliance built in.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          © 2025 DeedPro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
