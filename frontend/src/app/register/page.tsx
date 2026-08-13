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

/* SIGNUP1 — THE FIFTY-STATE LIST IS GONE.
   The catalog, the chassis, the DTT rate registry and every county form
   in this product are California by construction: 58 California
   counties, California code sections, California transfer tax. Fifty
   options was a promise broken the moment somebody in Arizona
   registered and found no Arizona forms.
   Owner-ruled: California, displayed rather than chosen. The state now
   lives in lib/registerForm.ts as a VALUE, not a default. */

import { maskUS, normalizePhone } from "@/lib/phone"
import {
  FieldErrors, OTHER, SERVED_STATE_NAME, fieldProps, registrationPayload,
  revealedBy, validate,
} from "@/lib/registerForm"

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
    companyTypeOther: "",
    roleOther: "",
    phone: "",
    interestState: "",
    agreeTerms: false,
  })
  /* Validation used to fire ONLY on submit, so every mistake was
     discovered at the end, all at once, after the work. A field that has
     been visited and left is a field she is done with — that is the
     moment to answer, and not before. */
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  /* The rules moved to lib/registerForm.ts. They were forty lines
     inside a seven-hundred-line page, called from one place, on submit —
     so "does a company type without a company name fail?" was answerable
     only by filling in a form and pressing a button. Called, a test can
     ask. */
  const validateForm = () => {
    const errors = validate(formData)
    setValidationErrors(errors as Record<string, string>)
    return Object.keys(errors).length === 0
  }

  /* Answer as she leaves a field, but only about fields she has
     finished. Validating on every keystroke tells somebody their email
     is invalid while they are typing the @ — which is true, useless, and
     reads as the product arguing with them. */
  const blur = (name: string) => {
    /* Touching one half of a pair reveals both. The company name and
       type are one fact in two inputs, and an error raised on the half
       she has not visited would otherwise be filtered away — leaving a
       silent form that refuses to submit. */
    const next = { ...touched }
    for (const k of revealedBy(name)) next[k] = true
    setTouched(next)
    const all = validate(formData) as FieldErrors
    setValidationErrors(
      Object.fromEntries(
        Object.entries(all).filter(([k]) => next[k]),
      ) as Record<string, string>,
    )
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
          /* One serializer, so the payload cannot drift from the rules
             that validated it. The phone is normalized to E.164 HERE,
             using the same lib the partner screens have used since
             PARTNER2 — the server normalizes again at the write, because
             a rule that only the browser enforces is a rule the API does
             not have. */
          body: JSON.stringify(
            registrationPayload(formData, normalizePhone(formData.phone)),
          ),
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
                  autoComplete="email"
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
                    {/* LEGAL1: WITHOUT autoComplete="new-password", CHROME FILLS A
                          SAVED CREDENTIAL. It does not recognise this as a
                          registration form, reads a password field, and
                          offers a login it has stored — the audit caught
                          eight dots and a "Good" strength bar before a
                          single keystroke, with Confirm empty. Somebody can
                          create an account with a password they never chose
                          and do not know they reused. */}
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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
                  {...fieldProps("fullName", validationErrors.fullName, true)}
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={() => blur("fullName")}
                  className={`${inputBase} ${validationErrors.fullName ? "border-error-500" : "border-gray-200"}`}
                  placeholder="John Smith"
                />
                {validationErrors.fullName && (
                  <p id="fullName-error" role="alert" className="mt-1 text-sm text-error-500">
                    {validationErrors.fullName}
                  </p>
                )}
              </div>

              {/* Role & State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="role" className="block text-sm font-semibold text-gray-900">
                    Professional role <span className="text-error-500">*</span>
                  </label>
                  <select
                    {...fieldProps("role", validationErrors.role, true)}
                    value={formData.role}
                    onChange={handleChange}
                    onBlur={() => blur("role")}
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
                  {validationErrors.role && (
                    <p id="role-error" role="alert" className="mt-1 text-sm text-error-500">
                      {validationErrors.role}
                    </p>
                  )}
                  {/* "Other" was not an answer. The product recorded a
                      professional role of literally "Other" — for a
                      column the deed face and the admin console read. */}
                  {formData.role === OTHER && (
                    <div className="mt-2 space-y-1.5">
                      <label htmlFor="roleOther" className="block text-sm font-medium text-gray-700">
                        What is your role? <span className="text-error-500">*</span>
                      </label>
                      <input
                        {...fieldProps("roleOther", validationErrors.roleOther, true)}
                        type="text"
                        value={formData.roleOther}
                        onChange={handleChange}
                        onBlur={() => blur("roleOther")}
                        className={`${inputBase} ${
                          validationErrors.roleOther ? "border-error-500" : "border-gray-200"}`}
                        placeholder="Notary, Loan Officer, …"
                      />
                      {validationErrors.roleOther && (
                        <p id="roleOther-error" role="alert" className="mt-1 text-sm text-error-500">
                          {validationErrors.roleOther}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ═══ THE STATE IS A FACT WE STATE, NOT A QUESTION ═══

                    A dropdown asks. Asking implies the answer changes
                    something, and it does not: every form, rate and
                    county in this product is California. So the screen
                    says what we serve, and does not pretend to take an
                    order it cannot fill. */}
                <div className="space-y-1.5">
                  <p className="block text-sm font-semibold text-gray-900">State</p>
                  <div className={`${inputBase} border-gray-200 bg-gray-50 text-gray-700`}>
                    {SERVED_STATE_NAME}
                  </div>
                  <p className="text-xs text-gray-500">
                    DeedPro serves California today. Our forms, transfer-tax
                    rates and county requirements are California-specific.
                  </p>
                </div>
              </div>

              {/* Company Name & Company Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900">
                    Company name <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    {...fieldProps("companyName", validationErrors.companyName)}
                    type="text"
                    autoComplete="organization"
                    value={formData.companyName}
                    onChange={handleChange}
                    onBlur={() => blur("companyName")}
                    className={`${inputBase} ${
                      validationErrors.companyName ? "border-error-500" : "border-gray-200"}`}
                    placeholder="Your Company LLC"
                  />
                  {/* The pair is checked BOTH ways: a type with no name
                      is a company we cannot print on a deed face, a name
                      with no type is one we cannot categorise, and each
                      was separately optional so both halves could sit
                      half-filled with the form happy. */}
                  {validationErrors.companyName && (
                    <p id="companyName-error" role="alert" className="mt-1 text-sm text-error-500">
                      {validationErrors.companyName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyType" className="block text-sm font-semibold text-gray-900">
                    Company type <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <select
                    {...fieldProps("companyType", validationErrors.companyType)}
                    value={formData.companyType}
                    onChange={handleChange}
                    onBlur={() => blur("companyType")}
                    className={`${inputBase} bg-white ${
                      validationErrors.companyType ? "border-error-500" : "border-gray-200"}`}
                  >
                    <option value="">Select company type</option>
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {validationErrors.companyType && (
                    <p id="companyType-error" role="alert" className="mt-1 text-sm text-error-500">
                      {validationErrors.companyType}
                    </p>
                  )}
                  {formData.companyType === OTHER && (
                    <div className="mt-2 space-y-1.5">
                      <label htmlFor="companyTypeOther" className="block text-sm font-medium text-gray-700">
                        What kind of company? <span className="text-error-500">*</span>
                      </label>
                      <input
                        {...fieldProps("companyTypeOther", validationErrors.companyTypeOther, true)}
                        type="text"
                        value={formData.companyTypeOther}
                        onChange={handleChange}
                        onBlur={() => blur("companyTypeOther")}
                        className={`${inputBase} ${
                          validationErrors.companyTypeOther ? "border-error-500" : "border-gray-200"}`}
                        placeholder="Lender, Notary service, …"
                      />
                      {validationErrors.companyTypeOther && (
                        <p id="companyTypeOther-error" role="alert" className="mt-1 text-sm text-error-500">
                          {validationErrors.companyTypeOther}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-900">
                  Phone number <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  {...fieldProps("phone", validationErrors.phone)}
                  type="tel"
                  /* The number pad, on the device most people register
                     on. `type="tel"` alone does not summon it reliably. */
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  /* Masked as she types, by the same lib the partner
                     screens have used since PARTNER2. "not-a-phone!!" was
                     accepted here, and production holds a nine-digit
                     number nobody can call. */
                  onChange={(e) =>
                    setFormData({ ...formData, phone: maskUS(e.target.value) })}
                  onBlur={() => blur("phone")}
                  className={`${inputBase} ${
                    validationErrors.phone ? "border-error-500" : "border-gray-200"}`}
                  placeholder="(555) 123-4567"
                />
                {validationErrors.phone && (
                  <p id="phone-error" role="alert" className="mt-1 text-sm text-error-500">
                    {validationErrors.phone}
                  </p>
                )}
              </div>

              {/* ═══ THE INTEREST SIGNAL, WHICH IS NOT A DROPDOWN ═══

                  Owner-ruled. A free-text box records that somebody
                  outside California wanted us; a dropdown would imply we
                  would accept the answer.

                  It is READABLE — it reaches the admin user list rather
                  than sitting in a column nobody queries. LEGAL1 is the
                  precedent: `subscribe` was collected, stored, and
                  visible to nobody, which manufactured a record that
                  looked like information and could not function as one.

                  The copy promises nothing. A sentence like "we will let
                  you know" would make this a consent, and a consent we
                  cannot honour is the thing LEGAL1 deleted. */}
              <div className="space-y-1.5">
                <label htmlFor="interestState" className="block text-sm font-semibold text-gray-900">
                  Working outside California?{" "}
                  <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  {...fieldProps("interestState", undefined)}
                  type="text"
                  value={formData.interestState}
                  onChange={handleChange}
                  className={`${inputBase} border-gray-200`}
                  placeholder="Which state?"
                />
                <p className="text-xs text-gray-500">
                  Tell us where and we will record it. We are not taking
                  orders outside California yet.
                </p>
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

                {/* LEGAL1 — THE MARKETING CONSENT CHECKBOX IS GONE.
                    It was collected here and written to the users table,
                    then appeared nowhere else in 119 endpoints: no
                    response carried it, /users/profile did not show it,
                    ProfilePatch could not change it, and there was no
                    unsubscribe endpoint — while /admin/emails existed.

                    Consent that cannot be read back, changed by the
                    person who gave it, produced by support, or acted on
                    is not consent. Owner-ruled: stop collecting it. The
                    lifecycle gets built when there is a reason to mail
                    anyone, and then all of it at once — profile field,
                    patch path, unsubscribe, List-Unsubscribe header. */}
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
