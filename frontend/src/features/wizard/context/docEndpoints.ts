/**
 * ✅ PHASE 19b: Shared PDF Endpoint Map
 * 
 * Single source of truth for mapping deed types to their PDF generation endpoints.
 * Handles both canonical (snake_case) and hyphenated formats for robustness.
 * 
 * Used by:
 * - Classic Wizard: Step5PreviewFixed
 * - Modern Wizard: Can use if needed for consistency
 */

export type DocType =
  | 'grant-deed'
  | 'grant_deed'
  | 'quitclaim-deed'
  | 'quitclaim_deed'
  | 'interspousal-transfer'
  | 'interspousal_transfer'
  | 'warranty-deed'
  | 'warranty_deed'
  | 'tax-deed'
  | 'tax_deed';

/**
 * Maps deed types to their backend PDF generation endpoints.
 * Supports both hyphenated (frontend) and snake_case (backend) formats.
 */
export const DOC_ENDPOINTS: Record<string, string> = {
  // Grant Deed
  'grant-deed': '/api/generate/grant-deed-ca',
  'grant_deed': '/api/generate/grant-deed-ca',
  
  // Quitclaim Deed
  'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
  'quitclaim_deed': '/api/generate/quitclaim-deed-ca',
  
  // Interspousal Transfer
  'interspousal-transfer': '/api/generate/interspousal-transfer-ca',
  'interspousal_transfer': '/api/generate/interspousal-transfer-ca',
  
  // Warranty Deed
  'warranty-deed': '/api/generate/warranty-deed-ca',
  'warranty_deed': '/api/generate/warranty-deed-ca',
  
  // Tax Deed
  'tax-deed': '/api/generate/tax-deed-ca',
  'tax_deed': '/api/generate/tax-deed-ca',
};

/**
 * Get the correct PDF generation endpoint for a given deed type.
 * 
 * @param docType - The deed type (canonical or hyphenated)
 * @returns The API endpoint for generating the PDF
 * 
 * @example
 * getGenerateEndpoint('grant-deed') // '/api/generate/grant-deed-ca'
 * getGenerateEndpoint('quitclaim_deed') // '/api/generate/quitclaim-deed-ca'
 */
export function getGenerateEndpoint(docType: string): string {
  const endpoint = DOC_ENDPOINTS[docType];
  
  if (!endpoint) {
    console.warn(
      `[docEndpoints] Unknown docType: "${docType}" - falling back to grant-deed endpoint.`,
      'Valid types:',
      Object.keys(DOC_ENDPOINTS)
    );
    return DOC_ENDPOINTS['grant-deed'];
  }
  
  console.log(`[docEndpoints] ✅ Mapped "${docType}" → ${endpoint}`);
  return endpoint;
}

