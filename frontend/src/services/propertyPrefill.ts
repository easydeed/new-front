/**
 * Property Prefill Service
 * 
 * Populates wizard state from SiteX property enrichment data.
 * Handles smart defaults for DTT area type, grantor formatting, etc.
 * 
 * Part 1.5 of DeedPro Wizard Integration
 */

import { addRecentProperty } from "./recentProperties"
import { cityDttRate, isIncorporated } from "@/lib/jurisdictions"
import { splitVestedOwner } from "@/lib/vestingSplit"

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
 * T-2 — THE THIRD COPY IS GONE.
 *
 * A2 unified the partner API's city table with dttCalc's and pinned them
 * together. This file kept its own, and nobody noticed because nothing
 * compared them. The two lists disagreed in both directions: this one
 * carried Hayward, Richmond, Alameda, Palo Alto and a dozen more that
 * dttCalc had never heard of, and it OMITTED Inglewood, Long Beach and
 * Pasadena, which dttCalc rates.
 *
 * That omission had teeth. This list decides `areaType`, and `areaType`
 * gates whether the city portion is computed at all — so a Long Beach
 * property was prefilled "unincorporated" and its city transfer tax was
 * silently skipped. Undercharging by exactly the mechanism that
 * overcharged South San Francisco.
 *
 * Both questions now go to lib/jurisdictions.ts, and they are asked
 * SEPARATELY, because they were never the same question: whether a place
 * is incorporated is not whether it taxes. Glendale is an incorporated
 * city that levies no DTT; the old code called it "unincorporated"
 * because that produced the right tax by accident.
 */
export function inferDTTAreaType(city: string): "city" | "unincorporated" {
  if (!city) return "unincorporated"
  // Only an affirmative "this place is unincorporated" may say so. An
  // unknown place is NOT evidence of unincorporation — defaulting it to
  // "unincorporated" is what silently skipped Long Beach's city tax.
  return isIncorporated(city) === false ? "unincorporated" : "city"
}

/**
 * Whether the city levies its own DTT. `false` means we KNOW it does not;
 * unknown places are not asserted either way — computeDttBreakdown
 * surfaces them to the officer instead of assuming.
 */
export function cityHasOwnDTT(city: string): boolean {
  if (!city) return false
  return cityDttRate(city).state === "rated"
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
 * DOCTRINE A — `suggestVesting` and `detectMarriedCouple` were DELETED here.
 *
 * What they did:
 *
 *     one owner                      → "Sole and Separate Property"
 *     two owners, same last name     → "Community Property with Right of
 *                                       Survivorship"
 *     two owners, different surnames → "Tenants in Common"
 *
 * and `prefillFromEnrichment` wrote the result straight into
 * `state.vesting` with no acceptance record, no basis, and no violet.
 *
 * Every line of that is a legal conclusion reached by comparing the last
 * word of two strings. A shared surname is not a marriage — it is siblings,
 * a parent and child, a coincidence. Different surnames are not tenancy in
 * common — married couples routinely keep their own names. And "sole and
 * separate" is a statement about a spouse's interest, asserted here about
 * people whose marital status we never learned.
 *
 * Nothing imported these, which is the only reason no deed carries a
 * vesting DeedPro invented from a surname match. But a dormant path is
 * still a path, sitting in `services/` under an inviting name, and the next
 * person wiring county-record prefill would have found it and used it. So
 * it is deleted rather than deprecated: Doctrine A's pin is that no code
 * path may write a characterization into a confirmed field without an
 * acceptance record, and "no code path" includes the ones not currently
 * called.
 *
 * The vesting a county record ACTUALLY reports is different in kind — it is
 * an observation, not an inference — and it now travels the supported
 * route: `lib/vestingSplit.ts` separates it from the owner's name, and it
 * reaches the deed only through the officer's explicit acceptance in the
 * Vesting section, recorded as a legal choice with its basis.
 */

/**
 * Main prefill function - populates wizard state from SiteX data
 */
export function prefillFromEnrichment(
  propertyData: PropertyData,
  currentState: WizardState
): WizardState {
  const primaryOwnerName = propertyData.primary_owner?.full_name || ""
  const secondaryOwnerName = propertyData.secondary_owner?.full_name || ""
  // DOCTRINE A: the joined owner string may be a name PLUS a vesting
  // characterization. Only the parties may become the grantor.
  const grantorSplit = splitVestedOwner(
    formatGrantorName(primaryOwnerName, secondaryOwnerName))
  const grantorName = grantorSplit?.parties ?? ""
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

    // DOCTRINE A: vesting is NOT prefilled. `vesting_type` is the county
    // record's reading of how the CURRENT owner holds title, and writing it
    // here would answer a different question (how the grantees will hold it)
    // with no acceptance record and no basis shown. It travels as a proposal
    // on `property.ownerSplit.vestingProposal` instead, and the officer's
    // acceptance in the Vesting section is what writes it.
    vesting: currentState.vesting,

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
