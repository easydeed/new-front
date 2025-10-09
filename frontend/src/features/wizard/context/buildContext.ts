// Phase 11 - Wizard Integration: Context Adapters
// Maps wizard UI state → Backend Pydantic contexts

/**
 * Wizard store structure (localStorage-based)
 */
export type WizardStore = {
  // Step 1: Address/Property data
  step1?: {
    apn?: string;
    county?: string;
    piqAddress?: {
      name?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    titlePoint?: {
      owners?: Array<{
        fullName?: string;
        name?: string;
      }>;
    };
  };
  
  // Grant Deed steps
  grantDeed?: {
    step2?: {
      requestedBy?: string;
      titleCompany?: string;
      escrowNo?: string;
      titleOrderNo?: string;
      mailTo?: {
        name?: string;
        company?: string;
        address1?: string;
        address2?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
      apn?: string;
    };
    step3?: {
      dttAmount?: string;
      dttBasis?: 'full_value' | 'less_liens';
      areaType?: 'unincorporated' | 'city';
      cityName?: string;
    };
    step4?: {
      grantorsText?: string;
      granteesText?: string;
      county?: string;
      legalDescription?: string;
    };
  };
  
  // Deed-specific fields (Phase 11)
  dttExemption?: {
    reason?: string;
  };
  warranty?: {
    covenants?: string;
  };
  taxSale?: {
    reference?: string;
  };
  
  // Verified data from property enrichment
  verifiedData?: {
    apn?: string;
    county?: string;
    piqAddress?: any;
    titlePoint?: any;
    property_address?: string;
    legal_description?: string;
  };
  
  // Form data
  formData?: Record<string, any>;
};

/**
 * Helper: Format address from PIQ data
 */
function formatAddress(piq?: any): string {
  if (!piq) return '';
  const parts = [
    piq.address1,
    piq.address2,
    piq.city,
    piq.state,
    piq.zip
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Helper: Extract grantors text from various sources
 */
function getGrantorsText(s: WizardStore): string {
  // Priority: step4 → titlePoint owners → formData
  if (s.grantDeed?.step4?.grantorsText) {
    return s.grantDeed.step4.grantorsText;
  }
  
  if (s.step1?.titlePoint?.owners) {
    return s.step1.titlePoint.owners
      .map((o: any) => o.fullName || o.name)
      .filter(Boolean)
      .join('; ');
  }
  
  if (s.formData?.grantorsText) {
    return s.formData.grantorsText;
  }
  
  return '';
}

/**
 * Helper: Extract grantees text
 */
function getGranteesText(s: WizardStore): string {
  return s.grantDeed?.step4?.granteesText || s.formData?.granteesText || '';
}

/**
 * Helper: Extract county
 */
function getCounty(s: WizardStore): string {
  return s.grantDeed?.step4?.county || s.step1?.county || s.verifiedData?.county || s.formData?.county || '';
}

/**
 * Helper: Extract legal description
 */
function getLegalDescription(s: WizardStore): string {
  return s.grantDeed?.step4?.legalDescription || s.verifiedData?.legal_description || s.formData?.legalDescription || '';
}

/**
 * Helper: Extract property address
 */
function getPropertyAddress(s: WizardStore): string {
  return s.verifiedData?.property_address || formatAddress(s.step1?.piqAddress) || '';
}

/**
 * Helper: Extract APN
 */
function getAPN(s: WizardStore): string {
  return s.grantDeed?.step2?.apn || s.step1?.apn || s.verifiedData?.apn || s.formData?.apn || '';
}

/**
 * Base context adapter - used by all deed types
 */
export function toBaseContext(s: WizardStore) {
  const step2 = s.grantDeed?.step2;
  const mailTo = step2?.mailTo;
  
  return {
    requested_by: step2?.requestedBy || step2?.titleCompany || '',
    title_company: step2?.titleCompany || '',
    escrow_no: step2?.escrowNo || '',
    title_order_no: step2?.titleOrderNo || '',
    return_to: mailTo ? [
      mailTo.name,
      mailTo.company,
      mailTo.address1,
      mailTo.address2,
      `${mailTo.city || ''}, ${mailTo.state || 'CA'} ${mailTo.zip || ''}`
    ].filter(Boolean).join('\n') : '',
    apn: getAPN(s),
    county: getCounty(s),
    legal_description: getLegalDescription(s),
    property_address: getPropertyAddress(s),
    grantors_text: getGrantorsText(s),
    grantees_text: getGranteesText(s),
    execution_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  };
}

/**
 * Quitclaim Deed context adapter
 */
export function toQuitclaimContext(s: WizardStore) {
  return toBaseContext(s);
}

/**
 * Interspousal Transfer Deed context adapter
 * Adds: dtt_exempt_reason
 */
export function toInterspousalContext(s: WizardStore) {
  return {
    ...toBaseContext(s),
    dtt_exempt_reason: s.dttExemption?.reason || 'Interspousal transfer pursuant to R&T §11927',
  };
}

/**
 * Warranty Deed context adapter
 * Adds: covenants
 */
export function toWarrantyContext(s: WizardStore) {
  return {
    ...toBaseContext(s),
    covenants: s.warranty?.covenants || '',
  };
}

/**
 * Tax Deed context adapter
 * Adds: tax_sale_ref
 */
export function toTaxDeedContext(s: WizardStore) {
  return {
    ...toBaseContext(s),
    tax_sale_ref: s.taxSale?.reference || '',
  };
}

/**
 * Grant Deed context adapter (existing)
 * Adds: dtt_amount, dtt_basis, area_type, city_name
 */
export function toGrantDeedContext(s: WizardStore) {
  const step3 = s.grantDeed?.step3;
  
  return {
    ...toBaseContext(s),
    dtt_amount: step3?.dttAmount || '',
    dtt_basis: step3?.dttBasis || 'full_value',
    area_type: step3?.areaType || 'unincorporated',
    city_name: step3?.cityName || '',
  };
}

/**
 * Get the appropriate context adapter for a deed type
 */
export function getContextAdapter(docType: string): (s: WizardStore) => any {
  switch (docType) {
    case 'grant_deed':
      return toGrantDeedContext;
    case 'quitclaim':
      return toQuitclaimContext;
    case 'interspousal_transfer':
      return toInterspousalContext;
    case 'warranty_deed':
      return toWarrantyContext;
    case 'tax_deed':
      return toTaxDeedContext;
    default:
      return toBaseContext;
  }
}

