
import { toGrantCanonical } from './grantDeedAdapter';
import { toQuitclaimCanonical } from './quitclaimDeedAdapter';
import { toInterspousalCanonical } from './interspousalAdapter';
import { toWarrantyCanonical } from './warrantyDeedAdapter';
import { toTaxCanonical } from './taxDeedAdapter';

export function toCanonicalFor(docType: string, state: any) {
  const s = (docType || '').toLowerCase();
  if (s.includes('interspousal')) return toInterspousalCanonical(state);
  if (s.includes('quitclaim')) return toQuitclaimCanonical(state);
  if (s.includes('warranty')) return toWarrantyCanonical(state);
  if (s.includes('tax')) return toTaxCanonical(state);
  return toGrantCanonical(state);
}
