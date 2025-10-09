// Phase 11 Prequal - Property enrichment data prefill utility

export type VerifiedData = {
  apn?: string;
  county?: string;
  legalDescription?: string;
  currentOwnerPrimary?: string;
  currentOwnerSecondary?: string;
  addressLine?: string;
  property_address?: string;
};

export function prefillFromEnrichment(
  verifiedData: VerifiedData,
  setGrantDeed: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
) {
  if (!verifiedData) return;
  
  // Prefill Step 2 (Request Details) with APN
  setGrantDeed((prev) => ({
    ...prev,
    step2: {
      ...prev.step2,
      apn: verifiedData.apn || prev.step2?.apn,
    },
    step4: {
      ...prev.step4,
      // Prefill grantors from current owners
      grantorsText: [verifiedData.currentOwnerPrimary, verifiedData.currentOwnerSecondary]
        .filter(Boolean)
        .join('; ') || prev.step4?.grantorsText,
      // Prefill county
      county: verifiedData.county || prev.step4?.county,
      // Prefill legal description
      legalDescription: verifiedData.legalDescription || prev.step4?.legalDescription,
    },
  }));
}

