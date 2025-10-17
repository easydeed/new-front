export function toCanonical(state: any) {
  return {
    deedType: 'tax-deed',
    property: {
      address: state.propertyAddress || state.fullAddress || null,
      apn: state.apn || null,
      county: state.county || null,
    },
    parties: {
      grantor: { name: state.grantorName || null },
      grantee: { name: state.granteeName || null },
    },
    requestDetails: {
      requestedBy: state.requestedBy || null,
    },
    taxSaleRef: state.taxSaleRef || null,
  };
}

