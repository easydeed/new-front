/**
 * DeedPro Template Data Mapper
 * 
 * Maps frontend wizard form data to backend template variables
 * ensuring complete data coverage for both grant_deed.html and quitclaim_deed.html
 */

export interface WizardFormData {
  // Step 1: Deed Type
  deedType: string;
  
  // Step 2: Property Information  
  propertySearch: string;
  apn: string;
  county: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  fips: string;
  propertyId: string;
  legalDescription: string;
  
  // Step 3: Parties & Recording
  recordingRequestedBy: string;
  mailTo: string;
  orderNo: string;
  escrowNo: string;
  grantorName: string;
  granteeName: string;
  vesting: string;
  ownerType: string;
  deedDate: string;
  
  // Step 4: Transfer Tax & Consideration
  salesPrice: string;
  documentaryTax: string;
  taxComputedFullValue: boolean;
  taxComputedLessLiens: boolean;
  isUnincorporated: boolean;
  taxCityName: string;
  
  // Step 5: Notary Information
  notaryCounty: string;
  notaryDate: string;
  notaryName: string;
  appearedBeforeNotary: string;
  grantorSignature: string;
}

export interface TemplateData {
  // Core deed information
  recording_requested_by: string;
  mail_to: string;
  order_no: string;
  escrow_no: string;
  apn: string;
  documentary_tax: string;
  city: string;
  grantor: string;
  grantee: string;
  county: string;
  property_description: string;
  date: string;
  grantor_signature: string;
  
  // Notary section
  county_notary: string;
  notary_date: string;
  notary_name: string;
  appeared_before_notary: string;
  notary_signature: string;
  
  // Enhanced fields for checkbox logic
  tax_computed_full_value: boolean;
  tax_computed_less_liens: boolean;
  is_unincorporated: boolean;
  
  // Additional deed-specific fields
  vesting_description: string;
  calculated_documentary_tax: string;
  formatted_date: string;
  formatted_notary_date: string;
}

export interface PreviewPayload {
  deed_type: string;
  data: TemplateData;
}

/**
 * Calculate documentary transfer tax based on sales price
 * California standard: $0.55 per $500 of value (or fraction thereof)
 */
export function calculateDocumentaryTax(salesPrice: string): string {
  if (!salesPrice || salesPrice === '0' || salesPrice === '') {
    return '0.00';
  }
  
  const price = parseFloat(salesPrice.replace(/[,$]/g, ''));
  if (isNaN(price) || price <= 0) {
    return '0.00';
  }
  
  // California documentary transfer tax: $0.55 per $500
  const taxableIncrements = Math.ceil(price / 500);
  const tax = taxableIncrements * 0.55;
  
  return tax.toFixed(2);
}

/**
 * Format date to MM/DD/YYYY for legal documents
 */
export function formatLegalDate(dateString: string): string {
  if (!dateString) {
    return new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric'
    });
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'  
    });
  }
  
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Create comprehensive property description including vesting
 */
export function createPropertyDescription(formData: WizardFormData): string {
  let description = '';
  
  // Primary legal description
  if (formData.legalDescription?.trim()) {
    description = formData.legalDescription.trim();
  } else if (formData.fullAddress?.trim()) {
    description = formData.fullAddress.trim();
  } else if (formData.propertySearch?.trim()) {
    description = formData.propertySearch.trim();
  } else {
    description = '_____________________';
  }
  
  // Add vesting information if provided
  if (formData.vesting?.trim()) {
    description += `\n\nVesting: ${formData.vesting.trim()}`;
  }
  
  return description;
}

/**
 * Map wizard form data to template data structure
 * Includes fallbacks, calculations, and formatting
 */
export function mapWizardDataToTemplate(
  formData: WizardFormData, 
  aiSuggestions: Partial<Record<string, unknown>> = {}
): TemplateData {
  
  // Calculate documentary tax if not provided
  const calculatedTax = formData.documentaryTax?.trim() 
    ? formData.documentaryTax.trim()
    : calculateDocumentaryTax(formData.salesPrice);
  
  // Format dates for legal documents
  const formattedDate = formatLegalDate(formData.deedDate);
  const formattedNotaryDate = formatLegalDate(formData.notaryDate);
  
  // Create comprehensive property description
  const propertyDescription = createPropertyDescription(formData);
  
  return {
    // Core deed information with AI fallbacks
    recording_requested_by: (aiSuggestions.recordingRequestedBy as string) || formData.recordingRequestedBy || '_____________________',
    mail_to: (aiSuggestions.mailTo as string) || formData.mailTo || formData.fullAddress || formData.propertySearch || '_____________________',
    order_no: formData.orderNo || '_____________________',
    escrow_no: formData.escrowNo || '_____________________',
    apn: (aiSuggestions.apn as string) || formData.apn || '_____________________',
    documentary_tax: calculatedTax,
    city: (aiSuggestions.city as string) || formData.taxCityName || formData.city || '_____________________',
    grantor: formData.grantorName || '_____________________',
    grantee: formData.granteeName || '_____________________',
    county: (aiSuggestions.county as string) || formData.county || '_____________________',
    property_description: (aiSuggestions.legalDescription as string) || propertyDescription,
    date: formattedDate,
    grantor_signature: formData.grantorSignature || formData.grantorName || '_____________________',
    
    // Notary section with AI fallbacks
    county_notary: (aiSuggestions.notaryCounty as string) || formData.notaryCounty || formData.county || '_____________________',
    notary_date: formattedNotaryDate,
    notary_name: formData.notaryName || '_____________________',
    appeared_before_notary: formData.appearedBeforeNotary || formData.grantorName || '_____________________',
    notary_signature: formData.notaryName || '_____________________',
    
    // Enhanced checkbox logic
    tax_computed_full_value: formData.taxComputedFullValue === true,
    tax_computed_less_liens: formData.taxComputedLessLiens === true,
    is_unincorporated: formData.isUnincorporated === true,
    
    // Additional processed fields
    vesting_description: formData.vesting || '',
    calculated_documentary_tax: calculatedTax,
    formatted_date: formattedDate,
    formatted_notary_date: formattedNotaryDate
  };
}

/**
 * Create complete preview payload for backend
 */
export function createPreviewPayload(
  formData: WizardFormData,
  aiSuggestions: Record<string, unknown> = {}
): PreviewPayload {
  
  // Normalize deed type to template filename format
  const normalizedDeedType = formData.deedType
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace('deed', 'deed'); // Ensure 'deed' suffix
  
  const templateData = mapWizardDataToTemplate(formData, aiSuggestions);
  
  return {
    deed_type: normalizedDeedType,
    data: templateData
  };
}

/**
 * Validate required fields before preview generation
 */
export function validatePreviewData(formData: WizardFormData): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  // Critical required fields
  if (!formData.deedType?.trim()) {
    missingFields.push('Deed Type');
  }
  
  if (!formData.grantorName?.trim()) {
    missingFields.push('Grantor Name');
  }
  
  if (!formData.granteeName?.trim()) {
    missingFields.push('Grantee Name');
  }
  
  if (!formData.county?.trim()) {
    missingFields.push('County');
  }
  
  // Property description (any one of these)
  if (!formData.legalDescription?.trim() && 
      !formData.fullAddress?.trim() && 
      !formData.propertySearch?.trim()) {
    missingFields.push('Property Description (legal description, full address, or property search)');
  }
  
  // Warning for optional but recommended fields
  if (!formData.apn?.trim()) {
    warnings.push('APN number not provided - may be required by county recorder');
  }
  
  if (!formData.recordingRequestedBy?.trim()) {
    warnings.push('Recording requested by not specified');
  }
  
  if (!formData.documentaryTax?.trim() && !formData.salesPrice?.trim()) {
    warnings.push('No sales price or documentary tax specified');
  }
  
  if (!formData.notaryName?.trim()) {
    warnings.push('Notary information incomplete');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
}
