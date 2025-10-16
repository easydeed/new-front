
export function toCanonical(state: any) {
  return {
    deedType: 'tax-deed',
    property: {
      address: state.propertyAddress,
      apn: state.apn,
      county: state.county,
      legalDescription: state.legalDescription
    },
    parties: {
      grantor: { name: state.grantorName },
      grantee: { name: state.granteeName }
    },
    vesting: { description: state.vesting || null },
    requestDetails: {
      requestedBy: state.requestedBy,
      titleCompany: state.titleCompany,
      escrowNo: state.escrowNo,
      titleOrderNo: state.titleOrderNo
    },
    mailTo: state.mailTo,
    transferTax: {
      amount: state.dttAmount,
      assessedValue: state.assessedValue
    }
  };
}

export function fromCanonical(payload: any) {
  const s = payload || {};
  return {
    propertyAddress: s.property?.address || '',
    apn: s.property?.apn || '',
    county: s.property?.county || '',
    legalDescription: s.property?.legalDescription || '',
    grantorName: s.parties?.grantor?.name || '',
    granteeName: s.parties?.grantee?.name || '',
    vesting: s.vesting?.description || '',
    requestedBy: s.requestDetails?.requestedBy || '',
    titleCompany: s.requestDetails?.titleCompany || '',
    escrowNo: s.requestDetails?.escrowNo || '',
    titleOrderNo: s.requestDetails?.titleOrderNo || '',
    mailTo: s.mailTo || {},
    dttAmount: s.transferTax?.amount || 0,
    assessedValue: s.transferTax?.assessedValue || 0
  };
}
