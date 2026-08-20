"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useGoogleMaps } from "@/components/hooks/useGoogleMaps"
import { MapPin, Search, Loader2, AlertCircle, Building2, ChevronRight } from "lucide-react"
import type { ParcelSelection, PropertyData, PropertyProvenance, Sourced } from "@/types/builder"
import { useGuidance } from "@/contexts/GuidanceContext"
import { FieldGuidance } from "../FieldGuidance"
import { ConfirmableField } from "../ConfirmableField"
import { propertyCandidatesRemaining } from "@/lib/provenance"
import { mapSiteXResponse, readSelection } from "@/lib/sitexProperty"
import { formatSuggestionSecondary } from "@/lib/addressLabels"

interface PropertySectionProps {
  value: PropertyData | null
  onChange: (property: PropertyData) => void
  onComplete: () => void
}

// Loading skeleton for property data
function PropertySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Fetching property details from county records...</span>
      </div>
    </div>
  )
}

interface PropertyMatchCandidate {
  address: string
  city?: string
  state?: string
  zip_code?: string
  zip?: string
  unit_type?: string
  unit_number?: string
  apn: string
  fips: string
  owner?: string
  owner_name?: string
  use_code_description?: string
  property_type?: string
  /** Why the owner line is blank, decided server-side. See services/address_match.py. */
  owner_status?: string
  owner_reason?: string
}

/**
 * The unit, when the county gave us one.
 *
 * UX2: in a multi-unit building every candidate carries the SAME street
 * address and the unit is the only thing telling them apart — and it was
 * being dropped from the render. Seventy-six identical-looking rows is
 * not a choice, it is a coin toss with a scrollbar.
 */
export function unitLabel(match: Pick<PropertyMatchCandidate, 'unit_type' | 'unit_number'>): string {
  const number = (match.unit_number || '').trim()
  if (!number) return ''
  const type = (match.unit_type || 'Unit').trim()
  return `${type} ${number}`
}

/**
 * The owner line, or the reason there isn't one.
 *
 * Invariant #4 in a data field. "Owner unavailable" covered three
 * different situations — a gap in the county record, a parcel that never
 * matched, and a county service that is down — and only one of them is
 * the officer's to act on. The reason comes from the server; this
 * function does not invent one when none was sent.
 */
export function ownerLine(match: PropertyMatchCandidate): string {
  const name = (match.owner || match.owner_name || '').trim()
  if (name) return name
  return match.owner_reason || 'No owner name returned for this parcel'
}

interface PropertyMatchListProps {
  matches: PropertyMatchCandidate[]
  totalCount: number
  onSelect: (match: PropertyMatchCandidate) => void
  buildingAddress: string
  heading?: string
  subheading?: string
}

function PropertyMatchList({
  matches, totalCount, onSelect, buildingAddress, heading, subheading,
}: PropertyMatchListProps) {
  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            {heading ?? `${totalCount} properties returned for this address`}
          </p>
          <p className="font-medium text-gray-900">{buildingAddress}</p>
          <p className="text-sm text-emerald-700">
            {/* UX2: the old line read "Showing 25 of 76 — refine search for
                fewer results", which was wrong twice. The other 51 were not
                on the page at all, and there was nothing left to refine —
                the search WAS the address the officer picked. */}
            {subheading ?? 'The county returned more than one parcel for it. Pick the one you mean.'}
          </p>
        </div>
      </div>

      <div className="border border-emerald-200 rounded-lg overflow-hidden bg-white">
        <div className="max-h-80 overflow-y-auto">
          {matches.map((match, index) => (
            <button
              key={`${match.fips}-${match.apn}-${index}`}
              onClick={() => onSelect(match)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 border-b border-emerald-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {match.address}
                    {unitLabel(match) && (
                      <span className="ml-2 text-emerald-700">{unitLabel(match)}</span>
                    )}
                  </p>
                  <p className={`text-sm ${match.owner || match.owner_name ? 'text-gray-600' : 'text-gray-500 italic'}`}>
                    {ownerLine(match)}
                  </p>
                  <p className="text-sm text-gray-500">
                    APN: {match.apn} · {match.use_code_description || match.property_type || "Property type not in county record"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Declare google maps types
declare global {
  interface Window {
    google?: typeof google
  }
}

// Parse Google address into components
interface ParsedAddress {
  street: string
  city: string
  state: string
  zip: string
  county: string
}

function parseGooglePlace(place: google.maps.places.PlaceResult, fallbackAddress: string): ParsedAddress {
  const components = place.address_components || []
  const getComponent = (type: string, useShortName = false) => {
    const component = components.find((item) => item.types.includes(type))
    return useShortName ? component?.short_name || "" : component?.long_name || ""
  }

  const streetNumber = getComponent("street_number")
  const route = getComponent("route")
  const street = [streetNumber, route].filter(Boolean).join(" ") || fallbackAddress
  const city = getComponent("locality") || getComponent("sublocality_level_1")
  const state = getComponent("administrative_area_level_1", true) || "CA"
  const zip = getComponent("postal_code")
  const county = getComponent("administrative_area_level_2").replace(/\s+County$/i, "")

  return { street, city, state, zip, county }
}

function parseGoogleAddress(fullAddress: string): ParsedAddress {
  // Example: "123 Main Street, Los Angeles, CA 90012, USA"
  const parts = fullAddress.split(', ')
  
  let street = ''
  let city = ''
  let state = 'CA'
  let zip = ''
  
  if (parts.length >= 3) {
    street = parts[0] // "123 Main Street"
    city = parts[1]   // "Los Angeles"
    
    // Parse state and zip from "CA 90012" or just "CA"
    const stateZipPart = parts[2].replace(', USA', '').replace(' USA', '')
    const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5})?/)
    if (stateZipMatch) {
      state = stateZipMatch[1]
      zip = stateZipMatch[2] || ''
    }
  } else if (parts.length === 2) {
    street = parts[0]
    city = parts[1]
  } else {
    street = fullAddress
  }
  
  return { street, city, state, zip, county: "" }
}

// ─────────────────────────────────────────────────────────────────
// Suggest → confirm → record: one SiteX-sourced field the officer must
// confirm or edit before it is treated as authorized.
// ─────────────────────────────────────────────────────────────────
// ConfirmableField now lives in components/builder/ConfirmableField.tsx,
// shared with GrantorSection.

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const { enabled: aiEnabled } = useGuidance()
  const [guidanceDismissed, setGuidanceDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchCandidate[] | null>(null)
  const [propertyMatchCount, setPropertyMatchCount] = useState(0)
  // UX2 — how this parcel came to be the parcel, and what else was on
  // offer. The server decides (see services/address_match.py); this holds
  // the answer so the screen can say it out loud and offer the way back.
  const [parcelSelection, setParcelSelection] = useState<ParcelSelection | null>(null)
  const [alternatives, setAlternatives] = useState<PropertyMatchCandidate[]>([])
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedBuildingAddress, setSelectedBuildingAddress] = useState("")
  
  // Track if user has selected an address (prevents re-triggering autocomplete)
  const [addressSelected, setAddressSelected] = useState(false)
  const [selectedParsedAddress, setSelectedParsedAddress] = useState<ParsedAddress | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  // Track dropdown position for fixed positioning
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  
  // Update dropdown position when showing suggestions
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [showSuggestions, suggestions])
  
  // Close dropdown on scroll to avoid positioning issues
  useEffect(() => {
    const handleScroll = () => {
      if (showSuggestions) {
        setShowSuggestions(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [showSuggestions])

  /**
   * THE LOADER IS CALLED FROM HERE, and that is the fix.
   *
   * This section used to look for `window.google` at mount and once more
   * at 1s, having never loaded anything itself — it depended on a script
   * tag in `layout.tsx`, three files away, which HOME2 deleted on the
   * rationale that "every consumer already loads it on demand". No
   * consumer on this route did: `useGoogleMaps` was imported nowhere.
   *
   * So the loader now lives on this component's own render path. A tag
   * removed anywhere else cannot silence this field again, and
   * `propertyAutofill.test.tsx` asserts the property rather than the tag:
   * mounting this section must cause a Places script to load.
   *
   * And it RESOLVES rather than polls. The old check missed a script
   * that arrived at 1.2s, permanently — a race the deleted tag happened
   * to win.
   */
  const places = useGoogleMaps()
  const isGoogleLoaded = places.isGoogleLoaded

  useEffect(() => {
    autocompleteService.current = places.autocompleteService
    placesService.current = places.placesService
  }, [places.autocompleteService, places.placesService])

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([])
      return
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address'],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
        }
      }
    )
  }, [])

  // Debounced search - only when user is typing (not when address is selected)
  useEffect(() => {
    if (!isGoogleLoaded || addressSelected) return
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        fetchSuggestions(searchQuery)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchSuggestions, isGoogleLoaded, addressSelected])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle address selection from Google autocomplete
  const handleSelectAddress = async (prediction: google.maps.places.AutocompletePrediction) => {
    let address = prediction.description
    let parsed = parseGoogleAddress(address)

    if (placesService.current && prediction.place_id) {
      try {
        const place = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
          placesService.current?.getDetails(
            {
              placeId: prediction.place_id,
              fields: ["address_components", "formatted_address", "geometry"],
            },
            (placeResult, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && placeResult) {
                resolve(placeResult)
              } else {
                reject(new Error(status))
              }
            }
          )
        })

        address = place.formatted_address || prediction.description
        parsed = parseGooglePlace(place, prediction.description)
      } catch (err) {
        console.warn("Google place details lookup failed:", err)
      }
    }
    
    setSearchQuery(address)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedBuildingAddress(address)
    setAddressSelected(true) // Prevent re-triggering autocomplete
    setSelectedParsedAddress(parsed)
    setPropertyMatches(null)
    setPropertyMatchCount(0)
    setError(null)
    // U3: ONE behavior — selecting a suggestion always fetches the county
    // records. The extra "now click Search" step was the nondeterminism the
    // audit flagged (state hasn't landed yet, so pass parsed directly).
    fetchPropertyData(parsed)
  }

  // Fetch property data from SiteX
  const fetchPropertyData = async (parsedArg?: ParsedAddress) => {
    const parsedAddress = parsedArg ?? selectedParsedAddress
    if (!parsedAddress) {
      setError("Please select an address from the dropdown first")
      return
    }

    setIsLoadingProperty(true)
    setError(null)
    setPropertyMatches(null)
    setPropertyMatchCount(0)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      // Build the correct payload matching backend schema:
      // address: str (REQUIRED - street address)
      // city: Optional[str]
      // state: str = "CA"
      // zip: Optional[str] (alias for zip_code)
      const payload = {
        address: parsedAddress.street,  // Backend expects "address" as street
        city: parsedAddress.city || undefined,
        state: parsedAddress.state || 'CA',
        zip_code: parsedAddress.zip || undefined,
      }
      
      console.log("Property search payload:", {
        address: payload.address,
        city: payload.city,
        state: payload.state,
        zip_code: payload.zip_code,
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search-v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      // Handle auth errors
      if (response.status === 401) {
        setError("Please log in to search properties. Your session may have expired.")
        return
      }
      
      // Handle validation errors
      if (response.status === 422) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Validation error:', errorData)
        setError(errorData.detail || "Invalid address format. Please try a different address.")
        return
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Single property found. U2.1: do NOT auto-advance past unconfirmed
        // county-record fields — advancing here is what made APN/Legal
        // "surprise gates at the finish line" (the officer never saw the
        // inline cards before the gate modal re-asked). The accordion
        // advances when the last present field is confirmed below.
        //
        // UX2: this branch now also covers "the county returned 76 and
        // exactly one of them was the address she picked". The server made
        // that call and says so in `selection`; the strip on the card
        // below repeats it, because a parcel chosen FOR the officer must
        // not look like one chosen BY her.
        const propertyData = mapSiteXResponse(result.data, searchQuery, result.selection)
        setParcelSelection(readSelection(result.selection) ?? null)
        setAlternatives(result.alternatives ?? [])
        setShowAlternatives(false)
        onChange(propertyData)
        if (propertyCandidatesRemaining(propertyData).length === 0) onComplete()

      } else if (result.status === 'multi_match' && result.matches?.length > 0) {
        setPropertyMatches(result.matches)
        setPropertyMatchCount(result.match_count || result.matches.length)
        setAlternatives(result.matches)
        setParcelSelection(null)

      } else if (result.status === 'not_found') {
        setError("Property not found in county records. Please verify the address.")
      } else {
        setError(result.message || 'Property not found. Please check the address.')
      }
    } catch (err) {
      console.error('Property search error:', err)
      setError('Failed to fetch property data. Please try again.')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  // Resolve the selected SiteX multi-match candidate.
  const handleSelectMatch = async (match: PropertyMatchCandidate) => {
    setIsLoadingProperty(true)
    setPropertyMatches(null)
    setPropertyMatchCount(0)

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/resolve-match`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fips: match.fips,
          apn: match.apn,
        }),
      })

      if (response.status === 401) {
        setError("Please log in to search properties.")
        return
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // U2.1: same rule as the single-match path — the accordion holds
        // until the county-record fields are confirmed inline.
        const propertyData = mapSiteXResponse(
          result.data, match.address || selectedBuildingAddress, result.selection)
        setParcelSelection(readSelection(result.selection) ?? null)
        setShowAlternatives(false)
        onChange(propertyData)
        if (propertyCandidatesRemaining(propertyData).length === 0) onComplete()
      } else {
        setError('Failed to fetch property details. Please try again.')
      }
    } catch (err) {
      console.error('Match resolution error:', err)
      setError('Failed to fetch property details. Please try again.')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  // Reset to search
  const handleReset = () => {
    setSearchQuery("")
    setPropertyMatches(null)
    setPropertyMatchCount(0)
    setError(null)
    setAddressSelected(false)
    setSelectedParsedAddress(null)
    setParcelSelection(null)
    setAlternatives([])
    setShowAlternatives(false)
    onChange(null as unknown as PropertyData)
    inputRef.current?.focus()
  }

  // Handle manual input (user typing instead of selecting)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    setAddressSelected(false) // User is typing, allow autocomplete
    setSelectedParsedAddress(null)
    setPropertyMatches(null)
    setPropertyMatchCount(0)
    setParcelSelection(null)
    setAlternatives([])
    setShowAlternatives(false)
    setError(null)
  }

  // U2.1: after a confirm/edit lands, advance the accordion once the LAST
  // present county-record field is confirmed — inline confirmation as the
  // data lands is the one model; the gate modal only mops up leftovers.
  const changeAndMaybeAdvance = (next: PropertyData) => {
    onChange(next)
    if (propertyCandidatesRemaining(next).length === 0) onComplete()
  }

  // Confirm a single SiteX-sourced field: flip to confirmed, stamp the time.
  const confirmField = (key: keyof PropertyProvenance) => {
    if (!value) return
    const existing = value.provenance?.[key]
    if (!existing) return
    changeAndMaybeAdvance({
      ...value,
      provenance: {
        ...value.provenance,
        [key]: { ...existing, status: 'confirmed', confirmedAt: new Date().toISOString() },
      },
    })
  }

  // Edit a SiteX-sourced field: this is the officer's authorized value, so it
  // becomes source 'user' and is confirmed immediately. Keep the bare value
  // field (read by the generation payload) in sync.
  const editField = (key: keyof PropertyProvenance, newValue: string) => {
    if (!value) return
    changeAndMaybeAdvance({
      ...value,
      [key]: newValue,
      provenance: {
        ...value.provenance,
        [key]: {
          value: newValue,
          source: 'user',
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        },
      },
    })
  }

  // Provenance fallback for properties loaded before this model existed
  // (e.g. an initialProperty passed in without provenance).
  const provenanceFor = (key: keyof PropertyProvenance): Sourced<string> => {
    const existing = value?.provenance?.[key]
    if (existing) return existing
    const bare = (key === 'apn' ? value?.apn : key === 'legalDescription' ? value?.legalDescription : value?.owner) || ''
    return { value: bare, source: 'sitex', status: 'candidate' }
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Property loaded successfully
  // ─────────────────────────────────────────────────────────────────
  if (value?.address) {
    // U0: an EMPTY field has nothing to confirm — the generation gate
    // ignores it (nothing unconfirmed can reach the PDF), so the UI must
    // not render a confirm affordance or an "unconfirmed" warning for it.
    // The audit's "No value / unconfirmed" card was exactly that mismatch.
    const hasValue = (k: 'apn' | 'legalDescription' | 'owner') =>
      !!((k === 'apn' ? value?.apn : k === 'legalDescription' ? value?.legalDescription : value?.owner) || '').trim()
    const presentKeys = (['apn', 'legalDescription', 'owner'] as const).filter(hasValue)
    const allConfirmed = presentKeys.every((k) => provenanceFor(k).status === 'confirmed')

    return (
      <div className="space-y-4">
        {/* F5: no celebration banner — just the address and the way out. */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-200">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 break-words">{value.address}</p>
            <p className="text-sm text-gray-600 mt-0.5">{value.county} County</p>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            Change
          </button>
        </div>

        {/* UX2 — WHO CHOSE THIS PARCEL.
            Every field below comes from it: APN, legal description, vested
            owner. The officer confirms each of those, and confirming a
            value proves she read it — not that it belongs to the property
            she meant. So when the server matched the parcel rather than
            the officer picking it, the screen says so, in the same place
            she is about to start confirming, with the way back next to it. */}
        {parcelSelection?.basis === 'exact_address_match' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-blue-900">
                Matched to the address you selected
                {parcelSelection.alternativeCount > 0 && (
                  <>
                    {' '}— the county returned {parcelSelection.alternativeCount}{' '}
                    other {parcelSelection.alternativeCount === 1 ? 'parcel' : 'parcels'} nearby
                  </>
                )}
                .
              </p>
              {alternatives.length > 0 && (
                <button
                  onClick={() => setShowAlternatives((open) => !open)}
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 underline flex-shrink-0"
                >
                  {showAlternatives ? 'Hide the others' : 'Not this one?'}
                </button>
              )}
            </div>
          </div>
        )}

        {showAlternatives && alternatives.length > 0 && (
          <PropertyMatchList
            matches={alternatives}
            totalCount={alternatives.length}
            onSelect={handleSelectMatch}
            buildingAddress={selectedBuildingAddress || value.address}
            heading="Everything the county returned for this address"
            subheading="Picking one here replaces the property above, and its APN, legal description and owner with it."
          />
        )}

        <div className="space-y-3">
          {hasValue('apn') && (
            <ConfirmableField
              label="APN"
              field={provenanceFor('apn')}
              onConfirm={() => confirmField('apn')}
              onEdit={(v) => editField('apn', v)}
            />
          )}
          {hasValue('owner') ? (
            <ConfirmableField
              label="Current Owner"
              field={provenanceFor('owner')}
              onConfirm={() => confirmField('owner')}
              onEdit={(v) => editField('owner', v)}
            />
          ) : value.ownerSplit?.needsReview ? (
            /* DOCTRINE A — we read something and could not split it. That is
               not "no owner returned", and saying so would be untrue. The
               original is shown as printed, nothing is offered for
               confirmation, and the officer types both halves. */
            <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg space-y-2">
              <p className="text-sm text-amber-800">{value.ownerSplit.needsReview}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">As printed</p>
              <p className="text-sm font-mono text-gray-700 break-words">
                {value.ownerSplit.verbatim}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-3 border border-gray-200 rounded-lg">
              Current owner: not returned by county records. The grantor you
              enter is what prints on the deed.
            </p>
          )}
          {/* DOCTRINE A / H1 §2.2 — the composite the record actually
              returned, for audit. Shown, never offered: there is no confirm
              affordance here because this is not a value, it is two things
              that were printed together. */}
          {value.ownerSplit?.mixedContent && !value.ownerSplit.needsReview && (
            <p className="text-xs text-gray-500 px-3">
              County record as printed:{' '}
              <span className="font-mono text-gray-600">{value.ownerSplit.verbatim}</span>
              {' — '}the vesting words are handled in the Vesting section, not here.
            </p>
          )}
          {hasValue('legalDescription') && (
            <ConfirmableField
              label="Legal Description"
              field={provenanceFor('legalDescription')}
              multiline
              onConfirm={() => confirmField('legalDescription')}
              onEdit={(v) => editField('legalDescription', v)}
            />
          )}
        </div>

        {!allConfirmed && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Confirm each county-record field above to verify the property data.
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Loading property data
  // ─────────────────────────────────────────────────────────────────
  if (isLoadingProperty) {
    return <PropertySkeleton />
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Search input with Google autocomplete
  // ─────────────────────────────────────────────────────────────────
  
  return (
    <div className="space-y-4">
      {/* AI Guidance */}
      {aiEnabled && !guidanceDismissed && !value?.address && (
        <FieldGuidance
          message="Start by searching for the property address. We'll automatically pull the APN, legal description, and current owner from county records."
          details="Type at least 3 characters to see address suggestions. Select an address from the dropdown, then click 'Search' to fetch property data. For condos or multi-unit buildings, you'll be prompted to select the specific unit."
          onDismiss={() => setGuidanceDismissed(true)}
        />
      )}

      <div className="relative" ref={suggestionsRef}>
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            // Only show suggestions if user hasn't selected an address yet
            if (!addressSelected && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && addressSelected && selectedParsedAddress) {
              e.preventDefault()
              fetchPropertyData()
            }
          }}
          placeholder="Start typing an address..."
          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
            addressSelected ? 'border-brand-500 bg-brand-50/30' : 'border-gray-300'
          }`}
          autoFocus
          autoComplete="off"
        />

        {/* F5: Search sits below the input — the old overlay button plus
            pr-28 hid the end of the address in the 420px panel. */}
        {addressSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              fetchPropertyData()
            }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-brand-500 text-white px-3 py-2.5 rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Search property records</span>
          </button>
        )}

        {/* Google Autocomplete Suggestions - Fixed position to escape scroll containers */}
        {showSuggestions && suggestions.length > 0 && !addressSelected && dropdownPosition.width > 0 && (
          <div 
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '320px',
            }}
          >
            {suggestions.slice(0, 5).map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelectAddress(prediction)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left transition-colors"
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {prediction.structured_formatting.main_text}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatSuggestionSecondary(prediction.structured_formatting.secondary_text)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {propertyMatches && propertyMatches.length > 0 && (
        <PropertyMatchList
          matches={propertyMatches}
          totalCount={propertyMatchCount}
          onSelect={handleSelectMatch}
          buildingAddress={selectedBuildingAddress}
        />
      )}

      {/* §4 IN THE PRODUCT'S MOST-USED INPUT.
          The old fallback — shown in exactly the broken state — read
          "Start typing an address and we'll pull the APN, owner, and
          legal description automatically." It was the most CONFIDENT
          sentence on the screen and it appeared only when the product
          could not do any of it. An officer typed, nothing happened, and
          the copy told her it was working.

          A bail is not a failure to the code and is indistinguishable
          from one to her, so the state now has a voice: while the loader
          is still in flight the copy promises nothing, and when it has
          failed it says so and names the way forward. */}
      {places.status === "unavailable" ? (
        <p role="status" data-testid="places-unavailable"
           className="text-sm text-amber-700 bg-amber-50 border border-amber-200
                      rounded-lg px-3 py-2">
          {places.reason}
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          {addressSelected
            ? "Click Search to pull property details from county records."
            : isGoogleLoaded
              ? "Start typing and select an address, then click Search."
              : "Loading address lookup\u2026"
          }
        </p>
      )}
    </div>
  )
}


