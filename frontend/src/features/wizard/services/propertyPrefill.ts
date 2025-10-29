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
  
  // ✅ PHASE 19 HOTFIX #7: Always overwrite with fresh SiteX data (don't preserve old values)
  const grantorFromSiteX = [verifiedData.currentOwnerPrimary, verifiedData.currentOwnerSecondary]
    .filter(Boolean)
    .join('; ');
  
  // Prefill Step 2 (Request Details) with APN
  setGrantDeed((prev) => ({
    ...prev,
    step2: {
      ...prev.step2,
      apn: verifiedData.apn || '', // ✅ Use SiteX data or empty (don't preserve old)
    },
    step4: {
      ...prev.step4,
      // ✅ PHASE 19 HOTFIX #7: Always use fresh SiteX data (overwrite old values)
      grantorsText: grantorFromSiteX || '', // Don't preserve prev.step4?.grantorsText
      county: verifiedData.county || '', // Don't preserve prev.step4?.county
      legalDescription: verifiedData.legalDescription || '', // Don't preserve prev.step4?.legalDescription
    },
  }));
}

