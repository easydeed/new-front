export type VerifiedData = {
  apn?: string;
  county?: string;
  legalDescription?: string;
  currentOwnerPrimary?: string;
  currentOwnerSecondary?: string;
  addressLine?: string;
};
export function prefillFromEnrichment(v: VerifiedData, setStore: (updater:(s:any)=>any)=>void) {
  if (!v) return;
  setStore((s:any)=> ({
    ...s,
    property: {
      ...s.property,
      apn: v.apn ?? s.property?.apn,
      county: v.county ?? s.property?.county,
      legalDescription: v.legalDescription ?? s.property?.legalDescription,
      addressLine: v.addressLine ?? s.property?.addressLine,
    },
    parties: {
      ...s.parties,
      grantors: [v.currentOwnerPrimary, v.currentOwnerSecondary].filter(Boolean),
    },
  }));
}
