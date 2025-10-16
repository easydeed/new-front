// frontend/src/features/wizard/validation/adapters.ts
// "Canonical" builder resilient to both Classic and Modern store shapes.
// It prefers verified property data (SITEX) where present (per Phase 15 docs).

type UnknownRecord = Record<string, any>;

function firstNonEmpty<T>(...vals: (T | undefined | null | '')[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

export function toCanonicalFromWizardData(wizardData: UnknownRecord, docType: string) {
  const fd = wizardData.formData || wizardData || {};
  const verified = wizardData.verifiedData || {};
  const gd = wizardData.grantDeed || {};
  const parties = fd.parties || gd.parties || {};
  const vesting = fd.vesting || gd.vesting || {};

  // Property first: prefer verified/SITEX fields
  const address = firstNonEmpty(
    fd.propertyAddress,
    fd.property?.address,
    verified.propertyAddress,
    verified.property?.address,
    gd.propertyAddress,
    gd.property?.address
  ) || '';

  const apn = firstNonEmpty(fd.apn, fd.property?.apn, verified.apn, verified.property?.apn, gd.apn, gd.property?.apn) || '';
  const county = firstNonEmpty(fd.county, fd.property?.county, verified.county, verified.property?.county, gd.county, gd.property?.county) || '';
  const legalDescription = firstNonEmpty(
    fd.legalDescription, fd.property?.legalDescription,
    verified.legalDescription, verified.property?.legalDescription,
    gd.legalDescription, gd.property?.legalDescription
  ) || '';

  // Parties
  const grantorName = firstNonEmpty(
    fd.grantorName, parties?.grantor?.name, verified.grantorName, gd.grantorName, gd.parties?.grantor?.name
  ) || '';
  const granteeName = firstNonEmpty(
    fd.granteeName, parties?.grantee?.name, verified.granteeName, gd.granteeName, gd.parties?.grantee?.name
  ) || '';

  // Vesting
  const vestingDescription = firstNonEmpty(fd.vesting, vesting?.description, gd.vesting?.description) ?? null;

  // Request details
  const requestDetails = {
    requestedBy: firstNonEmpty(fd.requestedBy, gd.requestedBy, verified.requestedBy),
    titleCompany: firstNonEmpty(fd.titleCompany, gd.titleCompany, verified.titleCompany),
    escrowNo: firstNonEmpty(fd.escrowNo, gd.escrowNo, verified.escrowNo),
    titleOrderNo: firstNonEmpty(fd.titleOrderNo, gd.titleOrderNo, verified.titleOrderNo),
  };

  // Mail to
  const mailTo = firstNonEmpty(fd.mailTo, gd.mailTo, verified.mailTo);

  // Tax
  const transferTax = (() => {
    const amount = firstNonEmpty<number>(fd.dttAmount, gd.dttAmount, verified.dttAmount);
    const assessedValue = firstNonEmpty<number>(fd.assessedValue, gd.assessedValue, verified.assessedValue);
    const exemptionCode = firstNonEmpty<string>(fd.exemptionCode, gd.exemptionCode, verified.exemptionCode);
    const anyDefined = amount !== undefined || assessedValue !== undefined || exemptionCode !== undefined;
    return anyDefined ? { amount, assessedValue, exemptionCode } : undefined;
  })();

  if (docType === 'grant-deed' || docType === 'grant_deed') {
    return {
      docType: 'grant-deed',
      property: { address, apn, county, legalDescription },
      parties: { grantor: { name: grantorName }, grantee: { name: granteeName } },
      vesting: { description: vestingDescription },
      requestDetails,
      mailTo,
      transferTax,
    };
  }

  // Default passthrough for unknown doc types – let backend validate
  return {
    docType,
    property: { address, apn, county, legalDescription },
    parties: { grantor: { name: grantorName }, grantee: { name: granteeName } },
    vesting: { description: vestingDescription },
    requestDetails,
    mailTo,
    transferTax,
  };
}
