"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { BuilderHeader } from "@/components/builder/BuilderHeader"
import { InputPanel } from "@/components/builder/InputPanel"
import { PreviewPanel } from "@/components/builder/PreviewPanel"
import { useBuilderMode } from "@/hooks/useBuilderMode"
import type { DeedBuilderState, PropertyData } from "@/types/builder"

interface DeedBuilderProps {
  deedType: string
  initialProperty?: PropertyData
}

const DEED_LABELS: Record<string, string> = {
  "grant-deed": "Grant Deed",
  "quitclaim-deed": "Quitclaim Deed",
  "interspousal-transfer": "Interspousal Transfer Deed",
  "warranty-deed": "Warranty Deed",
  "tax-deed": "Tax Deed",
}

export function DeedBuilder({ deedType, initialProperty }: DeedBuilderProps) {
  const router = useRouter()
  useBuilderMode()

  const [state, setState] = useState<DeedBuilderState>({
    deedType,
    property: initialProperty || null,
    grantor: initialProperty?.owner || "",
    grantee: "",
    vesting: "",
    dtt: null,
    requestedBy: "",
    returnTo: "",
  })

  const [expandedSection, setExpandedSection] = useState("property")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleChange = useCallback((updates: Partial<DeedBuilderState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // In a real app, this would call the API
      // const response = await fetch('/api/deeds/generate', {...})

      // Navigate to success page (or show success modal for demo)
      router.push(`/create-deed/${deedType}/success?id=${Date.now()}`)
    } catch {
      console.error("Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <BuilderHeader deedType={DEED_LABELS[deedType] || deedType} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[420px] flex-shrink-0 border-r border-gray-300">
          <InputPanel
            state={state}
            onChange={handleChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            expandedSection={expandedSection}
            onSectionChange={setExpandedSection}
          />
        </div>

        <div className="flex-1">
          <PreviewPanel state={state} activeSection={expandedSection} />
        </div>
      </div>
    </div>
  )
}
