export interface PropertyData {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  apn: string;
  legalDescription: string;
  owner?: string;
}

export interface DTTData {
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  calculatedAmount: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}

export interface DeedBuilderState {
  deedType: string;
  property: PropertyData | null;
  grantor: string;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  requestedBy: string;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
}

