import { z } from 'zod';

// Core types for document configuration
export interface StepConfig {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  legalReason: string;
  fields: string[];
  aiCapabilities: AICapability[];
  estimatedTime?: string;
}

export interface DocumentConfig {
  id: string;
  name: string;
  description: string;
  legalBasis: string[];
  requiredSteps: StepConfig[];
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex';
  aiCapabilities: AICapability[];
  validationSchema: z.ZodSchema;
  backendEndpoint: string;
  supportedStates: string[];
  prerequisites?: string[];
  warnings?: string[];
}

export type AICapability = 
  | 'propertySearch'
  | 'titlePointIntegration' 
  | 'legalDescriptionValidation'
  | 'autoFillFromProperty'
  | 'titleCompanyLookup'
  | 'taxCalculation'
  | 'jurisdictionLookup'
  | 'exemptionCheck'
  | 'currentOwnerPrefill'
  | 'vestingAdvice'
  | 'nameValidation'
  | 'legalValidation'
  | 'completenessCheck'
  | 'complianceVerification'
  | 'riskWarnings'
  | 'relationshipAnalysis'
  | 'riskValidation'
  | 'marriageValidation'
  | 'communityPropertyAnalysis'
  | 'exemptionValidation'
  | 'chainOfTitle'
  | 'riskAnalysis';

// Validation schemas for each document type
const PropertyStepSchema = z.object({
  address: z.string().min(1, "Property address is required"),
  apn: z.string().min(1, "APN is required"),
  county: z.string().min(1, "County is required"),
  legalDescription: z.string().min(10, "Legal description must be complete"),
  currentOwners: z.array(z.object({
    name: z.string().min(1, "Owner name is required"),
    vestingType: z.string().optional()
  })).min(1, "At least one current owner is required")
});

const RecordingStepSchema = z.object({
  requestedBy: z.string().min(1, "Requested by is required"),
  mailTo: z.object({
    name: z.string().min(1, "Mail to name is required"),
    address1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(2, "State is required"),
    zip: z.string().min(5, "ZIP code is required")
  }),
  titleCompany: z.string().optional(),
  escrowNo: z.string().optional(),
  titleOrderNo: z.string().optional()
});

const TaxStepSchema = z.object({
  dttAmount: z.string().min(1, "Transfer tax amount is required"),
  dttBasis: z.enum(['full_value', 'partial_value', 'exempt'], {
    errorMap: () => ({ message: "Please select a valid tax basis" })
  }),
  areaType: z.enum(['city', 'unincorporated'], {
    errorMap: () => ({ message: "Please select area type" })
  }),
  cityName: z.string().optional(),
  jurisdiction: z.string().min(1, "Tax jurisdiction is required")
});

const PartiesStepSchema = z.object({
  grantorsText: z.string().min(1, "Grantor(s) are required"),
  granteesText: z.string().min(1, "Grantee(s) are required"),
  county: z.string().min(1, "County is required"),
  legalDescription: z.string().min(10, "Legal description is required"),
  vesting: z.string().optional()
});

const ReviewStepSchema = z.object({
  preview: z.boolean(),
  validation: z.boolean(),
  generation: z.boolean().optional()
});

// Combined schemas for each document type
const GrantDeedValidationSchema = z.object({
  property: PropertyStepSchema,
  recording: RecordingStepSchema,
  tax: TaxStepSchema,
  parties: PartiesStepSchema,
  review: ReviewStepSchema
});

const QuitclaimDeedValidationSchema = z.object({
  property: PropertyStepSchema,
  recording: RecordingStepSchema.omit({ titleCompany: true, escrowNo: true }),
  parties: PartiesStepSchema.extend({
    riskDisclosures: z.array(z.string()).min(1, "Risk disclosures must be acknowledged")
  }),
  review: ReviewStepSchema
});

const InterspousalTransferValidationSchema = z.object({
  property: PropertyStepSchema,
  spouses: z.object({
    spouseGrantor: z.string().min(1, "Grantor spouse name is required"),
    spouseGrantee: z.string().min(1, "Grantee spouse name is required"),
    marriageDate: z.string().min(1, "Marriage date is required"),
    exemptionClaim: z.boolean().refine(val => val === true, {
      message: "Interspousal exemption must be claimed"
    })
  }),
  review: ReviewStepSchema
});

const WarrantyDeedValidationSchema = z.object({
  property: PropertyStepSchema,
  recording: RecordingStepSchema,
  tax: TaxStepSchema,
  parties: PartiesStepSchema.extend({
    warranties: z.array(z.string()).min(1, "Warranty declarations are required")
  }),
  review: ReviewStepSchema
});

const TaxDeedValidationSchema = z.object({
  property: PropertyStepSchema,
  recording: RecordingStepSchema.extend({
    taxAuthority: z.string().min(1, "Tax authority is required"),
    saleDate: z.string().min(1, "Tax sale date is required")
  }),
  tax: z.object({
    redemptionPeriod: z.string().min(1, "Redemption period is required"),
    taxAmount: z.string().min(1, "Tax amount is required"),
    penalties: z.string().optional(),
    interest: z.string().optional()
  }),
  parties: PartiesStepSchema.extend({
    taxBuyer: z.string().min(1, "Tax sale buyer is required")
  }),
  review: ReviewStepSchema
});

const PropertyProfileValidationSchema = z.object({
  property: PropertyStepSchema,
  analysis: z.object({
    reportType: z.enum(['basic', 'comprehensive', 'title_search']),
    includeChainOfTitle: z.boolean(),
    includeLienSearch: z.boolean(),
    includeRiskAnalysis: z.boolean()
  })
});

// Document Registry with all 6 document types
export const DOCUMENT_REGISTRY: Record<string, DocumentConfig> = {
  grant_deed: {
    id: 'grant_deed',
    name: 'Grant Deed',
    description: 'Standard property transfer with warranties and full legal protection',
    legalBasis: [
      'California Civil Code §1092 - Property identification requirements',
      'California Civil Code §1095 - Grantor requirements and execution', 
      'California Revenue & Taxation Code §11911 - Documentary transfer tax declaration',
      'California Government Code §27321 - Recording requirements'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Verify and identify the property being transferred',
        required: true,
        legalReason: 'Civil Code §1092 requires precise property identification for deed validity',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'legalDescriptionValidation', 'currentOwnerPrefill'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'recording',
        name: 'Recording Information', 
        description: 'Specify recording details and return address',
        required: true,
        legalReason: 'Government Code §27321 requires complete recording information',
        fields: ['requestedBy', 'mailTo', 'titleCompany', 'escrowNo', 'titleOrderNo'],
        aiCapabilities: ['autoFillFromProperty', 'titleCompanyLookup'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'tax',
        name: 'Documentary Transfer Tax',
        description: 'Calculate and declare transfer tax obligations',
        required: true, 
        legalReason: 'Revenue & Taxation Code §11911 mandates accurate tax declaration',
        fields: ['dttAmount', 'dttBasis', 'areaType', 'cityName', 'jurisdiction'],
        aiCapabilities: ['taxCalculation', 'jurisdictionLookup', 'exemptionCheck'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'parties',
        name: 'Parties & Property Details',
        description: 'Define grantors, grantees, and final property details',
        required: true,
        legalReason: 'Civil Code §1095 requires exact grantor identification matching title records',
        fields: ['grantorsText', 'granteesText', 'county', 'legalDescription', 'vesting'],
        aiCapabilities: ['currentOwnerPrefill', 'vestingAdvice', 'nameValidation'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'review',
        name: 'Legal Review & Generation',
        description: 'Review document for completeness and generate final deed',
        required: true,
        legalReason: 'Civil Code §1091 requires complete and legally sufficient document',
        fields: ['preview', 'validation', 'generation'],
        aiCapabilities: ['legalValidation', 'completenessCheck', 'complianceVerification'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '8-12 minutes',
    complexity: 'complex',
    aiCapabilities: ['chainOfTitle', 'taxCalculation', 'riskAnalysis', 'legalValidation'],
    validationSchema: GrantDeedValidationSchema,
    backendEndpoint: '/api/generate/grant-deed-ca',
    supportedStates: ['CA'],
    prerequisites: ['Property ownership verification', 'Title company coordination'],
    warnings: ['Ensure grantor names match title records exactly', 'Verify transfer tax calculations']
  },
  
  quitclaim_deed: {
    id: 'quitclaim_deed',
    name: 'Quitclaim Deed',
    description: 'Simple ownership transfer without warranties - transfers only the interest the grantor may have',
    legalBasis: [
      'California Civil Code §1092 - Property identification requirements',
      'California Civil Code §1095 - Grantor requirements and execution',
      'California Civil Code §1113 - Quitclaim deed provisions'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Verify and identify the property being quitclaimed',
        required: true,
        legalReason: 'Civil Code §1092 requires precise property identification',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'riskWarnings'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'recording',
        name: 'Recording Information',
        description: 'Basic recording details (simplified for quitclaim)',
        required: true, 
        legalReason: 'Government Code §27321 requires recording information',
        fields: ['requestedBy', 'mailTo'],
        aiCapabilities: ['autoFillFromProperty'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'parties',
        name: 'Parties & Risk Disclosures',
        description: 'Define parties and acknowledge quitclaim risks',
        required: true,
        legalReason: 'Civil Code §1095 requires grantor identification; §1113 requires risk disclosure',
        fields: ['grantorsText', 'granteesText', 'riskDisclosures'],
        aiCapabilities: ['currentOwnerPrefill', 'riskWarnings', 'relationshipAnalysis'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'review',
        name: 'Review & Generate',
        description: 'Review quitclaim deed and generate document',
        required: true,
        legalReason: 'Civil Code §1091 requires complete document',
        fields: ['preview', 'validation', 'generation'],
        aiCapabilities: ['riskValidation', 'completenessCheck'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '5-8 minutes',
    complexity: 'moderate',
    aiCapabilities: ['riskWarnings', 'relationshipAnalysis', 'riskValidation'],
    validationSchema: QuitclaimDeedValidationSchema,
    backendEndpoint: '/api/generate/quitclaim-deed-ca',
    supportedStates: ['CA'],
    prerequisites: ['Understanding of quitclaim risks'],
    warnings: [
      'Quitclaim deeds provide NO warranties of title',
      'Grantor only transfers whatever interest they may have',
      'Buyer should obtain title insurance',
      'Not recommended for arms-length sales'
    ]
  },

  interspousal_transfer: {
    id: 'interspousal_transfer',
    name: 'Interspousal Transfer Deed',
    description: 'Transfer property between spouses - typically exempt from transfer tax',
    legalBasis: [
      'California Revenue & Taxation Code §11927 - Interspousal transfer exemption',
      'California Family Code §2581 - Community property management',
      'California Civil Code §1092 - Property identification requirements'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Identify the community or separate property being transferred',
        required: true,
        legalReason: 'Civil Code §1092 requires precise property identification',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'communityPropertyAnalysis'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'spouses',
        name: 'Spouse Information & Tax Exemption',
        description: 'Verify marriage and claim interspousal transfer exemption',
        required: true,
        legalReason: 'Revenue & Taxation Code §11927 requires spouse verification for tax exemption',
        fields: ['spouseGrantor', 'spouseGrantee', 'marriageDate', 'exemptionClaim'],
        aiCapabilities: ['marriageValidation', 'exemptionCheck', 'communityPropertyAnalysis'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'review',
        name: 'Review & Generate',
        description: 'Review interspousal transfer and generate deed',
        required: true,
        legalReason: 'Civil Code §1091 requires complete document',
        fields: ['preview', 'exemptionValidation', 'generation'],
        aiCapabilities: ['exemptionValidation', 'completenessCheck'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '4-6 minutes',
    complexity: 'simple',
    aiCapabilities: ['marriageValidation', 'exemptionCheck', 'communityPropertyAnalysis'],
    validationSchema: InterspousalTransferValidationSchema,
    backendEndpoint: '/api/generate/interspousal-transfer-ca',
    supportedStates: ['CA'],
    prerequisites: ['Valid marriage between parties'],
    warnings: ['Verify marriage status before claiming exemption', 'Consider community property implications']
  },

  warranty_deed: {
    id: 'warranty_deed',
    name: 'Warranty Deed',
    description: 'Property transfer with full warranties and guarantees of clear title',
    legalBasis: [
      'California Civil Code §1092 - Property identification requirements',
      'California Civil Code §1095 - Grantor requirements and execution',
      'California Civil Code §1113 - Warranty provisions',
      'California Revenue & Taxation Code §11911 - Transfer tax requirements'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Verify property and confirm clear title for warranties',
        required: true,
        legalReason: 'Civil Code §1092 requires precise identification; warranties require clear title',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'chainOfTitle', 'riskAnalysis'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'recording',
        name: 'Recording Information',
        description: 'Complete recording details for warranty deed',
        required: true,
        legalReason: 'Government Code §27321 requires recording information',
        fields: ['requestedBy', 'mailTo', 'titleCompany', 'escrowNo', 'titleOrderNo'],
        aiCapabilities: ['autoFillFromProperty', 'titleCompanyLookup'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'tax',
        name: 'Documentary Transfer Tax',
        description: 'Calculate transfer tax for warranty deed',
        required: true,
        legalReason: 'Revenue & Taxation Code §11911 mandates tax declaration',
        fields: ['dttAmount', 'dttBasis', 'areaType', 'cityName', 'jurisdiction'],
        aiCapabilities: ['taxCalculation', 'jurisdictionLookup'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'parties',
        name: 'Parties & Warranty Declarations',
        description: 'Define parties and specify warranty protections',
        required: true,
        legalReason: 'Civil Code §1095 requires grantor identification; §1113 requires warranty specifications',
        fields: ['grantorsText', 'granteesText', 'county', 'legalDescription', 'warranties'],
        aiCapabilities: ['currentOwnerPrefill', 'vestingAdvice', 'legalValidation'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'review',
        name: 'Legal Review & Generation',
        description: 'Review warranty deed for legal sufficiency',
        required: true,
        legalReason: 'Civil Code §1091 requires complete document with valid warranties',
        fields: ['preview', 'validation', 'generation'],
        aiCapabilities: ['legalValidation', 'completenessCheck', 'complianceVerification'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '8-12 minutes',
    complexity: 'complex',
    aiCapabilities: ['chainOfTitle', 'taxCalculation', 'riskAnalysis', 'legalValidation'],
    validationSchema: WarrantyDeedValidationSchema,
    backendEndpoint: '/api/generate/warranty-deed-ca',
    supportedStates: ['CA'],
    prerequisites: ['Clear title verification', 'Title insurance coordination'],
    warnings: ['Grantor provides full warranties - ensure clear title', 'Higher liability than grant deed']
  },

  tax_deed: {
    id: 'tax_deed',
    name: 'Tax Deed',
    description: 'Property transfer following tax sale - special statutory requirements',
    legalBasis: [
      'California Revenue & Taxation Code §3691 - Tax deed requirements',
      'California Revenue & Taxation Code §3712 - Tax sale procedures',
      'California Civil Code §1092 - Property identification requirements'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Identify tax-defaulted property',
        required: true,
        legalReason: 'Civil Code §1092 and Revenue & Taxation Code §3691 require precise identification',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'taxRecordAnalysis'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'recording',
        name: 'Tax Authority & Sale Information',
        description: 'Document tax authority and sale details',
        required: true,
        legalReason: 'Revenue & Taxation Code §3712 requires complete sale documentation',
        fields: ['requestedBy', 'mailTo', 'taxAuthority', 'saleDate'],
        aiCapabilities: ['taxAuthorityLookup', 'saleVerification'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'tax',
        name: 'Tax Sale Details',
        description: 'Document tax amounts and redemption period',
        required: true,
        legalReason: 'Revenue & Taxation Code §3691 requires tax sale specifics',
        fields: ['redemptionPeriod', 'taxAmount', 'penalties', 'interest'],
        aiCapabilities: ['taxCalculation', 'redemptionTracking'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'parties',
        name: 'Tax Sale Parties',
        description: 'Define tax authority, former owner, and tax buyer',
        required: true,
        legalReason: 'Revenue & Taxation Code §3691 requires party identification',
        fields: ['grantorsText', 'granteesText', 'taxBuyer'],
        aiCapabilities: ['taxBuyerVerification', 'formerOwnerLookup'],
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'review',
        name: 'Tax Deed Review & Generation',
        description: 'Review tax deed for statutory compliance',
        required: true,
        legalReason: 'Revenue & Taxation Code §3691 requires statutory compliance',
        fields: ['preview', 'validation', 'generation'],
        aiCapabilities: ['statutoryValidation', 'completenessCheck'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '6-10 minutes',
    complexity: 'moderate',
    aiCapabilities: ['taxRecordAnalysis', 'redemptionTracking', 'statutoryValidation'],
    validationSchema: TaxDeedValidationSchema,
    backendEndpoint: '/api/generate/tax-deed-ca',
    supportedStates: ['CA'],
    prerequisites: ['Valid tax sale completion', 'Redemption period expiration'],
    warnings: ['Verify redemption period has expired', 'Confirm proper tax sale procedures', 'Title may have defects']
  },

  property_profile: {
    id: 'property_profile',
    name: 'Property Profile Report',
    description: 'Comprehensive property analysis and title research - not a deed',
    legalBasis: [
      'California Civil Code §1092 - Property identification standards',
      'California Business & Professions Code §10131 - Real estate reporting requirements'
    ],
    requiredSteps: [
      {
        id: 'property',
        name: 'Property Identification',
        description: 'Identify property for comprehensive analysis',
        required: true,
        legalReason: 'Accurate identification required for meaningful analysis',
        fields: ['address', 'apn', 'county', 'legalDescription', 'currentOwners'],
        aiCapabilities: ['propertySearch', 'titlePointIntegration', 'comprehensiveAnalysis'],
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'analysis',
        name: 'Analysis Configuration',
        description: 'Configure the type and depth of property analysis',
        required: true,
        legalReason: 'Scope definition required for accurate reporting',
        fields: ['reportType', 'includeChainOfTitle', 'includeLienSearch', 'includeRiskAnalysis'],
        aiCapabilities: ['analysisConfiguration', 'riskAssessment', 'comprehensiveReporting'],
        estimatedTime: '1-2 minutes'
      }
    ],
    estimatedTime: '2-4 minutes',
    complexity: 'simple',
    aiCapabilities: ['comprehensiveAnalysis', 'chainOfTitle', 'riskAssessment', 'marketAnalysis'],
    validationSchema: PropertyProfileValidationSchema,
    backendEndpoint: '/api/generate/property-profile-ca',
    supportedStates: ['CA'],
    prerequisites: ['Property identification'],
    warnings: ['This is an analysis report, not a legal document', 'Does not transfer ownership']
  }
};

// Helper functions for working with document registry
export function getDocumentConfig(documentType: string): DocumentConfig | null {
  return DOCUMENT_REGISTRY[documentType] || null;
}

export function getSupportedDocumentTypes(): string[] {
  return Object.keys(DOCUMENT_REGISTRY);
}

export function getDocumentsByComplexity(complexity: 'simple' | 'moderate' | 'complex'): DocumentConfig[] {
  return Object.values(DOCUMENT_REGISTRY).filter(doc => doc.complexity === complexity);
}

export function getDocumentsWithAICapability(capability: AICapability): DocumentConfig[] {
  return Object.values(DOCUMENT_REGISTRY).filter(doc => 
    doc.aiCapabilities.includes(capability)
  );
}

export function validateDocumentData(documentType: string, data: any): { isValid: boolean; errors: string[] } {
  const config = getDocumentConfig(documentType);
  if (!config) {
    return { isValid: false, errors: [`Unknown document type: ${documentType}`] };
  }

  try {
    config.validationSchema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { isValid: false, errors: ['Validation failed'] };
  }
}

export function getEstimatedCompletionTime(documentType: string): string {
  const config = getDocumentConfig(documentType);
  return config?.estimatedTime || 'Unknown';
}

export function getRequiredStepsCount(documentType: string): number {
  const config = getDocumentConfig(documentType);
  return config?.requiredSteps.length || 0;
}

export function getDocumentLegalBasis(documentType: string): string[] {
  const config = getDocumentConfig(documentType);
  return config?.legalBasis || [];
}

export function getDocumentWarnings(documentType: string): string[] {
  const config = getDocumentConfig(documentType);
  return config?.warnings || [];
}

export function getDocumentPrerequisites(documentType: string): string[] {
  const config = getDocumentConfig(documentType);
  return config?.prerequisites || [];
}

// Type exports for use in other components
export type { DocumentConfig, StepConfig, AICapability };

