"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { FileDigit, ArrowRight, AlertCircle, RotateCw, FileX, Mail, Sparkles } from "lucide-react"
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from "@/lib/persistenceKeys"

interface DocumentType {
  label: string
  description?: string
  steps: Array<{
    key: string
    title: string
  }>
}

interface DocumentTypesRegistry {
  [key: string]: DocumentType
}

// Fallback data if API fails
const FALLBACK_TYPES: DocumentTypesRegistry = {
  grant_deed: {
    label: "Grant Deed",
    description:
      "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "tax", title: "Transfer Tax" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" },
    ],
  },
  quitclaim_deed: {
    label: "Quitclaim Deed",
    description:
      "Transfer property ownership without warranties. Often used for transfers between family members or to clear title defects.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" },
    ],
  },
  warranty_deed: {
    label: "Warranty Deed",
    description:
      "Transfer property ownership with full warranties covering the entire chain of title. Provides maximum protection for the buyer.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "tax", title: "Transfer Tax" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" },
    ],
  },
}

export default function CreateDeedPage() {
  const router = useRouter()
  const [documentTypes, setDocumentTypes] = useState<DocumentTypesRegistry>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
        const response = await fetch(`${apiUrl}/api/doc-types`)

        if (!response.ok) {
          throw new Error(`Failed to fetch document types: ${response.status}`)
        }

        const data = await response.json()
        setDocumentTypes(data)
      } catch (err) {
        console.error("Error fetching document types:", err)
        // Use fallback data
        setDocumentTypes(FALLBACK_TYPES)
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentTypes()
  }, [])

  const handleDocumentTypeSelect = (docTypeKey: string) => {
    // Clear wizard localStorage when starting NEW deed
    console.log("[CreateDeedPage] Starting new deed - clearing all wizard localStorage")
    if (typeof window !== "undefined") {
      localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN)
      localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC)
      sessionStorage.setItem("deedWizardCleared", "true")
    }

    // Navigate to wizard
    router.push(`/create-deed/${docTypeKey.replace("_", "-")}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent, docTypeKey: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleDocumentTypeSelect(docTypeKey)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8 md:p-12 lg:p-16">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Create Your Legal Document</h1>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              Select the type of deed you need to create. Our AI-powered wizard will guide you through the process step
              by step.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
              role="status"
              aria-live="polite"
            >
              <div className="relative">
                {/* Spinning ring */}
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 animate-spin border-t-[#7C4DFF]" />

                {/* Center icon */}
                <FileDigit className="w-6 h-6 text-[#7C4DFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              <p className="text-lg text-gray-600 font-medium">Loading document types...</p>

              <p className="text-sm text-gray-500">Fetching available deed templates</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Unable to Load Document Types</h2>

              <p className="text-gray-600 text-center">{error}</p>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-8 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                <RotateCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && Object.keys(documentTypes).length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <FileX className="w-10 h-10 text-gray-400" />
              </div>

              <h3 className="text-xl font-semibold text-gray-600">No Document Types Available</h3>

              <p className="text-gray-500">Please contact support if this issue persists.</p>

              <button className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          )}

          {/* Deed Type Cards Grid */}
          {!loading && !error && Object.keys(documentTypes).length > 0 && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(documentTypes).map(([key, docType]) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${docType.label} to start wizard`}
                  onClick={() => handleDocumentTypeSelect(key)}
                  onKeyDown={(e) => handleKeyDown(e, key)}
                  className="group relative bg-white rounded-2xl shadow-lg border border-gray-200
                           hover:border-[#7C4DFF] hover:shadow-2xl hover:scale-[1.02]
                           transition-all duration-300 cursor-pointer p-6 md:p-8 focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:ring-offset-2"
                >
                  {/* Icon Container */}
                  <div
                    className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8]
                               flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  >
                    <FileDigit className="w-8 h-8 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{docType.label}</h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 leading-relaxed min-h-[80px]">{docType.description}</p>

                  {/* Steps Preview */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-gray-700">Process Steps:</span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {docType.steps.length} steps
                      </span>
                    </div>

                    {/* Step Pills */}
                    <div className="flex flex-wrap gap-2">
                      {docType.steps.map((step, index) => (
                        <span
                          key={step.key}
                          className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700
                                   text-xs font-medium px-3 py-1.5 rounded-full"
                        >
                          <span
                            className="w-4 h-4 rounded-full bg-[#7C4DFF] text-white
                                       flex items-center justify-center text-[10px] font-bold"
                          >
                            {index + 1}
                          </span>
                          {step.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div
                    className="flex items-center justify-between text-[#7C4DFF] font-semibold
                               group-hover:text-[#6a3de8] transition-colors"
                  >
                    <span>Start Wizard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {/* Hover Effect Border Glow */}
                  <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7C4DFF]/0 to-[#6a3de8]/0
                               group-hover:from-[#7C4DFF]/10 group-hover:to-[#6a3de8]/10
                               transition-all duration-300 pointer-events-none"
                  />

                  {/* AI Badge (optional decorative element) */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-[#7C4DFF]/10 text-[#7C4DFF] text-xs font-medium px-2 py-1 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      AI Powered
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
