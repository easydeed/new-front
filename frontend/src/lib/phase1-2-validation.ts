import { z } from 'zod';
import { PropertyData, Owner } from './wizardState';
import { DocumentSuggestion } from '../services/aiService';

// Validation schemas for Phase 1.2 components

// Enhanced Property Data Validation
export const EnhancedPropertyDataSchema = z.object({
  address: z.string().min(10, "Address must be at least 10 characters"),
  apn: z.string().optional(),
  county: z.string().min(1, "County is required"),
  legalDescription: z.string().optional(),
  currentOwners: z.array(z.object({
    name: z.string().min(1, "Owner name is required"),
    vestingType: z.string().optional(),
    percentage: z.number().optional()
  })),
  titlePointData: z.object({
    liens: z.array(z.any()).optional(),
    encumbrances: z.array(z.any()).optional(),
    taxInfo: z.any().optional(),
    chainOfTitle: z.array(z.any()).optional(),
    lastUpdated: z.date()
  }).optional(),
  propertyType: z.string().optional(),
  transactionContext: z.string().optional()
});

// Property Search Request Validation
export const PropertySearchRequestSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  includeOwners: z.boolean().default(true),
  includeLegalDescription: z.boolean().default(true),
  includeAPN: z.boolean().default(true),
  includeTaxInfo: z.boolean().default(false),
  includeLiens: z.boolean().default(false)
});

// Document Suggestion Validation
export const DocumentSuggestionSchema = z.object({
  recommendedType: z.string().min(1, "Document type is required"),
  confidence: z.number().min(0).max(1, "Confidence must be between 0 and 1"),
  reasoning: z.string().min(10, "Reasoning must be provided"),
  alternatives: z.array(z.object({
    type: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string())
  })).default([]),
  riskFactors: z.array(z.string()).default([]),
  legalConsiderations: z.array(z.string()).default([])
});

// AI Service Response Validation
export const AIServiceResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['titlepoint', 'ai_inference', 'fallback', 'manual']).optional()
});

// Validation Functions

export function validatePropertyData(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    EnhancedPropertyDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
    }
  }

  // Additional business logic validation
  if (data.address) {
    // Check for California address
    if (!data.address.toLowerCase().includes('ca') && !data.address.toLowerCase().includes('california')) {
      warnings.push('Address may not be in California - this system is optimized for California properties');
    }

    // Check for complete address format
    const addressParts = data.address.split(',');
    if (addressParts.length < 3) {
      warnings.push('Address format should include street, city, and state for best results');
    }
  }

  // Validate APN format if provided
  if (data.apn) {
    const apnPattern = /^\d{3}-\d{3}-\d{3}$|^\d{8,12}$/;
    if (!apnPattern.test(data.apn)) {
      warnings.push('APN format may be invalid - California APNs are typically XXX-XXX-XXX or 8-12 digits');
    }
  }

  // Validate county
  if (data.county) {
    const californiaCounties = [
      'Los Angeles', 'Orange', 'San Diego', 'Riverside', 'San Bernardino',
      'Ventura', 'Santa Barbara', 'Kern', 'Fresno', 'Imperial', 'Santa Clara',
      'Alameda', 'Sacramento', 'Contra Costa', 'San Francisco', 'San Mateo',
      'Sonoma', 'Tulare', 'Santa Cruz', 'Solano', 'Monterey', 'Placer',
      'San Joaquin', 'Stanislaus', 'Shasta', 'Butte', 'Yolo', 'El Dorado',
      'Merced', 'Napa', 'Kings', 'Lake', 'San Luis Obispo', 'Humboldt',
      'Mendocino', 'Sutter', 'Yuba', 'Tehama', 'Calaveras', 'Amador',
      'Inyo', 'Mariposa', 'Mono', 'Colusa', 'Glenn', 'Lassen', 'Modoc',
      'Plumas', 'Sierra', 'Siskiyou', 'Trinity', 'Tuolumne', 'Nevada',
      'San Benito', 'Alpine', 'Del Norte', 'Madera'
    ];

    if (!californiaCounties.some(county => 
      county.toLowerCase() === data.county.toLowerCase()
    )) {
      warnings.push(`"${data.county}" may not be a valid California county`);
    }
  }

  // Validate current owners
  if (data.currentOwners && data.currentOwners.length > 0) {
    data.currentOwners.forEach((owner: Owner, index: number) => {
      if (!owner.name || owner.name.trim().length === 0) {
        errors.push(`Owner ${index + 1}: Name is required`);
      }

      // Check for common vesting types
      if (owner.vestingType) {
        const commonVestingTypes = [
          'sole and separate', 'joint tenants', 'tenants in common',
          'community property', 'community property with right of survivorship',
          'as trustees', 'as husband and wife', 'unmarried man', 'unmarried woman',
          'single man', 'single woman', 'married man', 'married woman'
        ];

        if (!commonVestingTypes.some(type => 
          owner.vestingType!.toLowerCase().includes(type.toLowerCase())
        )) {
          warnings.push(`Owner "${owner.name}": Unusual vesting type "${owner.vestingType}"`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDocumentSuggestion(suggestion: any): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    DocumentSuggestionSchema.parse(suggestion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
    }
  }

  // Business logic validation
  if (suggestion.confidence < 0.5) {
    warnings.push('Low confidence suggestion - manual review recommended');
  }

  if (suggestion.confidence > 0.95) {
    warnings.push('Very high confidence - verify AI reasoning is sound');
  }

  // Validate recommended document type exists
  const validDocumentTypes = [
    'grant_deed', 'quitclaim_deed', 'warranty_deed', 
    'interspousal_transfer', 'tax_deed', 'property_profile'
  ];

  if (!validDocumentTypes.includes(suggestion.recommendedType)) {
    errors.push(`Invalid document type: ${suggestion.recommendedType}`);
  }

  // Validate alternatives
  if (suggestion.alternatives) {
    suggestion.alternatives.forEach((alt: any, index: number) => {
      if (!validDocumentTypes.includes(alt.type)) {
        errors.push(`Alternative ${index + 1}: Invalid document type "${alt.type}"`);
      }
      if (alt.confidence >= suggestion.confidence) {
        warnings.push(`Alternative ${index + 1}: Higher confidence than main recommendation`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePropertySearchRequest(request: any): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    PropertySearchRequestSchema.parse(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
    }
  }

  // Additional validation
  if (request.address) {
    // Check for PO Box (not suitable for property search)
    if (request.address.toLowerCase().includes('po box') || 
        request.address.toLowerCase().includes('p.o. box')) {
      errors.push('PO Box addresses cannot be used for property search');
    }

    // Check for minimum address components
    if (request.address.split(' ').length < 3) {
      warnings.push('Address may be too short - include street number, name, city, and state');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Comprehensive validation for Phase 1.2 integration
export function validatePhase1_2Integration(data: {
  propertyData?: PropertyData;
  documentSuggestion?: DocumentSuggestion;
  searchRequest?: any;
}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate property data if provided
  if (data.propertyData) {
    const propertyValidation = validatePropertyData(data.propertyData);
    allErrors.push(...propertyValidation.errors.map(err => `Property: ${err}`));
    allWarnings.push(...propertyValidation.warnings.map(warn => `Property: ${warn}`));
  }

  // Validate document suggestion if provided
  if (data.documentSuggestion) {
    const suggestionValidation = validateDocumentSuggestion(data.documentSuggestion);
    allErrors.push(...suggestionValidation.errors.map(err => `Suggestion: ${err}`));
    allWarnings.push(...suggestionValidation.warnings.map(warn => `Suggestion: ${warn}`));
  }

  // Validate search request if provided
  if (data.searchRequest) {
    const requestValidation = validatePropertySearchRequest(data.searchRequest);
    allErrors.push(...requestValidation.errors.map(err => `Search: ${err}`));
    allWarnings.push(...requestValidation.warnings.map(warn => `Search: ${warn}`));
  }

  // Cross-validation checks
  if (data.propertyData && data.documentSuggestion) {
    // Check if suggestion makes sense for property
    const hasSpouseOwners = data.propertyData.currentOwners.some(owner =>
      owner.name.toLowerCase().includes('husband') ||
      owner.name.toLowerCase().includes('wife') ||
      owner.name.toLowerCase().includes('married')
    );

    if (hasSpouseOwners && data.documentSuggestion.recommendedType !== 'interspousal_transfer') {
      allWarnings.push('Property has spouse owners but AI did not recommend interspousal transfer');
    }

    const hasLiens = data.propertyData.titlePointData?.liens && 
                    data.propertyData.titlePointData.liens.length > 0;

    if (hasLiens && data.documentSuggestion.recommendedType === 'quitclaim_deed') {
      allWarnings.push('Property has liens but AI recommended quitclaim deed (provides no warranties)');
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

// Export validation schemas for use in other components
export {
  EnhancedPropertyDataSchema,
  PropertySearchRequestSchema,
  DocumentSuggestionSchema,
  AIServiceResponseSchema
};


