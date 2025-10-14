import { toCanonical as grantTo, fromCanonical as grantFrom } from './grantDeedAdapter';
import { toCanonical as quitTo, fromCanonical as quitFrom } from './quitclaimAdapter';
import { toCanonical as interTo, fromCanonical as interFrom } from './interspousalAdapter';
import { toCanonical as warrTo, fromCanonical as warrFrom } from './warrantyAdapter';
import { toCanonical as taxTo, fromCanonical as taxFrom } from './taxDeedAdapter';

type Mapper = { to: (s:any)=>any; from: (d:any)=>any };
const MAP: Record<string, Mapper> = {
  'grant-deed': { to: grantTo, from: grantFrom },
  'quitclaim-deed': { to: quitTo, from: quitFrom },
  'interspousal-transfer': { to: interTo, from: interFrom },
  'warranty-deed': { to: warrTo, from: warrFrom },
  'tax-deed': { to: taxTo, from: taxFrom },
};

export function toCanonicalFor(docType: string, state: any){
  const key = (docType||'').toLowerCase().replace(/_/g,'-');
  const m = MAP[key] || MAP['grant-deed'];
  return m.to(state);
}
export function fromCanonicalFor(docType: string, payload: any){
  const key = (docType||'').toLowerCase().replace(/_/g,'-');
  const m = MAP[key] || MAP['grant-deed'];
  return m.from(payload);
}
