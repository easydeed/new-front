export function toCanonical(state:any){
  // PHASE 15 v5: Flatten structure to match backend DeedCreate model (snake_case)
  return {
    deed_type: 'interspousal-transfer',
    property_address: state.propertyAddress || state.property?.address || '',
    apn: state.apn || state.property?.apn || '',
    county: state.county || state.property?.county || '',
    grantor_name: state.grantorName || state.parties?.grantor?.name || '',
    grantee_name: state.granteeName || state.parties?.grantee?.name || '',
    vesting: null  // Interspousal typically doesn't have vesting
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
