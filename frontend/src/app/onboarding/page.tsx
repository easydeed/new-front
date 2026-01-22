"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Building2, Scale, Home, Briefcase, ArrowRight, ArrowLeft, Check, MapPin } from "lucide-react"
import { AuthManager } from "@/utils/auth"

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

const ROLES = [
  { id: "escrow_officer", label: "Escrow Officer", icon: Building2, description: "I prepare deeds for closings" },
  { id: "title_officer", label: "Title Officer", icon: Scale, description: "I handle title and document preparation" },
  { id: "attorney", label: "Attorney / Paralegal", icon: Scale, description: "I prepare legal documents for clients" },
  { id: "real_estate", label: "Real Estate Professional", icon: Home, description: "I assist with property transactions" },
  { id: "other", label: "Other", icon: Briefcase, description: "I have a different role" },
]

interface OnboardingData {
  fullName: string
  role: string
  defaultCounty: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    role: "",
    defaultCounty: "Los Angeles",
  })
  const [animateIn, setAnimateIn] = useState(true)

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/login?redirect=/onboarding")
      return
    }

    // Pre-fill name from existing user data
    const user = AuthManager.getUser()
    if (user?.full_name) {
      setData(prev => ({ ...prev, fullName: user.full_name }))
    }
  }, [router])

  const handleNext = () => {
    setAnimateIn(false)
    setTimeout(() => {
      setStep(step + 1)
      setAnimateIn(true)
    }, 200)
  }

  const handleBack = () => {
    setAnimateIn(false)
    setTimeout(() => {
      setStep(step - 1)
      setAnimateIn(true)
    }, 200)
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      
      // Save onboarding data to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"}/users/profile`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: data.fullName,
            role: data.role,
            default_county: data.defaultCounty,
            onboarding_completed: true,
          }),
        }
      )

      // Update local storage
      const user = AuthManager.getUser()
      if (user) {
        AuthManager.setAuth(token!, {
          ...user,
          full_name: data.fullName,
          role: data.role,
        })
      }

      // Store onboarding flag
      localStorage.setItem("onboarding_completed", "true")
      localStorage.setItem("default_county", data.defaultCounty)

      // Redirect to dashboard or create first deed
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to save onboarding data:", error)
      // Still redirect even if save fails
      localStorage.setItem("onboarding_completed", "true")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipToDashboard = () => {
    localStorage.setItem("onboarding_completed", "true")
    router.push("/dashboard")
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.fullName.trim().length >= 2
      case 2:
        return data.role !== ""
      case 3:
        return data.defaultCounty !== ""
      default:
        return true
    }
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
            onClick={handleSkipToDashboard}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className={`transition-all duration-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-emerald-800 mb-1">Welcome to DeedPro!</h1>
                    <p className="text-emerald-700">
                      I'm here to help you create California deeds in minutes. Let me learn a bit about you so I can assist better.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <label className="block text-lg font-semibold text-gray-900 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  value={data.fullName}
                  onChange={(e) => setData({ ...data, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2">
                  This is how I'll greet you in the app.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div className={`transition-all duration-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-emerald-800 mb-1">
                      Nice to meet you, {data.fullName.split(' ')[0]}!
                    </h1>
                    <p className="text-emerald-700">
                      What best describes your role? This helps me tailor my suggestions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ROLES.map((role) => {
                  const Icon = role.icon
                  const isSelected = data.role === role.id
                  return (
                    <button
                      key={role.id}
                      onClick={() => setData({ ...data, role: role.id })}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                          {role.label}
                        </p>
                        <p className={`text-sm ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {role.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: County */}
          {step === 3 && (
            <div className={`transition-all duration-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-emerald-800 mb-1">
                      Great! As a{data.role === 'attorney' ? 'n' : ''} {ROLES.find(r => r.id === data.role)?.label || 'professional'}, you'll love how fast DeedPro works.
                    </h1>
                    <p className="text-emerald-700">
                      Which county do you work in most often? I'll set this as your default.
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
                  value={data.defaultCounty}
                  onChange={(e) => setData({ ...data, defaultCounty: e.target.value })}
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {CA_COUNTIES.map((county) => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
                
                {data.defaultCounty === "Los Angeles" && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <strong>💡 Tip:</strong> Los Angeles has both county ($1.10/1000) and city transfer taxes. I'll help you calculate the right amount for each property.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className={`transition-all duration-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-emerald-800 mb-1">
                      You're all set, {data.fullName.split(' ')[0]}!
                    </h1>
                    <p className="text-emerald-700">
                      Here's what I can help you with:
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-gray-700">Create deeds in under 2 minutes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-gray-700">Auto-fill property data from county records</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-gray-700">Calculate transfer tax (including city rates)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-gray-700">Ensure California compliance</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-600 mb-6">
                Ready to create your first deed?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleComplete()
                    setTimeout(() => router.push('/deed-builder'), 100)
                  }}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-5 h-5" />
                  {loading ? 'Setting up...' : 'Create My First Deed'}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full text-gray-600 hover:text-gray-800 font-medium py-3 transition-colors"
                >
                  Take me to my dashboard
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  step === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      s === step ? 'bg-emerald-500' : s < step ? 'bg-emerald-300' : 'bg-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm text-gray-500 ml-2">Step {step} of 4</span>
              </div>

              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                  canProceed()
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
