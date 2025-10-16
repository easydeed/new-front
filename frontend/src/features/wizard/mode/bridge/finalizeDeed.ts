/**
 * Bridge for finalizeDeed - Adapts Patch6 SmartReview to use our existing finalizeDeed service
 * Phase 15 v5: This bridges the validation gate (Patch6) with our existing finalize logic
 */

import finalizeDeedService from '@/services/finalizeDeed';
import { toCanonicalFor } from '@/features/wizard/adapters';

/**
 * Finalize deed using validation-canonical adapter
 * @param docType - Deed type (e.g., 'grant-deed')
 * @param wizardData - Raw wizard state from Zustand store
 * @returns Deed ID if successful, null if failed
 */
export async function finalizeDeed(docType: string, wizardData: any): Promise<string | null> {
  try {
    // Build canonical payload using our existing adapters
    const payload = toCanonicalFor(docType, wizardData);
    
    console.log('[finalizeDeed Bridge] Calling service with payload:', payload);
    
    // Call our existing finalizeDeed service
    const result = await finalizeDeedService(payload);
    
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

