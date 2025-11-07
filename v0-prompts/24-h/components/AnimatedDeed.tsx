"use client"

import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

export default function AnimatedDeed() {
  const [showSparkles, setShowSparkles] = useState(false)
  const [filledFields, setFilledFields] = useState({
    grantor: false,
    grantee: false,
    legal: false,
  })

  useEffect(() => {
    // Animate field filling
    const timer1 = setTimeout(() => setFilledFields((prev) => ({ ...prev, grantor: true })), 500)
    const timer2 = setTimeout(() => setFilledFields((prev) => ({ ...prev, grantee: true })), 1000)
    const timer3 = setTimeout(() => setFilledFields((prev) => ({ ...prev, legal: true })), 1500)
    const timer4 = setTimeout(() => setShowSparkles(true), 1800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  return (
    <div className="relative">
      <div className="relative rounded-2xl bg-white shadow-2xl border-2 border-gray-200 overflow-hidden">
        <div className="p-8 sm:p-12">
          <div className="text-center mb-8">
            <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
              Recording Requested By
            </div>
            <div className="text-sm font-bold text-[#1F2B37]">DeedPro • Escrow Services</div>
          </div>

          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-[#1F2B37] tracking-tight">GRANT DEED</h3>
            <p className="mt-2 text-xs text-gray-500">CALIFORNIA CIVIL CODE § 1092</p>
          </div>

          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p className="font-medium relative">
              <span className="font-bold text-[#1F2B37]">GRANTOR:</span>{" "}
              <span className={`transition-all duration-500 ${filledFields.grantor ? "opacity-100" : "opacity-0"}`}>
                John A. Smith and Jane B. Smith
              </span>
              {filledFields.grantor && !filledFields.grantee && (
                <Sparkles className="inline-block h-4 w-4 text-[#7C4DFF] ml-2 animate-pulse" />
              )}
            </p>
            <p className="font-medium relative">
              <span className="font-bold text-[#1F2B37]">GRANTEE:</span>{" "}
              <span className={`transition-all duration-500 ${filledFields.grantee ? "opacity-100" : "opacity-0"}`}>
                Michael C. Johnson
              </span>
              {filledFields.grantee && !filledFields.legal && (
                <Sparkles className="inline-block h-4 w-4 text-[#7C4DFF] ml-2 animate-pulse" />
              )}
            </p>
            <p className="text-xs text-gray-600 leading-loose">
              For valuable consideration, receipt of which is hereby acknowledged, Grantor(s) hereby GRANT(S) to
              Grantee(s) the following described real property...
            </p>

            <div
              className={`mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-500 ${filledFields.legal ? "opacity-100" : "opacity-30"}`}
            >
              <div className="text-xs font-semibold text-[#1F2B37] mb-2 flex items-center gap-2">
                LEGAL DESCRIPTION:
                {filledFields.legal && <Sparkles className="h-4 w-4 text-[#7C4DFF] animate-pulse" />}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                LOT 42, TRACT NO. 12345
                <br />
                IN THE CITY OF LOS ANGELES
                <br />
                COUNTY OF LOS ANGELES
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">Signature of Grantor(s)</div>
            <div className="mt-2 h-px bg-gray-300 w-48" />
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <Badge
            className={`bg-[#CCFF90] text-[#479B00] font-semibold shadow-lg text-sm px-3.5 py-1.5 transition-all duration-500 ${showSparkles ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Generated
          </Badge>
        </div>

        {/* Floating sparkles animation */}
        {showSparkles && (
          <>
            <Sparkles
              className="absolute top-1/4 left-8 h-5 w-5 text-[#7C4DFF] animate-pulse"
              style={{ animationDelay: "0ms" }}
            />
            <Sparkles
              className="absolute top-1/3 right-12 h-4 w-4 text-[#4F76F6] animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
            <Sparkles
              className="absolute bottom-1/3 left-16 h-6 w-6 text-[#7C4DFF] animate-pulse"
              style={{ animationDelay: "600ms" }}
            />
          </>
        )}
      </div>
    </div>
  )
}
