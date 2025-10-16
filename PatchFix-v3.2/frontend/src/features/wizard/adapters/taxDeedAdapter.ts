
export function toTaxCanonical(state: any) {
  const st = state || {};
  return {
    deedType: 'tax-deed',
    property: {
      address: st.propertyAddress || st.property?.address || null,
      apn: st.apn || null,
      county: st.county || st.property?.county || null,
      legalDescription: st.legalDescription || null
    },
    parties: {
      grantor: { name: st.grantorName || null },
      grantee: { name: st.granteeName || null }
    },
    vesting: { description: st.vesting || null },
    requestDetails: {
      requestedBy: st.requestedBy || null,
      titleCompany: st.titleCompany || null,
      escrowNo: st.escrowNo || null,
      titleOrderNo: st.titleOrderNo || null
    },
    mailTo: st.mailTo || null,
    transferTax: {
      amount: st.dttAmount || null,
      assessedValue: st.assessedValue || null,
      exemptReason: st.dttExemptReason || null
    }
  };
}
