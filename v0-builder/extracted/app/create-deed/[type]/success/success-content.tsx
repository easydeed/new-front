"use client"

import { useSearchParams, useParams, useRouter } from "next/navigation"
import { CheckCircle, Download, FileText, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEED_LABELS: Record<string, string> = {
  "grant-deed": "Grant Deed",
  "quitclaim-deed": "Quitclaim Deed",
  "interspousal-transfer": "Interspousal Transfer Deed",
  "warranty-deed": "Warranty Deed",
  "tax-deed": "Tax Deed",
}

export function SuccessContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const deedId = searchParams.get("id")
  const type = params.type as string

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Deed Generated Successfully!</h1>

        <p className="text-gray-600 mb-8">
          Your {DEED_LABELS[type] || "Deed"} has been created and is ready for download.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{DEED_LABELS[type] || "Deed"}</p>
              <p className="text-sm text-gray-500">Document ID: {deedId}</p>
            </div>
          </div>

          <Button className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>

        <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
