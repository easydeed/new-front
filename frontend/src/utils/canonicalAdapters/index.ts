import { toCanonical as grant } from './grantDeed';
import { toCanonical as quitclaim } from './quitclaim';
import { toCanonical as interspousal } from './interspousal';
import { toCanonical as warranty } from './warranty';
import { toCanonical as taxDeed } from './taxDeed';

export function toCanonicalFor(docType: string, state: any) {
  // ✅ PHASE 19 FIX: Use CANONICAL docType format (grant_deed, quitclaim, etc.)
  // ModernEngine passes canonical format from canonicalFromUrlParam()
  switch (docType) {
    case 'grant_deed':
    case 'grant-deed':
      return grant(state);
    
    case 'quitclaim':
    case 'quitclaim-deed':
      return quitclaim(state);
    
    case 'interspousal_transfer':
    case 'interspousal-transfer':
      return interspousal(state);
    
    case 'warranty_deed':
    case 'warranty-deed':
      return warranty(state);
    
    case 'tax_deed':
    case 'tax-deed':
      return taxDeed(state);
    
    default:
      console.warn('[toCanonicalFor] Unknown docType:', docType, '- falling back to grant deed');
      return grant(state);
  }
}

