import { PropertyData, WizardState } from './wizardState';
import { DOCUMENT_REGISTRY } from './documentRegistry';
import { ChainOfTitleAnalysis } from '../services/chainOfTitleService';

// Legal Validation Engine with California Code Integration
export interface LegalValidationRule {
  id: string;
  name: string;
  code: string; // California Civil Code reference
  documentTypes: string[];
  fields: string[];
  validator: (data: any, context: ValidationContext) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  category: 'mandatory' | 'recommended' | 'best_practice';
  legalBasis: string;
  consequences: string;
  remediation: string;
}

export interface ValidationContext {
  documentType: string;
  stepData: Record<string, any>;
  propertyData: PropertyData;
  chainOfTitle?: ChainOfTitleAnalysis;
  currentStep: number;
  allStepsData: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  complianceScore: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  legalBasis: string;
  consequences: string;
  remediation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
  legalBasis?: string;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface ValidationSuggestion {
  field: string;
  suggestion: string;
  reasoning: string;
  confidence: number;
  legalBenefit: string;
}

export interface CaliforniaLegalCode {
  section: string;
  title: string;
  description: string;
  requirements: string[];
  penalties: string[];
  applicableDocuments: string[];
}

export class LegalValidationEngine {
  private static rules: LegalValidationRule[] = [];
  private static californiaCodes: CaliforniaLegalCode[] = [];
  private static initialized = false;

  // Initialize the legal validation engine
  static initialize(): void {
    if (this.initialized) return;

    this.initializeCaliforniaCodes();
    this.initializeValidationRules();
    this.initialized = true;
  }

  // Main validation method
  static async validateDocument(context: ValidationContext): Promise<ValidationResult> {
    this.initialize();

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Get applicable rules for this document type
    const applicableRules = this.rules.filter(rule => 
      rule.documentTypes.includes(context.documentType)
    );

    // Run all validation rules
    for (const rule of applicableRules) {
      try {
        const result = rule.validator(context.allStepsData, context);
        
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        suggestions.push(...result.suggestions);
      } catch (error) {
        console.error(`Validation rule ${rule.id} failed:`, error);
        warnings.push({
          field: 'system',
          message: `Validation rule ${rule.name} encountered an error`,
          recommendation: 'Manual review recommended',
          riskLevel: 'medium'
        });
      }
    }

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(errors, warnings, applicableRules.length);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      suggestions,
      complianceScore
    };
  }

  // Real-time field validation
  static async validateField(
    field: string,
    value: any,
    context: ValidationContext
  ): Promise<{ isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] }> {
    this.initialize();

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get rules that apply to this specific field
    const fieldRules = this.rules.filter(rule => 
      rule.documentTypes.includes(context.documentType) &&
      rule.fields.includes(field)
    );

    // Create temporary data object for validation
    const tempData = { ...context.allStepsData };
    this.setNestedValue(tempData, field, value);

    // Run field-specific validation
    for (const rule of fieldRules) {
      try {
        const result = rule.validator(tempData, context);
        errors.push(...result.errors.filter(e => e.field === field));
        warnings.push(...result.warnings.filter(w => w.field === field));
      } catch (error) {
        console.error(`Field validation rule ${rule.id} failed:`, error);
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings
    };
  }

  // Initialize California legal codes
  private static initializeCaliforniaCodes(): void {
    this.californiaCodes = [
      {
        section: 'Civil Code §1091',
        title: 'Grant Deed Requirements',
        description: 'Requirements for valid grant deeds in California',
        requirements: [
          'Must identify grantor and grantee',
          'Must contain granting clause',
          'Must describe property with certainty',
          'Must be signed by grantor',
          'Must be acknowledged'
        ],
        penalties: ['Deed may be void', 'Recording may be rejected'],
        applicableDocuments: ['grant_deed']
      },
      {
        section: 'Civil Code §1092',
        title: 'Property Description Requirements',
        description: 'Legal description requirements for real property transfers',
        requirements: [
          'Description must identify property with reasonable certainty',
          'May reference recorded maps or surveys',
          'Must include county location',
          'APN alone may be insufficient'
        ],
        penalties: ['Deed may be void for uncertainty'],
        applicableDocuments: ['grant_deed', 'quitclaim_deed', 'warranty_deed']
      },
      {
        section: 'Civil Code §1095',
        title: 'Grantor Authority',
        description: 'Requirements for grantor authority and capacity',
        requirements: [
          'Grantor must have legal capacity',
          'Grantor must own the interest being conveyed',
          'Corporate grantors must have proper authorization',
          'Names must match title records'
        ],
        penalties: ['Deed may be void', 'Title defects'],
        applicableDocuments: ['grant_deed', 'quitclaim_deed', 'warranty_deed']
      },
      {
        section: 'Government Code §27321',
        title: 'Recording Requirements',
        description: 'County recorder requirements for document recording',
        requirements: [
          'Must include return address',
          'Must pay recording fees',
          'Must meet formatting requirements',
          'Must include APN when required'
        ],
        penalties: ['Recording rejection', 'Delays in title transfer'],
        applicableDocuments: ['grant_deed', 'quitclaim_deed', 'warranty_deed', 'interspousal_transfer']
      },
      {
        section: 'Revenue & Taxation Code §11911',
        title: 'Documentary Transfer Tax',
        description: 'Transfer tax requirements for real property transfers',
        requirements: [
          'Must declare transfer tax or exemption',
          'Must calculate tax correctly',
          'Must indicate tax jurisdiction',
          'Must specify basis of tax'
        ],
        penalties: ['Recording rejection', 'Tax penalties', 'Interest charges'],
        applicableDocuments: ['grant_deed', 'warranty_deed']
      },
      {
        section: 'Family Code §1100',
        title: 'Community Property Requirements',
        description: 'Requirements for community property transfers',
        requirements: [
          'Both spouses must consent to transfer',
          'Interspousal transfers have special rules',
          'Community property presumptions apply',
          'Separate property must be clearly identified'
        ],
        penalties: ['Void transfer', 'Breach of fiduciary duty'],
        applicableDocuments: ['grant_deed', 'quitclaim_deed', 'interspousal_transfer']
      }
    ];
  }

  // Initialize validation rules
  private static initializeValidationRules(): void {
    this.rules = [
      // Property Description Validation (Civil Code §1092)
      {
        id: 'legal_description_completeness',
        name: 'Legal Description Completeness',
        code: 'Civil Code §1092',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        fields: ['parties.legalDescription'],
        validator: (data, context) => this.validateLegalDescription(data, context),
        severity: 'error',
        category: 'mandatory',
        legalBasis: 'Property must be described with reasonable certainty',
        consequences: 'Deed may be void for uncertainty',
        remediation: 'Obtain complete legal description from title report'
      },

      // Grantor Name Validation (Civil Code §1095)
      {
        id: 'grantor_name_accuracy',
        name: 'Grantor Name Accuracy',
        code: 'Civil Code §1095',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        fields: ['parties.grantorsText'],
        validator: (data, context) => this.validateGrantorNames(data, context),
        severity: 'error',
        category: 'mandatory',
        legalBasis: 'Grantor names must match title records exactly',
        consequences: 'Deed may be void, title defects may occur',
        remediation: 'Verify names against current title or deed'
      },

      // Grantee Name Validation
      {
        id: 'grantee_name_format',
        name: 'Grantee Name Format',
        code: 'Civil Code §1091',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        fields: ['parties.granteesText'],
        validator: (data, context) => this.validateGranteeNames(data, context),
        severity: 'warning',
        category: 'recommended',
        legalBasis: 'Grantee names should include vesting information',
        consequences: 'May create ambiguity in ownership',
        remediation: 'Specify how grantees will hold title'
      },

      // APN Validation
      {
        id: 'apn_format_validation',
        name: 'APN Format Validation',
        code: 'Government Code §27321',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed', 'interspousal_transfer'],
        fields: ['recording.apn', 'property.apn'],
        validator: (data, context) => this.validateAPN(data, context),
        severity: 'warning',
        category: 'recommended',
        legalBasis: 'APN helps identify property for recording',
        consequences: 'May cause recording delays',
        remediation: 'Verify APN format with county assessor'
      },

      // Transfer Tax Validation (Revenue & Taxation Code §11911)
      {
        id: 'transfer_tax_calculation',
        name: 'Transfer Tax Calculation',
        code: 'Revenue & Taxation Code §11911',
        documentTypes: ['grant_deed', 'warranty_deed'],
        fields: ['tax.dttAmount', 'tax.dttBasis'],
        validator: (data, context) => this.validateTransferTax(data, context),
        severity: 'error',
        category: 'mandatory',
        legalBasis: 'Transfer tax must be calculated and declared correctly',
        consequences: 'Recording rejection, tax penalties',
        remediation: 'Calculate tax based on consideration or full value'
      },

      // Recording Information Validation (Government Code §27321)
      {
        id: 'recording_requirements',
        name: 'Recording Requirements',
        code: 'Government Code §27321',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed', 'interspousal_transfer'],
        fields: ['recording.requestedBy', 'recording.mailTo'],
        validator: (data, context) => this.validateRecordingInfo(data, context),
        severity: 'error',
        category: 'mandatory',
        legalBasis: 'Recording information required for county processing',
        consequences: 'Recording rejection',
        remediation: 'Provide complete recording information'
      },

      // Community Property Validation (Family Code §1100)
      {
        id: 'community_property_compliance',
        name: 'Community Property Compliance',
        code: 'Family Code §1100',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'interspousal_transfer'],
        fields: ['parties.grantorsText', 'parties.granteesText'],
        validator: (data, context) => this.validateCommunityProperty(data, context),
        severity: 'warning',
        category: 'recommended',
        legalBasis: 'Community property transfers require special consideration',
        consequences: 'Potential breach of fiduciary duty',
        remediation: 'Verify marital status and property characterization'
      },

      // Interspousal Transfer Validation
      {
        id: 'interspousal_transfer_requirements',
        name: 'Interspousal Transfer Requirements',
        code: 'Family Code §1100',
        documentTypes: ['interspousal_transfer'],
        fields: ['parties.grantorsText', 'parties.granteesText', 'tax.exemptionReason'],
        validator: (data, context) => this.validateInterspousalTransfer(data, context),
        severity: 'error',
        category: 'mandatory',
        legalBasis: 'Interspousal transfers have specific legal requirements',
        consequences: 'Transfer may be invalid, tax benefits lost',
        remediation: 'Ensure both parties are married and transfer is between spouses'
      }
    ];
  }

  // Validation rule implementations
  private static validateLegalDescription(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const legalDesc = data.parties?.legalDescription || '';

    if (!legalDesc || legalDesc.trim().length === 0) {
      errors.push({
        field: 'parties.legalDescription',
        message: 'Legal description is required',
        code: 'Civil Code §1092',
        legalBasis: 'Property must be described with reasonable certainty',
        consequences: 'Deed will be void for uncertainty',
        remediation: 'Obtain complete legal description from title report or survey',
        severity: 'critical'
      });
    } else {
      // Check for completeness indicators
      const requiredElements = ['lot', 'block', 'tract', 'map', 'county'];
      const hasElements = requiredElements.some(element => 
        legalDesc.toLowerCase().includes(element.toLowerCase())
      );

      if (!hasElements) {
        warnings.push({
          field: 'parties.legalDescription',
          message: 'Legal description may be incomplete',
          recommendation: 'Verify description includes lot, block, tract, or other identifying information',
          legalBasis: 'Civil Code §1092 - reasonable certainty requirement',
          riskLevel: 'high'
        });
      }

      // Check length - very short descriptions are suspicious
      if (legalDesc.length < 50) {
        warnings.push({
          field: 'parties.legalDescription',
          message: 'Legal description appears unusually short',
          recommendation: 'Verify description is complete and accurate',
          riskLevel: 'medium'
        });
      }

      // Check for county mention
      if (!legalDesc.toLowerCase().includes('county')) {
        suggestions.push({
          field: 'parties.legalDescription',
          suggestion: 'Consider adding county name to legal description',
          reasoning: 'County identification helps with recording and clarity',
          confidence: 0.7,
          legalBenefit: 'Reduces ambiguity and aids in property identification'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateGrantorNames(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const grantorsText = data.parties?.grantorsText || '';

    if (!grantorsText || grantorsText.trim().length === 0) {
      errors.push({
        field: 'parties.grantorsText',
        message: 'Grantor names are required',
        code: 'Civil Code §1095',
        legalBasis: 'Grantor must be identified in deed',
        consequences: 'Deed will be void',
        remediation: 'Enter complete grantor names as they appear on title',
        severity: 'critical'
      });
    } else {
      // Check against chain of title if available
      if (context.chainOfTitle?.currentOwner) {
        const currentOwner = context.chainOfTitle.currentOwner.name.toLowerCase();
        const grantorLower = grantorsText.toLowerCase();
        
        if (!grantorLower.includes(currentOwner.split(' ')[0]) || 
            !grantorLower.includes(currentOwner.split(' ').pop() || '')) {
          warnings.push({
            field: 'parties.grantorsText',
            message: 'Grantor names may not match current title holder',
            recommendation: 'Verify grantor names match exactly with current deed or title report',
            legalBasis: 'Civil Code §1095 - grantor must own the interest being conveyed',
            riskLevel: 'high'
          });
        }
      }

      // Check for vesting information
      const vestingIndicators = ['single', 'married', 'trustee', 'llc', 'corporation', 'partnership'];
      const hasVesting = vestingIndicators.some(indicator => 
        grantorsText.toLowerCase().includes(indicator)
      );

      if (!hasVesting) {
        suggestions.push({
          field: 'parties.grantorsText',
          suggestion: 'Consider adding marital status or entity type',
          reasoning: 'Vesting information clarifies grantor capacity',
          confidence: 0.8,
          legalBenefit: 'Reduces ambiguity and potential title issues'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateGranteeNames(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const granteesText = data.parties?.granteesText || '';

    if (!granteesText || granteesText.trim().length === 0) {
      errors.push({
        field: 'parties.granteesText',
        message: 'Grantee names are required',
        code: 'Civil Code §1091',
        legalBasis: 'Grantee must be identified in deed',
        consequences: 'Deed will be void',
        remediation: 'Enter complete grantee names with vesting information',
        severity: 'critical'
      });
    } else {
      // Check for vesting information
      const vestingTypes = [
        'joint tenants', 'tenants in common', 'community property', 
        'single', 'married', 'trustee', 'as trustee'
      ];
      
      const hasVesting = vestingTypes.some(vesting => 
        granteesText.toLowerCase().includes(vesting)
      );

      if (!hasVesting) {
        warnings.push({
          field: 'parties.granteesText',
          message: 'Grantee vesting information missing',
          recommendation: 'Specify how grantees will hold title (joint tenants, tenants in common, etc.)',
          legalBasis: 'Vesting determines ownership rights and transfer requirements',
          riskLevel: 'medium'
        });
      }

      // Check for multiple grantees without vesting specification
      const granteeCount = granteesText.split(';').length;
      if (granteeCount > 1 && !hasVesting) {
        warnings.push({
          field: 'parties.granteesText',
          message: 'Multiple grantees require vesting specification',
          recommendation: 'Specify whether as joint tenants, tenants in common, or other vesting',
          legalBasis: 'Default vesting may not match grantees\' intentions',
          riskLevel: 'high'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateAPN(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const apn = data.recording?.apn || data.property?.apn || '';

    if (!apn || apn.trim().length === 0) {
      warnings.push({
        field: 'recording.apn',
        message: 'APN (Assessor Parcel Number) is recommended',
        recommendation: 'Include APN to help county recorder identify property',
        legalBasis: 'Government Code §27321 - aids in recording process',
        riskLevel: 'low'
      });
    } else {
      // Validate APN format
      const apnPattern = /^\d{3}-\d{3}-\d{3}$|^\d{8,12}$/;
      if (!apnPattern.test(apn.replace(/\s/g, ''))) {
        warnings.push({
          field: 'recording.apn',
          message: 'APN format may be incorrect',
          recommendation: 'Verify APN format with county assessor (typically XXX-XXX-XXX)',
          riskLevel: 'medium'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateTransferTax(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const dttAmount = data.tax?.dttAmount;
    const dttBasis = data.tax?.dttBasis;

    if (context.documentType === 'interspousal_transfer') {
      // Interspousal transfers are typically exempt
      if (dttAmount && parseFloat(dttAmount) > 0) {
        warnings.push({
          field: 'tax.dttAmount',
          message: 'Interspousal transfers are typically tax-exempt',
          recommendation: 'Verify if transfer tax applies to this interspousal transfer',
          riskLevel: 'medium'
        });
      }
      return { isValid: true, errors, warnings, suggestions, complianceScore: 0 };
    }

    if (!dttAmount && !data.tax?.exemptionReason) {
      errors.push({
        field: 'tax.dttAmount',
        message: 'Transfer tax amount or exemption reason required',
        code: 'Revenue & Taxation Code §11911',
        legalBasis: 'Transfer tax must be declared or exemption claimed',
        consequences: 'Recording will be rejected',
        remediation: 'Calculate transfer tax or specify exemption reason',
        severity: 'high'
      });
    } else if (dttAmount) {
      const amount = parseFloat(dttAmount);
      
      if (isNaN(amount) || amount < 0) {
        errors.push({
          field: 'tax.dttAmount',
          message: 'Invalid transfer tax amount',
          code: 'Revenue & Taxation Code §11911',
          legalBasis: 'Transfer tax amount must be valid number',
          consequences: 'Recording rejection',
          remediation: 'Enter valid transfer tax amount',
          severity: 'high'
        });
      }

      if (!dttBasis) {
        warnings.push({
          field: 'tax.dttBasis',
          message: 'Transfer tax basis not specified',
          recommendation: 'Specify whether tax is based on full value, consideration, or other basis',
          riskLevel: 'medium'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateRecordingInfo(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const requestedBy = data.recording?.requestedBy;
    const mailTo = data.recording?.mailTo;

    if (!requestedBy || requestedBy.trim().length === 0) {
      errors.push({
        field: 'recording.requestedBy',
        message: 'Recording requested by information is required',
        code: 'Government Code §27321',
        legalBasis: 'County recorder requires identification of requesting party',
        consequences: 'Recording will be rejected',
        remediation: 'Enter name of person or company requesting recording',
        severity: 'high'
      });
    }

    if (!mailTo || !mailTo.name || !mailTo.address1 || !mailTo.city || !mailTo.state || !mailTo.zip) {
      errors.push({
        field: 'recording.mailTo',
        message: 'Complete return address is required',
        code: 'Government Code §27321',
        legalBasis: 'County recorder requires complete return address',
        consequences: 'Recording will be rejected',
        remediation: 'Provide complete name and address for document return',
        severity: 'high'
      });
    } else {
      // Validate ZIP code format
      const zipPattern = /^\d{5}(-\d{4})?$/;
      if (!zipPattern.test(mailTo.zip)) {
        warnings.push({
          field: 'recording.mailTo.zip',
          message: 'ZIP code format may be incorrect',
          recommendation: 'Use 5-digit or 9-digit ZIP code format (12345 or 12345-6789)',
          riskLevel: 'low'
        });
      }

      // Validate state
      if (mailTo.state.length !== 2) {
        warnings.push({
          field: 'recording.mailTo.state',
          message: 'Use 2-letter state abbreviation',
          recommendation: 'Enter state as 2-letter abbreviation (e.g., CA, NY)',
          riskLevel: 'low'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateCommunityProperty(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const grantorsText = data.parties?.grantorsText || '';
    const granteesText = data.parties?.granteesText || '';

    // Check for married couples in grantors
    const marriedIndicators = ['husband and wife', 'married couple', 'married man', 'married woman'];
    const hasMarriedGrantor = marriedIndicators.some(indicator => 
      grantorsText.toLowerCase().includes(indicator)
    );

    if (hasMarriedGrantor) {
      // Check if both spouses are included
      const hasAnd = grantorsText.toLowerCase().includes(' and ');
      if (!hasAnd) {
        warnings.push({
          field: 'parties.grantorsText',
          message: 'Community property transfer may require both spouses',
          recommendation: 'Verify if both spouses need to sign for community property transfer',
          legalBasis: 'Family Code §1100 - both spouses must consent to community property transfers',
          riskLevel: 'high'
        });
      }

      // Suggest community property vesting for grantees if they're married
      const hasMarriedGrantee = marriedIndicators.some(indicator => 
        granteesText.toLowerCase().includes(indicator)
      );

      if (hasMarriedGrantee && !granteesText.toLowerCase().includes('community property')) {
        suggestions.push({
          field: 'parties.granteesText',
          suggestion: 'Consider "as community property" vesting for married grantees',
          reasoning: 'Community property vesting may provide tax and legal benefits',
          confidence: 0.7,
          legalBenefit: 'Stepped-up basis on death, simplified transfer rights'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  private static validateInterspousalTransfer(data: any, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const grantorsText = data.parties?.grantorsText || '';
    const granteesText = data.parties?.granteesText || '';
    const exemptionReason = data.tax?.exemptionReason || '';

    // Verify this is actually between spouses
    const marriedIndicators = ['husband', 'wife', 'spouse'];
    const grantorHasMarried = marriedIndicators.some(indicator => 
      grantorsText.toLowerCase().includes(indicator)
    );
    const granteeHasMarried = marriedIndicators.some(indicator => 
      granteesText.toLowerCase().includes(indicator)
    );

    if (!grantorHasMarried && !granteeHasMarried) {
      warnings.push({
        field: 'parties.grantorsText',
        message: 'Interspousal transfer should be between married parties',
        recommendation: 'Verify parties are married and specify marital relationship',
        legalBasis: 'Family Code §1100 - interspousal transfer requirements',
        riskLevel: 'high'
      });
    }

    // Check for proper tax exemption
    if (!exemptionReason || !exemptionReason.toLowerCase().includes('interspousal')) {
      warnings.push({
        field: 'tax.exemptionReason',
        message: 'Interspousal transfer tax exemption should be specified',
        recommendation: 'Specify "Interspousal transfer - no consideration" or similar',
        riskLevel: 'medium'
      });
    }

    // Suggest proper vesting language
    if (!granteesText.toLowerCase().includes('separate property') && 
        !granteesText.toLowerCase().includes('community property')) {
      suggestions.push({
        field: 'parties.granteesText',
        suggestion: 'Consider specifying separate or community property characterization',
        reasoning: 'Property characterization affects tax treatment and future transfers',
        confidence: 0.8,
        legalBenefit: 'Clarifies property rights and tax implications'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, complianceScore: 0 };
  }

  // Calculate compliance score
  private static calculateComplianceScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    totalRules: number
  ): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Deduct points for warnings
    warnings.forEach(warning => {
      switch (warning.riskLevel) {
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    return Math.max(0, score);
  }

  // Utility methods
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Public methods for getting legal information
  static getCaliforniaCode(section: string): CaliforniaLegalCode | undefined {
    this.initialize();
    return this.californiaCodes.find(code => code.section === section);
  }

  static getApplicableCodes(documentType: string): CaliforniaLegalCode[] {
    this.initialize();
    return this.californiaCodes.filter(code => 
      code.applicableDocuments.includes(documentType)
    );
  }

  static getValidationRules(documentType: string): LegalValidationRule[] {
    this.initialize();
    return this.rules.filter(rule => rule.documentTypes.includes(documentType));
  }
}

// Export types and engine
export { LegalValidationEngine };
export type {
  LegalValidationRule,
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  CaliforniaLegalCode
};


