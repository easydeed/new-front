"use client"

import { useMemo } from "react"
import type { DeedBuilderState } from "@/types/builder"

interface PreviewPanelProps {
  state: DeedBuilderState
  activeSection: string
}

export function PreviewPanel({ state, activeSection }: PreviewPanelProps) {
  const preview = useMemo(
    () => ({
      requestedBy: state.requestedBy || "[Recording Requested By]",
      returnTo: state.returnTo || state.requestedBy || "[Return To]",
      apn: state.property?.apn || "[APN]",
      dtt: state.dtt?.isExempt
        ? `EXEMPT - ${state.dtt.exemptReason || "___"}`
        : state.dtt?.calculatedAmount
          ? `$${state.dtt.calculatedAmount}`
          : "[$_____]",
      grantor: state.grantor || "[GRANTOR NAME]",
      grantee: state.grantee || "[GRANTEE NAME]",
      vesting: state.vesting || "",
      legalDescription: state.property?.legalDescription || "[Legal Description]",
      county: state.property?.county || "[County]",
    }),
    [state],
  )

  const deedTitle =
    {
      "grant-deed": "GRANT DEED",
      "quitclaim-deed": "QUITCLAIM DEED",
      "interspousal-transfer": "INTERSPOUSAL TRANSFER DEED",
      "warranty-deed": "WARRANTY DEED",
      "tax-deed": "TAX DEED",
    }[state.deedType] || "DEED"

  const highlight = (section: string) =>
    activeSection === section ? "bg-primary/5 ring-2 ring-primary/30 rounded -m-2 p-2" : ""

  const placeholder = (value: string) => (value.startsWith("[") ? "text-gray-400 bg-gray-100 px-1 rounded" : "")

  return (
    <div className="h-full bg-gray-200 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl" style={{ minHeight: "11in" }}>
          <div className="p-12 font-serif text-sm leading-relaxed">
            {/* Header */}
            <div className="flex justify-between mb-8">
              <div className={highlight("recording")}>
                <div className="text-xs mb-4">
                  <div className="font-bold mb-1">RECORDING REQUESTED BY:</div>
                  <span className={placeholder(preview.requestedBy)}>{preview.requestedBy}</span>
                </div>
                <div className="text-xs">
                  <div className="font-bold mb-1">WHEN RECORDED MAIL TO:</div>
                  <span className={placeholder(preview.returnTo)}>{preview.returnTo}</span>
                </div>
              </div>

              <div className="w-56 h-28 border-2 border-black flex items-center justify-center">
                <span className="text-xs text-gray-400">{"RECORDER'S USE"}</span>
              </div>
            </div>

            {/* APN & DTT */}
            <div className="flex justify-between text-xs mb-6">
              <div className={highlight("property")}>
                <span className="font-bold">A.P.N.: </span>
                <span className={placeholder(preview.apn)}>{preview.apn}</span>
              </div>
              <div className={highlight("transferTax")}>
                <span className="font-bold">Documentary Transfer Tax: </span>
                <span className={placeholder(preview.dtt)}>{preview.dtt}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">{deedTitle}</h1>

            {/* Body */}
            <p className="mb-6">FOR A VALUABLE CONSIDERATION, receipt of which is hereby acknowledged,</p>

            <div className={`mb-6 ${highlight("grantor")}`}>
              <span className={`font-bold ${placeholder(preview.grantor)}`}>{preview.grantor}</span>
            </div>

            <p className="mb-6">hereby GRANT(S) to</p>

            <div className={`mb-6 ${highlight("grantee")}`}>
              <span className={`font-bold ${placeholder(preview.grantee)}`}>{preview.grantee}</span>
              {preview.vesting && <span className={highlight("vesting")}>, {preview.vesting}</span>}
            </div>

            <p className="mb-6">
              the following described real property in the County of{" "}
              <span className={placeholder(preview.county)}>{preview.county}</span>, State of California:
            </p>

            <div className={`border border-gray-300 p-4 mb-8 ${highlight("property")}`}>
              <span className={`text-sm ${placeholder(preview.legalDescription)}`}>{preview.legalDescription}</span>
            </div>

            {/* Signature */}
            <div className="mt-16 space-y-8">
              <div>
                <div className="border-b border-black w-72 mb-1" />
                <div className="text-xs">Date</div>
              </div>
              <div>
                <div className="border-b border-black w-72 mb-1" />
                <div className="text-xs">{preview.grantor}</div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">Preview updates as you type</p>
      </div>
    </div>
  )
}
