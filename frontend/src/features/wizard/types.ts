// Grant Deed Wizard State Types

export type Step2RequestDetails = {
  requestedBy?: string;
  titleCompany?: string;
  escrowNo?: string;
  titleOrderNo?: string;
  mailTo: {
    name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string; // default 'CA'
    zip?: string;
  };
  usePIQForMailTo?: boolean;
  apn?: string; // prefilled from Step 1
};

export type Step3DeclarationsTax = {
  dttAmount?: string; // raw input; parse to number on submit
  dttBasis?: "full_value" | "less_liens";
  areaType?: "unincorporated" | "city";
  cityName?: string; // only if areaType === "city"
};

export type Step4PartiesProperty = {
  grantorsText?: string; // prefilled from TitlePoint enrichment
  granteesText?: string;
  county?: string;
  legalDescription?: string;
};

export type GrantDeedState = {
  step2?: Step2RequestDetails;
  step3?: Step3DeclarationsTax;
  step4?: Step4PartiesProperty;
};

// Phase 11: Deed-specific step types
export type DTTExemptionData = {
  reason?: string;
};

export type WarrantyData = {
  covenants?: string;
};

export type TaxSaleData = {
  reference?: string;
};

// Extended wizard state to include grant deed steps
export type ExtendedWizardState = {
  currentStep: number;
  docType: string;
  verifiedData: Record<string, unknown>;
  formData: Record<string, unknown>;
  
  // Step 1 data (existing)
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
  
  // Grant deed steps
  grantDeed?: GrantDeedState;
  
  // Phase 11: Deed-specific steps
  dttExemption?: DTTExemptionData;
  warranty?: WarrantyData;
  taxSale?: TaxSaleData;
};
