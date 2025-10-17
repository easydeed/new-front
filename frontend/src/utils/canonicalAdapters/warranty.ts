export function toCanonical(state: any) {
  return {
    deedType: 'warranty-deed',
    property: {
      address: state.propertyAddress || state.fullAddress || null,
      apn: state.apn || null,
      county: state.county || null,
    },
    parties: {
      grantor: { name: state.grantorName || null },
      grantee: { name: state.granteeName || null },
    },
    vesting: { description: state.vesting || null },
    covenants: state.covenants || null,
    requestDetails: {
      requestedBy: state.requestedBy || null,
    },
  };
}

