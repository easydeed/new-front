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
  const granteeUpper = grantee.toUpperCase()

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

export interface TransferTaxSuggestion {
  isExempt: boolean
  exemptReason: string
  reason: string
  confidence: "high" | "medium" | "low"
}

export function getTransferTaxSuggestion(
  deedType: string,
  grantor: string,
  grantee: string
): TransferTaxSuggestion | null {
  const grantorUpper = (grantor || "").toUpperCase().trim()
  const granteeUpper = (grantee || "").toUpperCase().trim()

  // ─── Interspousal Transfer ───
  if (deedType === "interspousal-transfer") {
    return {
      isExempt: true,
      exemptReason: "R&T 11927",
      reason: "Interspousal transfers are exempt from documentary transfer tax",
      confidence: "high",
    }
  }

  // ─── Transfer to Revocable Trust ───
  if (granteeUpper.includes("TRUST") || granteeUpper.includes("TRUSTEE")) {
    // Check if same person transferring to their own trust
    const grantorNames = grantorUpper.replace(/AND/g, " ").split(/\s+/).filter(Boolean)
    const hasSameNameInTrust = grantorNames.some(
      (name) => name.length > 2 && granteeUpper.includes(name)
    )

    if (hasSameNameInTrust) {
      return {
        isExempt: true,
        exemptReason: "R&T 11930",
        reason: "Transfer to grantor's own revocable trust is typically exempt",
        confidence: "high",
      }
    } else {
      return {
        isExempt: true,
        exemptReason: "R&T 11930",
        reason: "Transfers to revocable trusts are often exempt — verify trust ownership",
        confidence: "medium",
      }
    }
  }

  // ─── Transfer from Trust ───
  if (grantorUpper.includes("TRUST") || grantorUpper.includes("TRUSTEE")) {
    const granteeNames = granteeUpper.replace(/AND/g, " ").split(/\s+/).filter(Boolean)
    const hasSameNameFromTrust = granteeNames.some(
      (name) => name.length > 2 && grantorUpper.includes(name)
    )

    if (hasSameNameFromTrust) {
      return {
        isExempt: true,
        exemptReason: "R&T 11930",
        reason: "Transfer from trust to beneficiary is typically exempt",
        confidence: "medium",
      }
    }
  }

  // ─── Same Person (Name Change / Correction) ───
  if (grantorUpper && granteeUpper && grantorUpper === granteeUpper) {
    return {
      isExempt: true,
      exemptReason: "R&T 11911",
      reason: "No change in ownership — likely a name correction",
      confidence: "high",
    }
  }

  // ─── Quitclaim (possible gift) ───
  if (deedType === "quitclaim-deed") {
    // Don't auto-suggest, but could hint
    return null
  }

  return null
}

// ─────────────────────────────────────────────────────────────────
// PRE-GENERATE VALIDATION
// ─────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  level: "error" | "warning" | "info"
  section: string
  message: string
  suggestion?: string
}

export function validateDeedData(state: DeedBuilderState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const grantorUpper = (state.grantor || "").trim().toUpperCase()
  const granteeUpper = (state.grantee || "").trim().toUpperCase()
  const granteeCount = countGrantees(state.grantee)

  // ─── Grantor = Grantee ───
  if (grantorUpper && granteeUpper && grantorUpper === granteeUpper) {
    issues.push({
      level: "warning",
      section: "grantee",
      message: "Grantor and Grantee are identical",
      suggestion: "Is this a name correction or entity change?",
    })
  }

  // ─── Vesting Mismatch ───
  if (granteeCount === 1 && state.vesting?.toLowerCase().includes("joint tenant")) {
    issues.push({
      level: "error",
      section: "vesting",
      message: "Joint tenancy requires 2 or more grantees",
      suggestion: "Add another grantee or change vesting type",
    })
  }

  if (granteeCount === 1 && state.vesting?.toLowerCase().includes("community property")) {
    issues.push({
      level: "error",
      section: "vesting",
      message: "Community property requires 2 grantees",
      suggestion: "Add spouse or change vesting type",
    })
  }

  // ─── Trust Vesting Without Trust Name ───
  if (state.vesting?.toLowerCase().includes("trustee")) {
    const hasPlaceholder = state.vesting.includes("[") || state.vesting.includes("___")
    const hasTrustWord = state.vesting.toLowerCase().includes("trust")
    
    if (hasPlaceholder) {
      issues.push({
        level: "warning",
        section: "vesting",
        message: "Trust name placeholder detected",
        suggestion: "Replace [TRUST NAME] with the actual trust name",
      })
    }
  }

  // ─── Missing Exemption Reason ───
  if (state.dtt?.isExempt && !state.dtt?.exemptReason) {
    issues.push({
      level: "warning",
      section: "transferTax",
      message: "Exempt selected but no reason provided",
      suggestion: "Select an exemption code for the recorder",
    })
  }

  // ─── Missing Transfer Value (when not exempt) ───
  if (state.dtt && !state.dtt.isExempt && !state.dtt.transferValue) {
    issues.push({
      level: "warning",
      section: "transferTax",
      message: "Transfer value not entered",
      suggestion: "Enter the consideration amount or mark as exempt",
    })
  }

  // ─── High Value Property Notice ───
  if (state.dtt?.transferValue) {
    const value = parseFloat(state.dtt.transferValue.replace(/[^0-9]/g, ""))
    if (value > 5000000) {
      issues.push({
        level: "info",
        section: "transferTax",
        message: "High-value property — verify tax calculation",
        suggestion: "Some jurisdictions have additional taxes for high-value transfers",
      })
    }
  }

  // ─── Missing Legal Description ───
  if (!state.property?.legalDescription) {
    issues.push({
      level: "warning",
      section: "property",
      message: "No legal description found",
      suggestion: "Deed may need manual legal description entry",
    })
  }

  return issues
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

export function countGrantees(grantee: string | undefined): number {
  if (!grantee?.trim()) return 0
  // Count "AND" separators
  const andMatches = grantee.match(/\s+AND\s+/gi) || []
  return andMatches.length + 1
}
