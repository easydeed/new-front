"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { FileText, ArrowRight, AlertCircle, RotateCw, FileX, Sparkles, CheckCircle } from "lucide-react"
// ✅ PHASE 24-E: Fixed import path to actual location
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from "@/features/wizard/mode/bridge/persistenceKeys"

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

// Fallback data if API fails - PHASE 24-E: Added all 5 deed types
const FALLBACK_TYPES: DocumentTypesRegistry = {
  grant_deed: {
    label: "Grant Deed",
    description:
      "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales.",
    steps: [
      { key: "property", title: "Property Search" },
      { key: "requested_by", title: "Recording Details" },
      { key: "transfer_tax", title: "Transfer Tax" },
      { key: "parties", title: "Parties & Property" },
      { key: "review", title: "Review & Generate" },
    ],
  },
  quitclaim_deed: {
    label: "Quitclaim Deed",
    description:
      "Release all interest in property without warranties. Ideal for family transfers, clearing title defects, or removing a name from property ownership records.",
    steps: [{ key: "generate", title: "Generate PDF" }],
  },
  interspousal_transfer_deed: {
    label: "Interspousal Transfer Deed",
    description:
      "Transfer property between spouses without reassessment or documentary transfer tax. Perfect for divorce settlements or changing ownership between married partners.",
    steps: [{ key: "generate", title: "Generate PDF" }],
  },
  warranty_deed: {
    label: "Warranty Deed",
    description:
      "Provide comprehensive guarantees against all title defects throughout property history. Offers maximum protection for buyers in commercial transactions.",
    steps: [{ key: "generate", title: "Generate PDF" }],
  },
  tax_deed: {
    label: "Tax Deed",
    description:
      "Document property transfers resulting from tax sales or foreclosures. Used by government entities to convey ownership after unpaid property tax proceedings.",
    steps: [{ key: "generate", title: "Generate PDF" }],
  },
}

export default function CreateDeedPageV0() {
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
    // ✅ PHASE 24-E: Critical business logic - Clear wizard localStorage when starting NEW deed
    console.log("[CreateDeedPageV0] Starting new deed - clearing all wizard localStorage")
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 lg:p-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Document Creation
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6 tracking-tight">
              Create Legal Document
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Select the type of legal document you need to create. Our AI-powered wizard will guide you through the
              process step by step.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div
              className="flex flex-col items-center justify-center min-h-[60vh] gap-8"
              role="status"
              aria-live="polite"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-purple-100 animate-spin border-t-[#7C4DFF]" />
                <FileText className="w-8 h-8 text-[#7C4DFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-xl text-slate-700 font-semibold mb-2">Loading document types...</p>
                <p className="text-sm text-slate-500">Fetching available deed templates</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center ring-4 ring-red-100">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Unable to Load Document Types</h2>
                <p className="text-slate-600">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <RotateCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && Object.keys(documentTypes).length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-slate-50">
                <FileX className="w-12 h-12 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-slate-700 mb-2">No Document Types Available</h3>
                <p className="text-slate-500">Please contact support if this issue persists.</p>
              </div>
            </div>
          )}

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
                  className="group relative bg-white rounded-2xl shadow-md border border-slate-200
                           hover:border-[#7C4DFF] hover:shadow-2xl hover:scale-[1.02]
                           transition-all duration-300 cursor-pointer overflow-hidden
                           focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:ring-offset-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-purple-50/0 to-purple-100/0 group-hover:from-purple-50/50 group-hover:via-purple-50/30 group-hover:to-purple-100/50 transition-all duration-300" />

                  <div className="relative p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8]
                                 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                      >
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-50 text-[#7C4DFF] text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Powered
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-[#7C4DFF] transition-colors">
                      {docType.label}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 mb-6 leading-relaxed min-h-[100px] text-sm">{docType.description}</p>

                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Process Steps
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          {docType.steps.length}
                        </span>
                      </div>

                      {/* Step Pills */}
                      <div className="flex flex-wrap gap-2">
                        {docType.steps.map((step, index) => (
                          <span
                            key={step.key}
                            className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-100
                                     text-xs font-medium px-3 py-2 rounded-lg group-hover:bg-purple-100 transition-colors"
                          >
                            <span
                              className="w-5 h-5 rounded-full bg-[#7C4DFF] text-white
                                       flex items-center justify-center text-[10px] font-bold shadow-sm"
                            >
                              {index + 1}
                            </span>
                            {step.title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between text-[#7C4DFF] font-semibold text-base
                               group-hover:text-[#6a3de8] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        Start Wizard
                        <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
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

