
export type CanonicalPayload = {
  deedType: string;
  property: { address?: string; apn?: string; county?: string; legalDescription?: string };
  parties: { grantor?: { name?: string }; grantee?: { name?: string } };
  vesting?: { description?: string|null };
  requestDetails?: { requestedBy?: string; titleCompany?: string; escrowNo?: string; titleOrderNo?: string };
  mailTo?: { name?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  transferTax?: { amount?: number; assessedValue?: number };
};

import { toCanonical as grantTo, fromCanonical as grantFrom } from './grantDeed';
import { toCanonical as quitTo, fromCanonical as quitFrom } from './quitclaim';
import { toCanonical as interTo, fromCanonical as interFrom } from './interspousal';
import { toCanonical as warrTo, fromCanonical as warrFrom } from './warranty';
import { toCanonical as taxTo, fromCanonical as taxFrom } from './tax';

export function toCanonicalFor(docType: string, state: any): CanonicalPayload {
  switch ((docType || '').replace('_','-')) {
    case 'grant-deed': return grantTo(state);
    case 'quitclaim-deed': return quitTo(state);
    case 'interspousal-transfer': return interTo(state);
    case 'warranty-deed': return warrTo(state);
    case 'tax-deed': return taxTo(state);
    default: return grantTo(state);
  }
}

export function fromCanonicalFor(docType: string, payload: CanonicalPayload): any {
  switch ((docType || '').replace('_','-')) {
    case 'grant-deed': return grantFrom(payload);
    case 'quitclaim-deed': return quitFrom(payload);
    case 'interspousal-transfer': return interFrom(payload);
    case 'warranty-deed': return warrFrom(payload);
    case 'tax-deed': return taxFrom(payload);
    default: return grantFrom(payload);
  }
}
