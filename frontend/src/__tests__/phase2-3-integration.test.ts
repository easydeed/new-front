import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SmartFieldPopulationEngine, FieldSuggestion, PopulationContext } from '../lib/smartFieldPopulation';
import { LegalValidationEngine, ValidationContext, ValidationResult } from '../lib/legalValidationEngine';
import { IntelligentDefaultsEngine, DefaultsContext, LearningEvent } from '../lib/intelligentDefaults';
import { PropertyData, DocumentData } from '../lib/wizardState';

// Test data setup
const mockPropertyData: PropertyData = {
  address: '123 Main St, Los Angeles, CA 90210',
  apn: '123-456-789',
  county: 'Los Angeles',
  legalDescription: 'Lot 1, Block 2, Tract 12345, as per map recorded in Book 100, Page 50, Los Angeles County Records',
  currentOwners: [
    { name: 'John Doe', vestingType: 'a single man' },
    { name: 'Jane Smith', vestingType: 'a single woman' }
  ],
  propertyType: 'residential',
  transactionContext: 'sale'
};

const mockDocumentData: DocumentData = {
  id: 'doc_123',
  documentType: 'grant_deed',
  propertyData: mockPropertyData,
  stepData: {
    property: mockPropertyData,
    recording: {
      requestedBy: 'Test Title Company',
      apn: '123-456-789',
      mailTo: {
        name: 'John Doe',
        address1: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210'
      }
    },
    tax: {
      dttAmount: '100.00',
      dttBasis: 'full_value',
      areaType: 'city',
      cityName: 'Los Angeles'
    },
    parties: {
      grantorsText: 'John Doe, a single man',
      granteesText: 'Jane Smith, a single woman',
      county: 'Los Angeles',
      legalDescription: mockPropertyData.legalDescription
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Phase 2.3: Advanced Document Intelligence Integration Tests', () => {
  
  beforeEach(() => {
    // Clear any cached data
    SmartFieldPopulationEngine.clearCache();
    IntelligentDefaultsEngine.clearLearningData();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Smart Field Population Engine', () => {
    
    test('should populate fields from property data', async () => {
      const context: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 2,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: true,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      };

      const result = await SmartFieldPopulationEngine.populateFields(context);

      expect(result.suggestions).toBeDefined();
      expect(result.autoApplied).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);

      // Should suggest APN for recording
      const apnSuggestion = result.suggestions.find(s => s.field === 'recording.apn');
      expect(apnSuggestion).toBeDefined();
      expect(apnSuggestion?.value).toBe(mockPropertyData.apn);
      expect(apnSuggestion?.source).toBe('property_data');

      // Should suggest legal description
      const legalDescSuggestion = result.suggestions.find(s => s.field === 'parties.legalDescription');
      expect(legalDescSuggestion).toBeDefined();
      expect(legalDescSuggestion?.value).toBe(mockPropertyData.legalDescription);
      expect(legalDescSuggestion?.requiresVerification).toBe(true);
    });

    test('should populate grantor from current owners', async () => {
      const context: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 4,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: false,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      };

      const result = await SmartFieldPopulationEngine.populateFields(context);

      const grantorSuggestion = result.suggestions.find(s => s.field === 'parties.grantorsText');
      expect(grantorSuggestion).toBeDefined();
      expect(grantorSuggestion?.value).toContain('John Doe, a single man');
      expect(grantorSuggestion?.value).toContain('Jane Smith, a single woman');
      expect(grantorSuggestion?.requiresVerification).toBe(true);
      expect(grantorSuggestion?.legalImplications).toContain('match title records exactly');
    });

    test('should handle user preferences', async () => {
      const userPreferences = {
        autoFillEnabled: true,
        preferredTitleCompany: 'Preferred Title Co',
        preferredReturnAddress: {
          name: 'Law Office',
          address1: '456 Legal St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90211'
        },
        autoApplyHighConfidence: true,
        verificationThreshold: 0.7
      };

      const context: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 2,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences,
        previousDocuments: []
      };

      const result = await SmartFieldPopulationEngine.populateFields(context);

      const titleCompanySuggestion = result.suggestions.find(s => s.field === 'recording.requestedBy');
      expect(titleCompanySuggestion?.value).toBe('Preferred Title Co');
      expect(titleCompanySuggestion?.source).toBe('user_preferences');

      const returnAddressSuggestion = result.suggestions.find(s => s.field === 'recording.mailTo');
      expect(returnAddressSuggestion?.value).toEqual(userPreferences.preferredReturnAddress);
    });

    test('should handle cross-document population', async () => {
      const previousDoc: DocumentData = {
        ...mockDocumentData,
        id: 'prev_doc',
        stepData: {
          ...mockDocumentData.stepData,
          parties: {
            ...mockDocumentData.stepData.parties,
            granteesText: 'Previous Grantee, a single person'
          }
        }
      };

      const context: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 4,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: false,
          verificationThreshold: 0.8
        },
        previousDocuments: [previousDoc]
      };

      const result = await SmartFieldPopulationEngine.populateFields(context);

      // Should suggest using previous grantee as current grantor
      const grantorSuggestion = result.suggestions.find(s => 
        s.field === 'parties.grantorsText' && s.source === 'cross_document'
      );
      
      if (grantorSuggestion) {
        expect(grantorSuggestion.value).toBe('Previous Grantee, a single person');
        expect(grantorSuggestion.reasoning).toContain('previous');
      }
    });

    test('should handle interspousal transfer specifics', async () => {
      const context: PopulationContext = {
        documentType: 'interspousal_transfer',
        currentStep: 3,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: true,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      };

      const result = await SmartFieldPopulationEngine.populateFields(context);

      const exemptionSuggestion = result.suggestions.find(s => s.field === 'tax.exemptionReason');
      expect(exemptionSuggestion).toBeDefined();
      expect(exemptionSuggestion?.value).toContain('Interspousal transfer');
      expect(exemptionSuggestion?.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Legal Validation Engine', () => {
    
    test('should validate complete grant deed', async () => {
      const context: ValidationContext = {
        documentType: 'grant_deed',
        stepData: mockDocumentData.stepData,
        propertyData: mockPropertyData,
        currentStep: 5,
        allStepsData: mockDocumentData.stepData
      };

      const result = await LegalValidationEngine.validateDocument(context);

      expect(result).toBeDefined();
      expect(result.complianceScore).toBeGreaterThan(0);
      expect(result.isValid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    test('should detect missing required fields', async () => {
      const incompleteData = {
        parties: {
          grantorsText: '', // Missing required field
          granteesText: 'Jane Smith',
          county: 'Los Angeles',
          legalDescription: mockPropertyData.legalDescription
        }
      };

      const context: ValidationContext = {
        documentType: 'grant_deed',
        stepData: incompleteData,
        propertyData: mockPropertyData,
        currentStep: 4,
        allStepsData: incompleteData
      };

      const result = await LegalValidationEngine.validateDocument(context);

      expect(result.isValid).toBe(false);
      
      const grantorError = result.errors.find(e => e.field === 'parties.grantorsText');
      expect(grantorError).toBeDefined();
      expect(grantorError?.severity).toBe('critical');
      expect(grantorError?.code).toBe('Civil Code §1095');
    });

    test('should validate legal description completeness', async () => {
      const dataWithShortLegalDesc = {
        parties: {
          grantorsText: 'John Doe',
          granteesText: 'Jane Smith',
          county: 'Los Angeles',
          legalDescription: 'Lot 1' // Too short/incomplete
        }
      };

      const context: ValidationContext = {
        documentType: 'grant_deed',
        stepData: dataWithShortLegalDesc,
        propertyData: mockPropertyData,
        currentStep: 4,
        allStepsData: dataWithShortLegalDesc
      };

      const result = await LegalValidationEngine.validateDocument(context);

      const legalDescWarning = result.warnings.find(w => w.field === 'parties.legalDescription');
      expect(legalDescWarning).toBeDefined();
      expect(legalDescWarning?.message).toContain('incomplete');
    });

    test('should validate transfer tax calculation', async () => {
      const dataWithInvalidTax = {
        tax: {
          dttAmount: 'invalid', // Invalid amount
          dttBasis: 'full_value'
        }
      };

      const context: ValidationContext = {
        documentType: 'grant_deed',
        stepData: dataWithInvalidTax,
        propertyData: mockPropertyData,
        currentStep: 3,
        allStepsData: dataWithInvalidTax
      };

      const result = await LegalValidationEngine.validateDocument(context);

      const taxError = result.errors.find(e => e.field === 'tax.dttAmount');
      expect(taxError).toBeDefined();
      expect(taxError?.severity).toBe('high');
      expect(taxError?.code).toBe('Revenue & Taxation Code §11911');
    });

    test('should validate interspousal transfer requirements', async () => {
      const interspousalData = {
        parties: {
          grantorsText: 'John Doe, a married man',
          granteesText: 'Jane Doe, his wife',
          county: 'Los Angeles',
          legalDescription: mockPropertyData.legalDescription
        },
        tax: {
          exemptionReason: 'Interspousal transfer - no consideration'
        }
      };

      const context: ValidationContext = {
        documentType: 'interspousal_transfer',
        stepData: interspousalData,
        propertyData: mockPropertyData,
        currentStep: 4,
        allStepsData: interspousalData
      };

      const result = await LegalValidationEngine.validateDocument(context);

      expect(result.complianceScore).toBeGreaterThan(80);
      
      // Should suggest property characterization
      const vestingSuggestion = result.suggestions.find(s => 
        s.field === 'parties.granteesText' && s.suggestion.includes('separate or community property')
      );
      expect(vestingSuggestion).toBeDefined();
    });

    test('should provide real-time field validation', async () => {
      const context: ValidationContext = {
        documentType: 'grant_deed',
        stepData: {},
        propertyData: mockPropertyData,
        currentStep: 4,
        allStepsData: {}
      };

      const result = await LegalValidationEngine.validateField(
        'parties.grantorsText',
        '', // Empty value
        context
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const error = result.errors[0];
      expect(error.field).toBe('parties.grantorsText');
      expect(error.severity).toBe('critical');
    });

    test('should get applicable California codes', () => {
      const codes = LegalValidationEngine.getApplicableCodes('grant_deed');
      
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.some(code => code.section === 'Civil Code §1091')).toBe(true);
      expect(codes.some(code => code.section === 'Civil Code §1092')).toBe(true);
    });
  });

  describe('Intelligent Defaults Engine', () => {
    
    test('should provide intelligent defaults for new document', async () => {
      const context: DefaultsContext = {
        documentType: 'grant_deed',
        propertyData: mockPropertyData,
        county: 'Los Angeles'
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(context);

      expect(Array.isArray(defaults)).toBe(true);
      expect(defaults.length).toBeGreaterThan(0);

      // Should have property-based defaults
      const apnDefault = defaults.find(d => d.field === 'recording.apn');
      expect(apnDefault).toBeDefined();
      expect(apnDefault?.value).toBe(mockPropertyData.apn);
      expect(apnDefault?.source).toBe('property_based');

      // Should have document-type defaults
      const dttBasisDefault = defaults.find(d => d.field === 'tax.dttBasis');
      expect(dttBasisDefault).toBeDefined();
      expect(dttBasisDefault?.source).toBe('document_type');
    });

    test('should learn from user behavior', async () => {
      const learningEvent: LearningEvent = {
        type: 'field_change',
        field: 'recording.requestedBy',
        oldValue: '',
        newValue: 'My Favorite Title Co',
        documentType: 'grant_deed',
        context: {
          documentType: 'grant_deed',
          propertyData: mockPropertyData,
          county: 'Los Angeles'
        },
        timestamp: new Date(),
        userInitiated: true
      };

      await IntelligentDefaultsEngine.learnFromEvent(learningEvent);

      // Learn from multiple events to establish pattern
      for (let i = 0; i < 3; i++) {
        await IntelligentDefaultsEngine.learnFromEvent({
          ...learningEvent,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      // Now get defaults and check if pattern is learned
      const context: DefaultsContext = {
        documentType: 'grant_deed',
        propertyData: mockPropertyData,
        county: 'Los Angeles'
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(context);
      
      const learnedDefault = defaults.find(d => 
        d.field === 'recording.requestedBy' && 
        d.source === 'user_pattern'
      );
      
      expect(learnedDefault).toBeDefined();
      expect(learnedDefault?.value).toBe('My Favorite Title Co');
      expect(learnedDefault?.reasoning).toContain('typically use');
    });

    test('should provide interspousal transfer defaults', async () => {
      const context: DefaultsContext = {
        documentType: 'interspousal_transfer',
        propertyData: mockPropertyData
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(context);

      const exemptionDefault = defaults.find(d => d.field === 'tax.exemptionReason');
      expect(exemptionDefault).toBeDefined();
      expect(exemptionDefault?.value).toContain('Interspousal transfer');
      expect(exemptionDefault?.confidence).toBeGreaterThan(0.9);
    });

    test('should handle county-specific defaults', async () => {
      const context: DefaultsContext = {
        documentType: 'grant_deed',
        propertyData: { ...mockPropertyData, county: 'Orange' },
        county: 'Orange'
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(context);

      // Should infer county from property data
      const countyDefault = defaults.find(d => d.field === 'parties.county');
      if (countyDefault) {
        expect(countyDefault.value).toBe('Orange');
        expect(countyDefault.source).toBe('property_based');
      }
    });

    test('should export and import learning data', () => {
      // Create some learning data
      const event: LearningEvent = {
        type: 'field_change',
        field: 'test.field',
        newValue: 'test value',
        documentType: 'grant_deed',
        context: { documentType: 'grant_deed' },
        timestamp: new Date(),
        userInitiated: true
      };

      IntelligentDefaultsEngine.learnFromEvent(event);

      // Export data
      const exportedData = IntelligentDefaultsEngine.exportLearningData();
      expect(exportedData).toBeDefined();
      expect(exportedData.exportedAt).toBeDefined();

      // Clear and import
      IntelligentDefaultsEngine.clearLearningData();
      IntelligentDefaultsEngine.importLearningData(exportedData);

      // Verify data was restored
      const stats = IntelligentDefaultsEngine.getStatistics();
      expect(stats.totalLearningEntries).toBeGreaterThan(0);
    });

    test('should provide usage statistics', () => {
      const stats = IntelligentDefaultsEngine.getStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalLearningEntries).toBe('number');
      expect(typeof stats.totalUserPatterns).toBe('number');
      expect(typeof stats.adaptationRules).toBe('number');
      expect(typeof stats.enabledRules).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    
    test('should integrate smart field population with legal validation', async () => {
      // First, populate fields
      const populationContext: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 4,
        propertyData: mockPropertyData,
        stepData: {},
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: true,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      };

      const populationResult = await SmartFieldPopulationEngine.populateFields(populationContext);

      // Apply auto-applied suggestions to step data
      const updatedStepData = { ...mockDocumentData.stepData };
      populationResult.autoApplied.forEach(suggestion => {
        setNestedValue(updatedStepData, suggestion.field, suggestion.value);
      });

      // Then validate the populated document
      const validationContext: ValidationContext = {
        documentType: 'grant_deed',
        stepData: updatedStepData,
        propertyData: mockPropertyData,
        currentStep: 5,
        allStepsData: updatedStepData
      };

      const validationResult = await LegalValidationEngine.validateDocument(validationContext);

      // Auto-populated fields should improve compliance
      expect(validationResult.complianceScore).toBeGreaterThan(70);
      expect(validationResult.errors.filter(e => e.severity === 'critical').length).toBe(0);
    });

    test('should integrate intelligent defaults with field population', async () => {
      // First, get intelligent defaults
      const defaultsContext: DefaultsContext = {
        documentType: 'grant_deed',
        propertyData: mockPropertyData,
        county: 'Los Angeles'
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(defaultsContext);

      // Apply defaults to step data
      const stepDataWithDefaults: any = {};
      defaults.forEach(defaultValue => {
        setNestedValue(stepDataWithDefaults, defaultValue.field, defaultValue.value);
      });

      // Then use field population to enhance
      const populationContext: PopulationContext = {
        documentType: 'grant_deed',
        currentStep: 4,
        propertyData: mockPropertyData,
        stepData: stepDataWithDefaults,
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: false,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      };

      const populationResult = await SmartFieldPopulationEngine.populateFields(populationContext);

      // Should have fewer suggestions since defaults are already applied
      expect(populationResult.suggestions.length).toBeLessThan(10);
      expect(populationResult.confidence).toBeGreaterThan(0.7);
    });

    test('should handle complete document workflow', async () => {
      // Step 1: Get intelligent defaults
      const defaultsContext: DefaultsContext = {
        documentType: 'grant_deed',
        propertyData: mockPropertyData
      };

      const defaults = await IntelligentDefaultsEngine.getIntelligentDefaults(defaultsContext);
      expect(defaults.length).toBeGreaterThan(0);

      // Step 2: Apply defaults and get field population
      const stepData: any = {};
      defaults.forEach(d => setNestedValue(stepData, d.field, d.value));

      const populationResult = await SmartFieldPopulationEngine.populateFields({
        documentType: 'grant_deed',
        currentStep: 4,
        propertyData: mockPropertyData,
        stepData,
        userPreferences: {
          autoFillEnabled: true,
          autoApplyHighConfidence: true,
          verificationThreshold: 0.8
        },
        previousDocuments: []
      });

      // Apply suggestions
      populationResult.autoApplied.forEach(s => setNestedValue(stepData, s.field, s.value));

      // Step 3: Validate final document
      const validationResult = await LegalValidationEngine.validateDocument({
        documentType: 'grant_deed',
        stepData,
        propertyData: mockPropertyData,
        currentStep: 5,
        allStepsData: stepData
      });

      // Step 4: Learn from the completed document
      const learningEvent: LearningEvent = {
        type: 'document_complete',
        documentType: 'grant_deed',
        context: { documentType: 'grant_deed', propertyData: mockPropertyData },
        timestamp: new Date(),
        userInitiated: true
      };

      await IntelligentDefaultsEngine.learnFromEvent(learningEvent);

      // Verify workflow success
      expect(validationResult.complianceScore).toBeGreaterThan(60);
      expect(populationResult.confidence).toBeGreaterThan(0.5);
    });
  });
});

// Helper function to set nested values
function setNestedValue(obj: any, path: string, value: any): void {
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


