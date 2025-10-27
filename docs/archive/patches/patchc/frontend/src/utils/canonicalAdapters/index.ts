import { toCanonical as grant } from './grantDeed';
import { toCanonical as quitclaim } from './quitclaim';
import { toCanonical as interspousal } from './interspousal';
import { toCanonical as warranty } from './warranty';
import { toCanonical as taxDeed } from './taxDeed';

export function toCanonicalFor(docType: string, state: any) {
  switch (docType) {
    case 'grant-deed': return grant(state);
    case 'quitclaim-deed': return quitclaim(state);
    case 'interspousal-transfer': return interspousal(state);
    case 'warranty-deed': return warranty(state);
    case 'tax-deed': return taxDeed(state);
    default: return grant(state);
  }
}
