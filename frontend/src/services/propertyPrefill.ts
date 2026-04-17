/**
 * Property Prefill Service
 * 
 * Populates wizard state from SiteX property enrichment data.
 * Handles smart defaults for DTT area type, grantor formatting, etc.
 * 
 * Part 1.5 of DeedPro Wizard Integration
 */

import { addRecentProperty } from "./recentProperties"

/**
 * Property data from SiteX enrichment
 */
interface PropertyData {
  address: string
  city: string
  state: string
  zip_code: string
  county: string
  apn: string
  fips?: string
  legal_description?: string
  legalDescription?: string
  primary_owner?: {
    full_name: string
    first_name?: string
    last_name?: string
  }
  secondary_owner?: {
    full_name: string
  }
  vesting_type?: string
}

/**
 * Wizard state to prefill
 */
interface WizardState {
  propertyAddress?: string
  city?: string
  county?: string
  state?: string
  zip?: string
  apn?: string
  legalDescription?: string
  grantorName?: string
  granteeName?: string
  vesting?: string
  dtt?: {
    area_type?: "city" | "unincorporated"
    city_name?: string
    is_exempt?: boolean
    exempt_reason?: string
  }
  step1?: {
    grantorName?: string
  }
  _enriched?: boolean
  _enrichedAt?: string
  _enrichmentSource?: string
  _primaryOwner?: string
  _secondaryOwner?: string
  [key: string]: any
}

/**
 * Cities in California that have their own Documentary Transfer Tax.
 * These require selecting "City" in the DTT section.
 */
const CITIES_WITH_OWN_DTT = [
  "los angeles",
  "san francisco",
  "oakland",
  "berkeley",
  "san jose",
  "sacramento",
  "riverside",
  "pomona",
  "culver city",
  "santa monica",
  "redondo beach",
  "hercules",
  "hayward",
  "richmond",
  "alameda",
  "albany",
  "emeryville",
  "piedmont",
  "san leandro",
  "san pablo",
  "mountain view",
  "palo alto",
  "petaluma",
  "santa rosa",
  "sebastopol",
  "cotati",
  "cloverdale",
]

/**
 * Infer DTT area type based on city
 */
export function inferDTTAreaType(city: string): "city" | "unincorporated" {
  if (!city) return "unincorporated"
  return CITIES_WITH_OWN_DTT.includes(city.toLowerCase()) ? "city" : "unincorporated"
}

/**
 * Check if a city has its own DTT
 */
export function cityHasOwnDTT(city: string): boolean {
  if (!city) return false
  return CITIES_WITH_OWN_DTT.includes(city.toLowerCase())
}

/**
 * Format owner names for grantor field.
 * Handles single owner, married couples, trusts, etc.
 */
export function formatGrantorName(primaryOwner?: string, secondaryOwner?: string): string {
  if (!primaryOwner) return ""

  // If secondary owner exists, combine them
  if (secondaryOwner) {
    return `${primaryOwner} and ${secondaryOwner}`
  }

  return primaryOwner
}

/**
 * Detect if names suggest a married couple
 */
export function detectMarriedCouple(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false

  // Check if they share a last name
  const lastName1 = name1.split(" ").pop()?.toLowerCase()
  const lastName2 = name2.split(" ").pop()?.toLowerCase()

  return lastName1 === lastName2 && lastName1 !== undefined
}

/**
 * Suggest vesting based on property data
 */
export function suggestVesting(
  primaryOwner?: string,
  secondaryOwner?: string
): string | null {
  if (!primaryOwner) return null

  // Single owner
  if (!secondaryOwner) {
    return "Sole and Separate Property"
  }

  // Two owners with same last name - likely married
  if (detectMarriedCouple(primaryOwner, secondaryOwner)) {
    return "Community Property with Right of Survivorship"
  }

  // Two owners with different last names
  return "Tenants in Common"
}

/**
 * Main prefill function - populates wizard state from SiteX data
 */
export function prefillFromEnrichment(
  propertyData: PropertyData,
  currentState: WizardState
): WizardState {
  const primaryOwnerName = propertyData.primary_owner?.full_name || ""
  const secondaryOwnerName = propertyData.secondary_owner?.full_name || ""
  const grantorName = formatGrantorName(primaryOwnerName, secondaryOwnerName)
  const dttAreaType = inferDTTAreaType(propertyData.city)
  const legalDesc = propertyData.legal_description || propertyData.legalDescription || ""

  // Save to recent properties
  if (propertyData.apn) {
    addRecentProperty({
      address: propertyData.address,
      city: propertyData.city,
      state: propertyData.state || "CA",
      county: propertyData.county,
      apn: propertyData.apn,
      ownerName: grantorName,
      legalDescription: legalDesc,
    })
  }

  // Suggest vesting if not already set
  const suggestedVesting = currentState.vesting
    ? currentState.vesting
    : suggestVesting(primaryOwnerName, secondaryOwnerName) || ""

  return {
    ...currentState,

    // Property identification
    propertyAddress: propertyData.address,
    fullAddress: propertyData.address,
    city: propertyData.city,
    county: propertyData.county,
    state: propertyData.state || "CA",
    zip: propertyData.zip_code,
    apn: propertyData.apn,

    // Legal description
    legalDescription: legalDesc,

    // Grantor (current owner)
    step1: {
      ...currentState.step1,
      grantorName: grantorName,
    },
    grantorName: grantorName,

    // DTT defaults
    dtt: {
      ...currentState.dtt,
      area_type: dttAreaType,
      city_name: dttAreaType === "city" ? propertyData.city : "",
    },
    areaType: dttAreaType,
    cityName: dttAreaType === "city" ? propertyData.city : "",

    // Vesting hint
    vesting: propertyData.vesting_type || suggestedVesting,

    // Metadata for AI assistance
    _enriched: true,
    _enrichedAt: new Date().toISOString(),
    _enrichmentSource: "sitex",
    _primaryOwner: primaryOwnerName,
    _secondaryOwner: secondaryOwnerName,
  }
}

/**
 * Extract property data needed for prefill from API response
 */
export function normalizePropertyResponse(data: any): PropertyData {
  return {
    address: data.address || data.fullAddress || "",
    city: data.city || "",
    state: data.state || "CA",
    zip_code: data.zip_code || data.zip || "",
    county: data.county || "",
    apn: data.apn || "",
    fips: data.fips || "",
    legal_description: data.legal_description || data.legalDescription || "",
    primary_owner: data.primary_owner || {
      full_name: data.currentOwner || data.owner_name || "",
    },
    secondary_owner: data.secondary_owner,
    vesting_type: data.vesting_type,
  }
}
