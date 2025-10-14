export function toCanonical(state:any){
  return {
    deedType: 'quitclaim-deed',
    property: { address: state.propertyAddress, apn: state.apn, county: state.county },
    parties: { grantor: { name: state.grantorName }, grantee: { name: state.granteeName } },
    vesting: { description: state.vesting || null }
  };
}
export function fromCanonical(data:any){
  return {
    propertyAddress: data?.property?.address || '',
    apn: data?.property?.apn || '',
    county: data?.property?.county || '',
    grantorName: data?.parties?.grantor?.name || '',
    granteeName: data?.parties?.grantee?.name || '',
    vesting: data?.vesting?.description || ''
  };
}
