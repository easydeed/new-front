/**
 * Bridge for finalizeDeed - Adapts Patch6 SmartReview to use our existing finalizeDeed service
 * Phase 15 v5: This bridges the validation gate (Patch6) with our existing finalize logic
 */

import finalizeDeedService from '@/services/finalizeDeed';
import { toCanonicalFromWizardData } from '@/features/wizard/validation/adapters';  // PATCH6 FIX: Use resilient adapter

/**
 * Finalize deed using Patch6 canonical adapter
 * @param docType - Deed type (e.g., 'grant-deed')
 * @param wizardData - Raw wizard state from Zustand store
 * @returns Deed ID if successful, null if failed
 */
export async function finalizeDeed(docType: string, wizardData: any): Promise<string | null> {
  try {
    console.log('[finalizeDeed Bridge] Raw wizardData:', wizardData);
    
    // PATCH6 FIX: Use toCanonicalFromWizardData (resilient to multiple state shapes)
    const payload = toCanonicalFromWizardData(wizardData, docType);
    
    console.log('[finalizeDeed Bridge] Canonical payload:', payload);
    
    // Flatten to backend format (snake_case)
    const backendPayload = {
      deed_type: payload.docType,
      property_address: payload.property?.address || '',
      apn: payload.property?.apn || '',
      county: payload.property?.county || '',
      legal_description: payload.property?.legalDescription || null,
      grantor_name: payload.parties?.grantor?.name || '',
      grantee_name: payload.parties?.grantee?.name || '',
      vesting: payload.vesting?.description || null
    };
    
    console.log('[finalizeDeed Bridge] Backend payload:', backendPayload);
    
    // Call our existing finalizeDeed service with flattened payload
    const result = await finalizeDeedService(backendPayload);
    
    if (result.success && result.deedId) {
      console.log('[finalizeDeed Bridge] Success! Deed ID:', result.deedId);
      return result.deedId;
    }
    
    console.error('[finalizeDeed Bridge] Failed:', result.error);
    alert(`Failed to create deed: ${result.error || 'Unknown error'}`);
    return null;
  } catch (e: any) {
    console.error('[finalizeDeed Bridge] Exception:', e);
    alert(`An error occurred: ${e.message || 'Unknown error'}`);
    return null;
  }
}

