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
  
  // ✅ PHASE 19 HOTFIX #9: DO NOT merge with previous state!
  // Modern Wizard's proven pattern: REPLACE data, don't merge
  const grantorFromSiteX = [verifiedData.currentOwnerPrimary, verifiedData.currentOwnerSecondary]
    .filter(Boolean)
    .join('; ');
  
  console.log('[prefillFromEnrichment] 🔄 REPLACING wizard data with fresh SiteX (no merge!)');
  console.log('[prefillFromEnrichment] SiteX data:', {
    apn: verifiedData.apn,
    grantor: grantorFromSiteX,
    county: verifiedData.county,
    legalDescription: verifiedData.legalDescription?.substring(0, 50)
  });
  
  // ✅ CRITICAL FIX: DO NOT use prev state! Set fresh data only!
  setGrantDeed({
    step2: {
      apn: verifiedData.apn || '',
    },
    step3: {},  // ✅ Empty - no old data!
    step4: {
      grantorsText: grantorFromSiteX || '',
      granteesText: '', // ✅ Empty for user to fill
      county: verifiedData.county || '',
      legalDescription: verifiedData.legalDescription || '',
    },
  });
}

