"use client"

// F6: visual re-implementation from the V0 reference (temp-v0, reference
// only). Logic contracts preserved: every field, validation rule, and the
// F2 auto-login success handler (the reference still had the old
// redirect-to-login flow — a bug in the reference, not a design choice).
import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { LogoLockup } from "@/components/brand/Logo"
import { AuthManager } from "@/utils/auth"

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
        // F2: register now returns a session token (same claims as login) —
        // store it exactly like login does and land in the app signed in.
        const data = await response.json()
        const token = data.access_token
        if (token) {
          AuthManager.setAuth(token, data.user)
          router.push("/dashboard")
        } else {
          // Backend without F2 yet: fall back to the old login hand-off.
          router.push(`/login?registered=true&email=${encodeURIComponent(formData.email)}`)
        }
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

    if (strength <= 2) return { strength, label: "Weak", color: "bg-error-500" }
    if (strength <= 3) return { strength, label: "Fair", color: "bg-warning-500" }
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" }
    return { strength, label: "Strong", color: "bg-success-500" }
  }

  const passwordStrength = getPasswordStrength()

  const inputBase =
    "w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top brand bar */}
      <header className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <LogoLockup size={30} />
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Already have an account? <span className="text-brand-500">Sign in</span>
          </Link>
        </div>
      </header>

      {/* Centered form column */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-6 animate-in fade-in duration-500">
          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              Set up your workspace to start generating recorder-ready deeds.
            </p>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
            {error && (
              <div className="mb-6 p-3.5 bg-error-50 border border-error-500/20 rounded-lg text-error-600 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
                  Email address <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputBase} ${validationErrors.email ? "border-error-500" : "border-gray-200"}`}
                  placeholder="you@company.com"
                />
                {validationErrors.email && <p className="mt-1 text-sm text-error-500">{validationErrors.email}</p>}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
                    Password <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${inputBase} pr-12 ${
                        validationErrors.password ? "border-error-500" : "border-gray-200"
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                        <span className="text-xs font-medium text-gray-500">{passwordStrength.label}</span>
                      </div>
                    </div>
                  )}
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-error-500">{validationErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900">
                    Confirm password <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`${inputBase} pr-12 ${
                        validationErrors.confirmPassword ? "border-error-500" : "border-gray-200"
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-error-500">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900">
                  Full name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`${inputBase} ${validationErrors.fullName ? "border-error-500" : "border-gray-200"}`}
                  placeholder="John Smith"
                />
                {validationErrors.fullName && <p className="mt-1 text-sm text-error-500">{validationErrors.fullName}</p>}
              </div>

              {/* Role & State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="role" className="block text-sm font-semibold text-gray-900">
                    Professional role <span className="text-error-500">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`${inputBase} bg-white ${
                      validationErrors.role ? "border-error-500" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select your role</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {validationErrors.role && <p className="mt-1 text-sm text-error-500">{validationErrors.role}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="state" className="block text-sm font-semibold text-gray-900">
                    State <span className="text-error-500">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`${inputBase} bg-white ${
                      validationErrors.state ? "border-error-500" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select your state</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.state && <p className="mt-1 text-sm text-error-500">{validationErrors.state}</p>}
                </div>
              </div>

              {/* Company Name & Company Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900">
                    Company name <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`${inputBase} border-gray-200`}
                    placeholder="Your Company LLC"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyType" className="block text-sm font-semibold text-gray-900">
                    Company type <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <select
                    id="companyType"
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className={`${inputBase} bg-white border-gray-200`}
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
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-900">
                  Phone number <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`${inputBase} border-gray-200`}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-1">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-brand-500 border-gray-200 rounded focus:ring-brand-500 focus:ring-2"
                  />
                  <label htmlFor="agreeTerms" className="ml-3 text-sm text-gray-700">
                    I agree to the{" "}
                    <Link href="/terms" className="text-brand-500 hover:underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-brand-500 hover:underline font-medium">
                      Privacy Policy
                    </Link>
                    <span className="text-error-500 ml-1">*</span>
                  </label>
                </div>
                {validationErrors.agreeTerms && (
                  <p className="ml-7 text-sm text-error-500">{validationErrors.agreeTerms}</p>
                )}

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="subscribe"
                    name="subscribe"
                    checked={formData.subscribe}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-brand-500 border-gray-200 rounded focus:ring-brand-500 focus:ring-2"
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
                className="w-full bg-brand-500 text-white font-semibold py-3.5 rounded-lg hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {loading ? "Creating account..." : "Create my account"}
              </button>

              {/* Sign In Link */}
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-brand-500 hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </form>
          </div>

          {/* Trust footer — RED-H1.1.
              Was: "Bank-level security · State-specific compliance built in".
              "Bank-level security" is an unearned security claim of exactly
              the kind the standing rule bans, and "compliance built in"
              implied a certification nobody holds. What replaces them is
              what the product actually does: California templates and a
              per-field confirmation record. Both are checkable. */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            California recorder-formatted deeds &middot; every field confirmed before it prints
          </p>
        </div>
      </main>
    </div>
  )
}
