
/**
 * DOCTRINE A — `AIContext` and `analyzePropertyContext` were DELETED here.
 *
 * What it did: read `property.owner`, matched "HUSBAND AND WIFE" /
 * "MARRIED" / "TRUSTEE" / " LLC" against it, and returned an
 * `ownershipType` of "married" | "trust" | "entity" | "multiple" |
 * "single" — a legal characterization of how title is held, derived by
 * substring search over a name field.
 *
 * That is the same defect as `suggestVesting` in services/propertyPrefill,
 * and the same defect RED0 named as R3-2: a taxonomy drawn by field NAME,
 * reaching conclusions about CONTENT. Nothing imported it, which is the
 * only reason no deed carries a conclusion it reached. A dormant code path
 * is still a code path.
 *
 * It was also, as of the split, about to become quietly wrong: the vesting
 * words it searched for no longer live in `property.owner` — they live in
 * `property.ownerSplit.vestingProposal`, unaccepted. Every ownership it
 * classified as "married" would have started coming back "multiple", and
 * nothing would have said so. Deleting it beats fixing it: the honest
 * source for how title is held is the record's own characterization,
 * carried as a proposal the officer accepts, not an inference from
 * somebody's surname.
 *
 * `getVestingSuggestion` below is a different thing and stays: it reads
 * the GRANTEE the officer typed, proposes in violet, and is applied only
 * by acceptance (§1, pinned in vestingDecision.test.ts).
 */

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

