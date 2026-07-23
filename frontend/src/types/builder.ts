/**
 * Field-level provenance wrapper. Every value that originates from an external
 * source (SiteX, Google, TitlePoint) or the user carries where it came from and
 * whether the escrow officer has confirmed it. The system suggests; the officer
 * confirms; we record the confirmation. AI/auto-fill never silently writes a
 * confirmed legal value.
 */
export type FieldSource = 'sitex' | 'google' | 'user' | 'titlepoint';
export type FieldStatus = 'candidate' | 'confirmed';

export interface Sourced<T> {
  value: T;
  source: FieldSource;
  status: FieldStatus;
  confirmedAt?: string; // ISO timestamp, set when status becomes 'confirmed'
}

/**
 * Provenance for the SiteX-sourced PropertyData fields covered by Ticket #1.
 * Kept alongside the bare values so the deed PDF/generation path (which reads
 * property.apn etc.) is unchanged by this ticket.
 */
export interface PropertyProvenance {
  apn?: Sourced<string>;
  legalDescription?: Sourced<string>;
  owner?: Sourced<string>;
}

export interface PropertyData {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  apn: string;
  legalDescription: string;
  owner?: string;
  /**
   * Provenance for apn / legalDescription / owner. Optional so existing callers
   * and the generation payload continue to work against the bare value fields.
   */
  provenance?: PropertyProvenance;
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
  /**
   * Provenance for the grantor name, mirroring property.provenance: SiteX
   * prefill arrives as a candidate the officer confirms; manual entry is
   * user-sourced and confirmed on entry. Optional so the bare grantor value
   * and the generation payload keep working unchanged.
   */
  grantorProvenance?: Sourced<string>;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  requestedBy: string;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
}

