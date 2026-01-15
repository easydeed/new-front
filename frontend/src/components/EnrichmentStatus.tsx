"use client"

import { Check, Loader2, X, AlertCircle } from "lucide-react"

/**
 * Property data returned from enrichment
 */
interface PropertyData {
  address?: string
  apn?: string
  county?: string
  primary_owner?: {
    full_name?: string
  }
  secondary_owner?: {
    full_name?: string
  }
  legal_description?: string
  legalDescription?: string
}

interface EnrichmentStatusProps {
  status: "idle" | "searching" | "enriching" | "complete" | "error"
  data: PropertyData | null
  errorMessage?: string
}

/**
 * EnrichmentStatus Component
 * 
 * Displays the status of property data enrichment from SiteX.
 * Shows a checklist of which fields were found.
 * 
 * Part 1.2 of DeedPro Wizard Integration
 */
export function EnrichmentStatus({ status, data, errorMessage }: EnrichmentStatusProps) {
  if (status === "idle") {
    return null
  }

  if (status === "searching") {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mt-4 animate-in fade-in duration-200">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-blue-800 font-medium">Searching for property...</span>
      </div>
    )
  }

  if (status === "enriching") {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mt-4 animate-in fade-in duration-200">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <div>
          <span className="text-blue-800 font-medium">Retrieving property details...</span>
          <p className="text-blue-600 text-sm mt-1">
            Fetching APN, owner records, and legal description
          </p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mt-4 animate-in fade-in duration-200">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-red-800 font-medium">Property Not Found</span>
          <p className="text-red-600 text-sm mt-1">
            {errorMessage || "Unable to find property. Please verify the address and try again."}
          </p>
        </div>
      </div>
    )
  }

  if (status === "complete" && data) {
    const legalDesc = data.legal_description || data.legalDescription
    
    return (
      <div className="p-4 bg-green-50 rounded-lg mt-4 border border-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-green-800">Property Found & Enriched</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <FieldStatus 
            label="Address" 
            found={!!data.address} 
            value={data.address} 
          />
          <FieldStatus 
            label="APN" 
            found={!!data.apn} 
            value={data.apn} 
          />
          <FieldStatus 
            label="County" 
            found={!!data.county} 
            value={data.county} 
          />
          <FieldStatus 
            label="Owner" 
            found={!!data.primary_owner?.full_name} 
            value={data.primary_owner?.full_name} 
          />
          <FieldStatus 
            label="Legal Description" 
            found={!!legalDesc} 
            value={legalDesc ? "Found" : undefined} 
          />
          {data.secondary_owner?.full_name && (
            <FieldStatus 
              label="Co-Owner" 
              found={true} 
              value={data.secondary_owner.full_name} 
            />
          )}
        </div>
      </div>
    )
  }

  return null
}

/**
 * Individual field status indicator
 */
function FieldStatus({ 
  label, 
  found, 
  value 
}: { 
  label: string
  found: boolean
  value?: string 
}) {
  return (
    <div className="flex items-center gap-2">
      {found ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-gray-400" />
      )}
      <span className={found ? "text-gray-700" : "text-gray-400"}>
        {label}: {found && value ? (
          <span className="font-medium">
            {value.length > 25 ? value.slice(0, 25) + "..." : value}
          </span>
        ) : (
          "—"
        )}
      </span>
    </div>
  )
}

export default EnrichmentStatus

