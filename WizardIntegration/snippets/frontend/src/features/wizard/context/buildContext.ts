// Wizard Integration Bundle — buildContext.ts
// TODO: Replace the imports below with your actual store and types.
export type WizardStore = any; // Replace with your real type

export function toQuitclaimContext(s: WizardStore) {
  return {
    requested_by: s?.meta?.requestedBy || s?.meta?.titleCompany,
    title_company: s?.meta?.titleCompany,
    escrow_no: s?.meta?.escrowNo,
    title_order_no: s?.meta?.titleOrderNo,
    return_to: s?.meta?.returnTo,
    apn: s?.property?.apn,
    county: s?.property?.county,
    legal_description: s?.property?.legalDescription,
    property_address: s?.property?.addressLine,
    grantors_text: Array.isArray(s?.parties?.grantors) ? s.parties.grantors.join('; ') : (s?.parties?.grantors || ''),
    grantees_text: Array.isArray(s?.parties?.grantees) ? s.parties.grantees.join('; ') : (s?.parties?.grantees || ''),
    execution_date: s?.meta?.executionDate,
  };
}

export function toInterspousalContext(s: WizardStore) {
  return {
    ...toQuitclaimContext(s),
    dtt_exempt_reason: s?.dtt?.exemptReason || '',
  };
}

export function toWarrantyContext(s: WizardStore) {
  return {
    ...toQuitclaimContext(s),
    covenants: s?.warranty?.covenants || '',
  };
}

export function toTaxDeedContext(s: WizardStore) {
  return {
    ...toQuitclaimContext(s),
    tax_sale_ref: s?.tax?.saleRef || '',
  };
}
