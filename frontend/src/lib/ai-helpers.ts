import type { DeedBuilderState, PropertyData, DTTData } from "@/types/builder"

// ─────────────────────────────────────────────────────────────────
// CONTEXT DETECTION
// ─────────────────────────────────────────────────────────────────

export interface AIContext {
  ownershipType: "single" | "married" | "trust" | "entity" | "multiple" | "unknown"
  flags: string[]
}

export function analyzePropertyContext(property: PropertyData | null): AIContext {
  const context: AIContext = { ownershipType: "unknown", flags: [] }
  
  if (!property?.owner) return context
  
  const owner = property.owner.toUpperCase()

  // Detect trust ownership
  if (owner.includes("TRUST") || owner.includes("TRUSTEE") || owner.includes("TR ")) {
    context.ownershipType = "trust"
    context.flags.push("Property is currently held in a trust")
    return context
  }

  // Detect entity ownership
  if (
    owner.includes(" LLC") ||
    owner.includes(" INC") ||
    owner.includes(" CORP") ||
    owner.includes(" LP") ||
    owner.includes(" LLP") ||
    owner.includes("COMPANY")
  ) {
    context.ownershipType = "entity"
    context.flags.push("Property owned by business entity")
    return context
  }

  // Detect married couple patterns
  if (
    owner.includes("HUSBAND AND WIFE") ||
    owner.includes("WIFE AND HUSBAND") ||
    owner.includes("MARRIED") ||
    owner.includes("H/W") ||
    owner.includes("H&W")
  ) {
    context.ownershipType = "married"
    return context
  }

  // Detect multiple owners (has "AND" but not obviously married)
  if (owner.includes(" AND ") || owner.includes(" & ")) {
    context.ownershipType = "multiple"
    return context
  }

  // Single owner
  context.ownershipType = "single"
  return context
}

// ─────────────────────────────────────────────────────────────────
// VESTING SUGGESTIONS
// ─────────────────────────────────────────────────────────────────

export interface VestingSuggestion {
  value: string
  label: string
  reason: string
  confidence: "high" | "medium" | "low"
}

export function getVestingSuggestion(
  grantee: string,
  granteeCount: number,
  deedType: string
): VestingSuggestion | null {
  if (!grantee?.trim()) return null

  const granteeLower = grantee.toLowerCase()

  // ─── Trust Pattern ───
  if (
    granteeLower.includes("trust") ||
    granteeLower.includes("trustee") ||
    granteeLower.includes(" tr ")
  ) {
    // Try to extract trust name
    const trustMatch = grantee.match(/(.+(?:TRUST|LIVING TRUST|FAMILY TRUST))/i)
    const trustName = trustMatch ? trustMatch[1].trim() : "[TRUST NAME]"
    
    return {
      value: `as Trustee(s) of the ${trustName}`,
      label: "Trustee of Trust",
      reason: "Grantee appears to be a trust",
      confidence: "high",
    }
  }

  // ─── Interspousal Transfer ───
  if (deedType === "interspousal-transfer") {
    if (granteeCount === 1) {
      return {
        value: "a married person as their sole and separate property",
        label: "Sole and Separate Property",
        reason: "Standard vesting for interspousal transfers",
        confidence: "high",
      }
    }
  }

  // ─── Married Couple Patterns ───
  const marriedPatterns = [
    /husband and wife/i,
    /wife and husband/i,
    /mr\.?\s+and\s+mrs\.?/i,
    /(\w+)\s+and\s+(\w+)\s+\1/i, // "John and Jane Smith" (same last name)
  ]

  const looksMarried = marriedPatterns.some((p) => p.test(grantee))

  // Also check: two people with same last name
  if (!looksMarried && granteeCount === 2 && grantee.includes(" AND ")) {
    const parts = grantee.split(/\s+AND\s+/i)
    if (parts.length === 2) {
      const lastName1 = parts[0].trim().split(/\s+/).pop()
      const lastName2 = parts[1].trim().split(/\s+/).pop()
      if (lastName1 && lastName2 && lastName1 === lastName2) {
        return {
          value: "husband and wife as community property with right of survivorship",
          label: "Community Property with Survivorship",
          reason: "Grantees share the same last name — possibly married",
          confidence: "medium",
        }
      }
    }
  }

  if (looksMarried && granteeCount === 2) {
    return {
      value: "husband and wife as community property with right of survivorship",
      label: "Community Property with Survivorship",
      reason: "Grantees appear to be a married couple",
      confidence: "high",
    }
  }

  // ─── Two Individuals (not obviously married) ───
  if (granteeCount === 2) {
    return {
      value: "as joint tenants with right of survivorship",
      label: "Joint Tenants",
      reason: "Common choice for two co-owners",
      confidence: "medium",
    }
  }

  // ─── Single Person ───
  if (granteeCount === 1) {
    // Can't reliably detect marital status, so offer generic
    return {
      value: "a single person",
      label: "Single Person",
      reason: "Single grantee — adjust if married",
      confidence: "low",
    }
  }

  // ─── 3+ Grantees ───
  if (granteeCount >= 3) {
    return {
      value: "as joint tenants with right of survivorship",
      label: "Joint Tenants",
      reason: "Multiple grantees — joint tenancy provides survivorship",
      confidence: "medium",
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────
// TRANSFER TAX SUGGESTIONS
// ─────────────────────────────────────────────────────────────────

// (getTransferTaxSuggestion removed — superseded by lib/dttSuggestions.ts, Ticket TT)

// (validateDeedData removed — superseded by lib/deedValidation.ts, Ticket V)
export function countGrantees(grantee: string | undefined): number {
  if (!grantee?.trim()) return 0
  // Count "AND" separators
  const andMatches = grantee.match(/\s+AND\s+/gi) || []
  return andMatches.length + 1
}

