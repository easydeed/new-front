export function toCanonical(state:any){
  return {
    deedType: 'interspousal-transfer',
    property: { address: state.propertyAddress, apn: state.apn, county: state.county },
    parties: { grantor: { name: state.grantorName }, grantee: { name: state.granteeName } },
    transferTax: { exemption: state.dttExemptReason || null }
  };
}
export function fromCanonical(data:any){
  return {
    propertyAddress: data?.property?.address || '',
    apn: data?.property?.apn || '',
    county: data?.property?.county || '',
    grantorName: data?.parties?.grantor?.name || '',
    granteeName: data?.parties?.grantee?.name || '',
    dttExemptReason: data?.transferTax?.exemption || ''
  };
}
