# DeedPro Document Builder — Integration Guide

## Overview

v0 built a complete, working Document Builder. This guide wires it into DeedPro's existing codebase.

**What v0 Built:**
- Two-panel layout (420px input + flexible preview)
- 6 accordion sections with status indicators
- Live deed preview
- Success page
- Clean CSS transitions (no Framer Motion needed)

**What We Wire Up:**
- PropertySection → SiteX API
- RecordingSection → Partners context
- TransferTaxSection → Real DTT calculation
- DeedBuilder → Real generation API
- Sidebar → Auto-collapse on builder routes

---

## Step 1: Copy Files from v0

Copy these files directly into your DeedPro project:

```bash
# Types
cp v0-builder/types/builder.ts → src/types/builder.ts

# Builder components
mkdir -p src/components/builder/sections
cp v0-builder/components/builder/BuilderHeader.tsx → src/components/builder/
cp v0-builder/components/builder/InputSection.tsx → src/components/builder/
cp v0-builder/components/builder/InputPanel.tsx → src/components/builder/
cp v0-builder/components/builder/PreviewPanel.tsx → src/components/builder/

# Section components (we'll modify some of these)
cp v0-builder/components/builder/sections/GrantorSection.tsx → src/components/builder/sections/
cp v0-builder/components/builder/sections/GranteeSection.tsx → src/components/builder/sections/
cp v0-builder/components/builder/sections/VestingSection.tsx → src/components/builder/sections/

# Main builder
mkdir -p src/features/builder
cp v0-builder/features/builder/DeedBuilder.tsx → src/features/builder/

# Routes
mkdir -p src/app/create-deed/[type]/success
cp v0-builder/app/create-deed/[type]/page.tsx → src/app/create-deed/[type]/
cp v0-builder/app/create-deed/[type]/success/page.tsx → src/app/create-deed/[type]/success/
cp v0-builder/app/create-deed/[type]/success/success-content.tsx → src/app/create-deed/[type]/success/
```

---

## Step 2: PropertySection — Wire to SiteX

Replace the mock data with real SiteX API calls.

### File: `src/components/builder/sections/PropertySection.tsx`

```tsx
"use client"

import { useState } from "react"
import { MapPin, Search, Check, Loader2, AlertCircle } from "lucide-react"
import type { PropertyData } from "@/types/builder"

interface PropertySectionProps {
  value: PropertyData | null
  onChange: (property: PropertyData) => void
  onComplete: () => void
}

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (address: string) => {
    if (!address.trim()) return
    
    setIsSearching(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ address }),
      })

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Map SiteX response to PropertyData
        const propertyData: PropertyData = {
          address: result.data.address || address,
          city: result.data.city || '',
          county: result.data.county || '',
          state: result.data.state || 'California',
          zip: result.data.zip_code || '',
          apn: result.data.apn || '',
          legalDescription: result.data.legal_description || '',
          owner: formatOwnerName(result.data.primary_owner, result.data.secondary_owner),
        }
        
        onChange(propertyData)
        onComplete() // Auto-advance to Grantor section
      } else if (result.status === 'multiple_matches') {
        // Handle multiple matches - could show a picker
        // For now, use first match
        const match = result.matches[0]
        handleSearch(match.address)
      } else {
        setError(result.message || 'Property not found. Please check the address.')
      }
    } catch (err) {
      console.error('Property search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // If property is loaded, show summary
  if (value?.address) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-1">
                <Check className="w-4 h-4" />
                Property Found
              </div>
              <p className="font-semibold text-gray-900">{value.address}</p>
              <p className="text-sm text-gray-600 mt-1">
                APN: {value.apn} · {value.county} County
              </p>
            </div>
            <button
              onClick={() => onChange(null as unknown as PropertyData)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        </div>

        {value.legalDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Description
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
              {value.legalDescription}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Search UI
  return (
    <div className="space-y-4">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
          placeholder="Enter property address..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          autoFocus
        />
        {isSearching ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        ) : (
          searchQuery && (
            <button 
              onClick={() => handleSearch(searchQuery)} 
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <Search className="w-5 h-5 text-primary hover:text-primary/80" />
            </button>
          )
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Start typing an address and we'll pull the APN, owner, and legal description automatically.
      </p>
    </div>
  )
}

// Helper to format owner names from SiteX
function formatOwnerName(primary?: { full_name?: string }, secondary?: { full_name?: string }): string {
  const names: string[] = []
  
  if (primary?.full_name) {
    names.push(primary.full_name.toUpperCase())
  }
  if (secondary?.full_name) {
    names.push(secondary.full_name.toUpperCase())
  }
  
  return names.join(' AND ') || ''
}
```

---

## Step 3: TransferTaxSection — Wire Real DTT Calculation

### File: `src/components/builder/sections/TransferTaxSection.tsx`

```tsx
"use client"

import { useMemo, useEffect } from "react"
import { Calculator, Sparkles } from "lucide-react"
import type { DTTData } from "@/types/builder"

interface TransferTaxSectionProps {
  value: DTTData | null
  onChange: (dtt: DTTData) => void
  city?: string
  deedType: string
}

// Cities with their own DTT rates
const CITIES_WITH_OWN_DTT = [
  'los angeles', 'san francisco', 'oakland', 'berkeley', 'san jose',
  'sacramento', 'riverside', 'pomona', 'culver city', 'santa monica',
  'redondo beach', 'inglewood', 'long beach', 'pasadena',
]

// DTT exemption codes
const EXEMPTION_REASONS = [
  { value: 'R&T 11911', label: 'R&T 11911 - Gift / No Consideration' },
  { value: 'R&T 11927', label: 'R&T 11927 - Interspousal Transfer' },
  { value: 'R&T 11930', label: 'R&T 11930 - Transfer to Revocable Trust' },
  { value: 'R&T 11923', label: 'R&T 11923 - Court Order / Decree' },
  { value: 'R&T 11925', label: 'R&T 11925 - Foreclosure / Deed in Lieu' },
  { value: 'R&T 11922', label: 'R&T 11922 - Government Entity' },
  { value: 'R&T 11926', label: 'R&T 11926 - Confirmation Deed' },
  { value: 'Other', label: 'Other Exemption' },
]

export function TransferTaxSection({ value, onChange, city, deedType }: TransferTaxSectionProps) {
  // Initialize with smart defaults
  useEffect(() => {
    if (!value) {
      const isInCity = city && CITIES_WITH_OWN_DTT.some(c => 
        city.toLowerCase().includes(c)
      )
      const isInterspousal = deedType === 'interspousal-transfer'
      
      onChange({
        isExempt: isInterspousal,
        exemptReason: isInterspousal ? 'R&T 11927' : '',
        transferValue: '',
        calculatedAmount: '',
        basis: 'full_value',
        areaType: isInCity ? 'city' : 'unincorporated',
        cityName: isInCity ? city : '',
      })
    }
  }, [city, deedType, value, onChange])

  // Calculate DTT when values change
  const calculatedAmount = useMemo(() => {
    if (!value || value.isExempt || !value.transferValue) return ''
    
    const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ''))
    if (isNaN(amount) || amount <= 0) return ''
    
    // County rate: $1.10 per $1,000 (or $0.55 per $500)
    const countyTax = (amount / 1000) * 1.10
    
    // City rate varies - using common rates
    let cityTax = 0
    if (value.areaType === 'city') {
      const cityLower = (value.cityName || '').toLowerCase()
      
      // City-specific rates per $1,000
      if (cityLower.includes('los angeles')) {
        cityTax = (amount / 1000) * 4.50
      } else if (cityLower.includes('san francisco')) {
        // SF has tiered rates, simplified here
        cityTax = (amount / 1000) * 7.50
      } else if (cityLower.includes('oakland')) {
        cityTax = (amount / 1000) * 15.00
      } else {
        // Default city rate
        cityTax = (amount / 1000) * 2.20
      }
    }
    
    return (countyTax + cityTax).toFixed(2)
  }, [value])

  // Update calculated amount when it changes
  useEffect(() => {
    if (value && calculatedAmount !== value.calculatedAmount) {
      onChange({ ...value, calculatedAmount })
    }
  }, [calculatedAmount, value, onChange])

  if (!value) return null

  return (
    <div className="space-y-4">
      {/* Auto-exempt notice for interspousal */}
      {deedType === 'interspousal-transfer' && value.isExempt && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <Sparkles className="w-4 h-4" />
          Automatically marked exempt for interspousal transfer
        </div>
      )}

      {/* Exempt Toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!value.isExempt}
            onChange={() => onChange({ ...value, isExempt: false, exemptReason: '' })}
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="font-medium text-gray-900">Calculate Tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value.isExempt}
            onChange={() => onChange({ ...value, isExempt: true, transferValue: '', calculatedAmount: '' })}
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="font-medium text-gray-900">Exempt</span>
        </label>
      </div>

      {value.isExempt ? (
        /* Exemption Reason */
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exemption Reason
          </label>
          <select
            value={value.exemptReason}
            onChange={(e) => onChange({ ...value, exemptReason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Select reason...</option>
            {EXEMPTION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Tax Calculation */
        <div className="space-y-4">
          {/* Transfer Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={value.transferValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  const formatted = raw ? parseInt(raw).toLocaleString() : ''
                  onChange({ ...value, transferValue: formatted })
                }}
                placeholder="500,000"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Basis */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'full_value'}
                onChange={() => onChange({ ...value, basis: 'full_value' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-gray-700">Full value</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'less_liens'}
                onChange={() => onChange({ ...value, basis: 'less_liens' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-gray-700">Less liens/encumbrances</span>
            </label>
          </div>

          {/* Area Type */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'city'}
                onChange={() => onChange({ ...value, areaType: 'city' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-gray-700">
                City{value.cityName ? ` of ${value.cityName}` : ''}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'unincorporated'}
                onChange={() => onChange({ ...value, areaType: 'unincorporated' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-gray-700">Unincorporated</span>
            </label>
          </div>

          {/* Calculated Result */}
          {calculatedAmount && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-emerald-700">
                Documentary Transfer Tax: ${calculatedAmount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Step 4: RecordingSection — Wire to Partners Context

### File: `src/components/builder/sections/RecordingSection.tsx`

```tsx
"use client"

import { useEffect } from "react"
import { Building2, Plus } from "lucide-react"
import { usePartners } from "@/features/partners/PartnersContext"

interface RecordingSectionProps {
  requestedBy: string
  returnTo: string
  onChange: (updates: { requestedBy?: string; returnTo?: string }) => void
}

export function RecordingSection({ requestedBy, returnTo, onChange }: RecordingSectionProps) {
  const { partners, loading } = usePartners()
  
  // Auto-select last used partner on mount
  useEffect(() => {
    if (!requestedBy && partners.length > 0 && !loading) {
      const lastUsedId = localStorage.getItem('lastPartnerUsed')
      if (lastUsedId) {
        const partner = partners.find(p => p.id === lastUsedId)
        if (partner) {
          onChange({ requestedBy: partner.label })
        }
      }
    }
  }, [partners, loading, requestedBy, onChange])

  const handlePartnerChange = (value: string) => {
    onChange({ requestedBy: value })
    
    // Save as last used
    const partner = partners.find(p => p.label === value)
    if (partner) {
      localStorage.setItem('lastPartnerUsed', partner.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Recording Requested By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recording Requested By
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={requestedBy}
            onChange={(e) => handlePartnerChange(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-white disabled:bg-gray-50"
          >
            <option value="">Select partner...</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.label}>
                {partner.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Add new partner link - opens existing partner modal */}
        <button 
          type="button"
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-2"
          onClick={() => {
            // Dispatch event or call function to open partner modal
            // This depends on how your existing partner creation works
            window.dispatchEvent(new CustomEvent('openAddPartnerModal'))
          }}
        >
          <Plus className="w-4 h-4" />
          Add new partner
        </button>
      </div>

      {/* When Recorded, Return To */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          When Recorded, Return To
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!returnTo || returnTo === 'same' || returnTo === requestedBy}
              onChange={() => onChange({ returnTo: requestedBy || 'same' })}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Same as Requested By</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={returnTo === 'grantee'}
              onChange={() => onChange({ returnTo: 'grantee' })}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Grantee</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={returnTo !== '' && returnTo !== 'same' && returnTo !== 'grantee' && returnTo !== requestedBy}
              onChange={() => onChange({ returnTo: '' })}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Other address</span>
          </label>
        </div>

        {/* Custom return address input */}
        {returnTo && returnTo !== 'same' && returnTo !== 'grantee' && returnTo !== requestedBy && (
          <textarea
            value={returnTo}
            onChange={(e) => onChange({ returnTo: e.target.value })}
            placeholder="Enter return address..."
            rows={3}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        )}
      </div>
    </div>
  )
}
```

---

## Step 5: DeedBuilder — Wire to Real Generation API

### File: `src/features/builder/DeedBuilder.tsx`

```tsx
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
  useBuilderMode() // Auto-collapse sidebar

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
      const token = localStorage.getItem('token')
      
      // Prepare payload for your existing API
      const payload = {
        deed_type: state.deedType,
        property: {
          address: state.property?.address,
          city: state.property?.city,
          county: state.property?.county,
          state: state.property?.state,
          zip: state.property?.zip,
          apn: state.property?.apn,
          legal_description: state.property?.legalDescription,
        },
        grantor: state.grantor,
        grantee: state.grantee,
        vesting: state.vesting,
        transfer_tax: {
          is_exempt: state.dtt?.isExempt,
          exempt_reason: state.dtt?.exemptReason,
          transfer_value: state.dtt?.transferValue?.replace(/,/g, ''),
          calculated_amount: state.dtt?.calculatedAmount,
          basis: state.dtt?.basis,
          area_type: state.dtt?.areaType,
        },
        requested_by: state.requestedBy,
        return_to: state.returnTo,
      }

      const response = await fetch('/api/deeds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Generation failed')
      }

      const result = await response.json()
      
      toast.success('Deed generated successfully!')
      router.push(`/create-deed/${deedType}/success?id=${result.id}`)
      
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate deed')
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
```

---

## Step 6: Sidebar Auto-Collapse

### File: `src/hooks/useBuilderMode.ts`

```tsx
"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

// Import your existing sidebar context/store
// Adjust this import to match your actual sidebar implementation
import { useSidebar } from "@/contexts/SidebarContext"
// OR if using Zustand:
// import { useSidebarStore } from "@/stores/sidebarStore"

export function useBuilderMode() {
  const pathname = usePathname()
  
  // Get sidebar controls from your existing context
  const { setCollapsed } = useSidebar()
  // OR for Zustand:
  // const { collapse } = useSidebarStore()
  
  const isBuilderRoute = pathname?.includes('/create-deed') || 
                         pathname?.includes('/deed-builder')

  useEffect(() => {
    if (isBuilderRoute) {
      setCollapsed(true)
      // OR: collapse()
    }
  }, [isBuilderRoute, setCollapsed])

  return { isBuilderMode: isBuilderRoute }
}
```

### If You Don't Have Sidebar State Management

Create a simple context:

```tsx
// src/contexts/SidebarContext.tsx

"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SidebarContextType {
  isCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setCollapsed] = useState(false)

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      setCollapsed,
      toggle: () => setCollapsed(!isCollapsed),
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}
```

Then in your layout, wrap with the provider and hide sidebar when collapsed:

```tsx
// In your main layout or sidebar component
const { isCollapsed } = useSidebar()

// Hide sidebar when collapsed
if (isCollapsed) {
  return null // Or return a minimal collapsed version
}
```

---

## Step 7: Update Types

### File: `src/types/builder.ts`

v0's types are good. Just ensure `cityName` is included in DTTData:

```tsx
export interface PropertyData {
  address: string
  city: string
  county: string
  state: string
  zip: string
  apn: string
  legalDescription: string
  owner?: string
}

export interface DTTData {
  isExempt: boolean
  exemptReason: string
  transferValue: string
  calculatedAmount: string
  basis: "full_value" | "less_liens"
  areaType: "city" | "unincorporated"
  cityName?: string  // Add this
}

export interface DeedBuilderState {
  deedType: string
  property: PropertyData | null
  grantor: string
  grantee: string
  vesting: string
  dtt: DTTData | null
  requestedBy: string
  returnTo: string
}
```

---

## Step 8: Success Page Updates

Update the success page to fetch real deed data:

### File: `src/app/create-deed/[type]/success/success-content.tsx`

```tsx
"use client"

import { useSearchParams, useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircle, Download, FileText, ArrowLeft, Share2, Printer } from "lucide-react"
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
  
  const [deed, setDeed] = useState<any>(null)

  // Fetch deed details
  useEffect(() => {
    if (deedId) {
      fetch(`/api/deeds/${deedId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => res.json())
        .then(data => setDeed(data))
        .catch(console.error)
    }
  }, [deedId])

  const handleDownload = () => {
    window.open(`/api/deeds/${deedId}/download`, '_blank')
  }

  const handleShare = () => {
    // Open your existing share modal
    window.dispatchEvent(new CustomEvent('openShareModal', { detail: { deedId } }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Deed Generated Successfully!
        </h1>

        <p className="text-gray-600 mb-8">
          Your {DEED_LABELS[type] || "Deed"} has been created and is ready for download.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{DEED_LABELS[type] || "Deed"}</p>
              <p className="text-sm text-gray-500">
                {deed?.property?.address || `Document ID: ${deedId}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button onClick={handleShare} variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            className="gap-2 bg-transparent w-full"
            onClick={() => router.push(`/create-deed/${type}`)}
          >
            Create Another {DEED_LABELS[type]}
          </Button>
          
          <Button 
            variant="ghost" 
            className="gap-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 9: Add Entry Point to Dashboard

Add a card or button to your dashboard that links to the deed type selection:

```tsx
// In your dashboard or wherever deed creation starts
import Link from "next/link"
import { FileText, Plus } from "lucide-react"

// Option 1: Direct to type selection page
<Link href="/create-deed" className="...">
  <Plus className="w-5 h-5" />
  Create New Deed
</Link>

// Option 2: Create a deed type selection page (use v0's app/page.tsx as reference)
```

---

## Checklist

- [ ] Copy v0 files to DeedPro
- [ ] Update PropertySection with real SiteX API
- [ ] Update TransferTaxSection with real DTT rates
- [ ] Update RecordingSection with Partners context
- [ ] Update DeedBuilder with real generation API
- [ ] Wire sidebar auto-collapse
- [ ] Update success page
- [ ] Test full flow

---

## Testing

1. Navigate to `/create-deed/grant-deed`
2. Search for a property address
3. Verify SiteX fills APN, owner, legal description
4. Enter grantee name
5. Select vesting
6. Set transfer tax (or exempt)
7. Select recording partner
8. Click Generate
9. Verify PDF generates and downloads

---

## What's Already Done (from v0)

✅ Two-panel layout  
✅ Accordion sections with status indicators  
✅ Live deed preview  
✅ Status dots in header  
✅ GrantorSection with auto-fill  
✅ GranteeSection with same-name warning  
✅ VestingSection with AI guidance  
✅ Success page  
✅ Clean CSS transitions  

## What Needs Wiring

🔌 PropertySection → SiteX API  
🔌 TransferTaxSection → Real DTT rates  
🔌 RecordingSection → Partners context  
🔌 DeedBuilder → Generation API  
🔌 Sidebar → Auto-collapse hook  
