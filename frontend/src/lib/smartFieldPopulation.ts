import { PropertyData, WizardState, DocumentData } from './wizardState';
import { DOCUMENT_REGISTRY, DocumentConfig } from './documentRegistry';
import { ChainOfTitleService, ChainOfTitleAnalysis } from '../services/chainOfTitleService';

// Smart Field Population System for Advanced Document Intelligence
export interface FieldPopulationRule {
  id: string;
  name: string;
  sourceField: string;
  targetField: string;
  documentTypes: string[];
  condition?: (data: any) => boolean;
  transformer?: (value: any, context: PopulationContext) => any;
  confidence: number;
  requiresVerification: boolean;
  legalImplications?: string;
}

export interface PopulationContext {
  documentType: string;
  currentStep: number;
  propertyData: PropertyData;
  stepData: Record<string, any>;
  chainOfTitle?: ChainOfTitleAnalysis;
  userPreferences: UserPreferences;
  previousDocuments: DocumentData[];
}

export interface UserPreferences {
  autoFillEnabled: boolean;
  preferredTitleCompany?: string;
  preferredReturnAddress?: ReturnAddress;
  defaultDTTBasis?: string;
  autoApplyHighConfidence: boolean;
  verificationThreshold: number;
}

export interface ReturnAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface FieldSuggestion {
  field: string;
  value: any;
  confidence: number;
  source: 'property_data' | 'chain_of_title' | 'user_preferences' | 'cross_document' | 'ai_inference';
  reasoning: string;
  requiresVerification: boolean;
  legalImplications?: string;
  alternatives?: Array<{ value: any; confidence: number; reasoning: string }>;
}

export interface PopulationResult {
  suggestions: FieldSuggestion[];
  autoApplied: FieldSuggestion[];
  errors: string[];
  warnings: string[];
  confidence: number;
  processingTime: number;
}

export class SmartFieldPopulationEngine {
  private static rules: FieldPopulationRule[] = [];
  private static userPreferences: UserPreferences = {
    autoFillEnabled: true,
    autoApplyHighConfidence: true,
    verificationThreshold: 0.8
  };
  private static initialized = false;

  // Initialize the field population engine
  static initialize(): void {
    if (this.initialized) return;

    this.initializePopulationRules();
    this.loadUserPreferences();
    this.initialized = true;
  }

  // Main field population method
  static async populateFields(context: PopulationContext): Promise<PopulationResult> {
    this.initialize();
    const startTime = Date.now();

    try {
      const suggestions: FieldSuggestion[] = [];
      const autoApplied: FieldSuggestion[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get document configuration
      const documentConfig = DOCUMENT_REGISTRY[context.documentType];
      if (!documentConfig) {
        throw new Error(`Unknown document type: ${context.documentType}`);
      }

      // Get current step configuration
      const currentStepConfig = documentConfig.requiredSteps[context.currentStep - 1];
      if (!currentStepConfig) {
        throw new Error(`Invalid step ${context.currentStep} for document type ${context.documentType}`);
      }

      // Populate from different sources
      const propertySuggestions = await this.populateFromPropertyData(context, currentStepConfig);
      const chainSuggestions = await this.populateFromChainOfTitle(context, currentStepConfig);
      const preferencesSuggestions = await this.populateFromUserPreferences(context, currentStepConfig);
      const crossDocSuggestions = await this.populateFromCrossDocument(context, currentStepConfig);
      const aiSuggestions = await this.populateFromAI(context, currentStepConfig);

      // Combine all suggestions
      const allSuggestions = [
        ...propertySuggestions,
        ...chainSuggestions,
        ...preferencesSuggestions,
        ...crossDocSuggestions,
        ...aiSuggestions
      ];

      // Resolve conflicts and prioritize suggestions
      const resolvedSuggestions = this.resolveSuggestionConflicts(allSuggestions);

      // Separate auto-apply vs manual suggestions
      for (const suggestion of resolvedSuggestions) {
        if (this.shouldAutoApply(suggestion, context)) {
          autoApplied.push(suggestion);
        } else {
          suggestions.push(suggestion);
        }
      }

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(resolvedSuggestions);

      return {
        suggestions,
        autoApplied,
        errors,
        warnings,
        confidence: overallConfidence,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Field population failed:', error);
      return {
        suggestions: [],
        autoApplied: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  // Initialize population rules
  private static initializePopulationRules(): void {
    this.rules = [
      // Property Information Rules
      {
        id: 'property_address_to_parties',
        name: 'Property Address to Legal Description',
        sourceField: 'property.address',
        targetField: 'parties.county',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        transformer: (address: string) => this.extractCountyFromAddress(address),
        confidence: 0.9,
        requiresVerification: false
      },
      {
        id: 'property_apn_to_recording',
        name: 'APN to Recording Block',
        sourceField: 'property.apn',
        targetField: 'recording.apn',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed', 'interspousal_transfer'],
        confidence: 0.95,
        requiresVerification: false
      },
      {
        id: 'property_legal_description',
        name: 'Legal Description Population',
        sourceField: 'property.legalDescription',
        targetField: 'parties.legalDescription',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        confidence: 0.9,
        requiresVerification: true,
        legalImplications: 'Legal description must be exact and complete'
      },

      // Current Owner Rules
      {
        id: 'current_owner_to_grantor',
        name: 'Current Owner to Grantor',
        sourceField: 'property.currentOwners',
        targetField: 'parties.grantorsText',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        transformer: (owners: any[]) => this.formatOwnersAsGrantors(owners),
        confidence: 0.85,
        requiresVerification: true,
        legalImplications: 'Grantor names must match title records exactly'
      },

      // Chain of Title Rules
      {
        id: 'chain_current_owner_to_grantor',
        name: 'Chain of Title Current Owner to Grantor',
        sourceField: 'chainOfTitle.currentOwner',
        targetField: 'parties.grantorsText',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        transformer: (currentOwner: any) => this.formatChainOwnerAsGrantor(currentOwner),
        confidence: 0.9,
        requiresVerification: true,
        legalImplications: 'Must match current title holder exactly'
      },

      // User Preferences Rules
      {
        id: 'preferred_title_company',
        name: 'Preferred Title Company',
        sourceField: 'userPreferences.preferredTitleCompany',
        targetField: 'recording.requestedBy',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed'],
        confidence: 0.7,
        requiresVerification: false
      },
      {
        id: 'preferred_return_address',
        name: 'Preferred Return Address',
        sourceField: 'userPreferences.preferredReturnAddress',
        targetField: 'recording.mailTo',
        documentTypes: ['grant_deed', 'quitclaim_deed', 'warranty_deed', 'interspousal_transfer'],
        confidence: 0.8,
        requiresVerification: false
      },

      // Cross-Document Rules
      {
        id: 'previous_grantee_to_grantor',
        name: 'Previous Grantee to Current Grantor',
        sourceField: 'previousDocument.parties.granteesText',
        targetField: 'parties.grantorsText',
        documentTypes: ['grant_deed', 'quitclaim_deed'],
        condition: (data) => data.previousDocument?.documentType !== 'interspousal_transfer',
        confidence: 0.8,
        requiresVerification: true,
        legalImplications: 'Verify ownership chain continuity'
      },

      // Tax Calculation Rules
      {
        id: 'property_value_to_dtt',
        name: 'Property Value to Transfer Tax',
        sourceField: 'property.assessedValue',
        targetField: 'tax.dttAmount',
        documentTypes: ['grant_deed', 'warranty_deed'],
        transformer: (value: number, context: PopulationContext) => this.calculateDTT(value, context),
        confidence: 0.75,
        requiresVerification: true,
        legalImplications: 'Transfer tax calculation must be accurate'
      },

      // Interspousal Transfer Rules
      {
        id: 'interspousal_tax_exemption',
        name: 'Interspousal Tax Exemption',
        sourceField: 'documentType',
        targetField: 'tax.exemptionReason',
        documentTypes: ['interspousal_transfer'],
        condition: (data) => data.documentType === 'interspousal_transfer',
        transformer: () => 'Interspousal transfer - no consideration',
        confidence: 0.95,
        requiresVerification: false
      }
    ];
  }

  // Populate from property data
  private static async populateFromPropertyData(
    context: PopulationContext,
    stepConfig: any
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];

    if (!context.propertyData) return suggestions;

    // Apply property-based rules
    const propertyRules = this.rules.filter(rule => 
      rule.sourceField.startsWith('property.') &&
      rule.documentTypes.includes(context.documentType)
    );

    for (const rule of propertyRules) {
      const sourceValue = this.getNestedValue(context.propertyData, rule.sourceField.replace('property.', ''));
      
      if (sourceValue && (!rule.condition || rule.condition(context))) {
        const transformedValue = rule.transformer ? 
          rule.transformer(sourceValue, context) : 
          sourceValue;

        if (transformedValue) {
          suggestions.push({
            field: rule.targetField,
            value: transformedValue,
            confidence: rule.confidence,
            source: 'property_data',
            reasoning: `Auto-populated from ${rule.name}`,
            requiresVerification: rule.requiresVerification,
            legalImplications: rule.legalImplications
          });
        }
      }
    }

    return suggestions;
  }

  // Populate from chain of title
  private static async populateFromChainOfTitle(
    context: PopulationContext,
    stepConfig: any
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];

    if (!context.chainOfTitle) {
      // Try to get chain of title if not provided
      try {
        context.chainOfTitle = await ChainOfTitleService.getChainOfTitle({
          propertyData: context.propertyData,
          searchDepth: 'basic',
          includeRiskAnalysis: false
        });
      } catch (error) {
        console.warn('Could not retrieve chain of title for field population:', error);
        return suggestions;
      }
    }

    // Apply chain of title rules
    const chainRules = this.rules.filter(rule => 
      rule.sourceField.startsWith('chainOfTitle.') &&
      rule.documentTypes.includes(context.documentType)
    );

    for (const rule of chainRules) {
      const sourceValue = this.getNestedValue(context.chainOfTitle, rule.sourceField.replace('chainOfTitle.', ''));
      
      if (sourceValue && (!rule.condition || rule.condition(context))) {
        const transformedValue = rule.transformer ? 
          rule.transformer(sourceValue, context) : 
          sourceValue;

        if (transformedValue) {
          suggestions.push({
            field: rule.targetField,
            value: transformedValue,
            confidence: rule.confidence,
            source: 'chain_of_title',
            reasoning: `Auto-populated from ${rule.name}`,
            requiresVerification: rule.requiresVerification,
            legalImplications: rule.legalImplications
          });
        }
      }
    }

    return suggestions;
  }

  // Populate from user preferences
  private static async populateFromUserPreferences(
    context: PopulationContext,
    stepConfig: any
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];

    // Apply user preference rules
    const preferenceRules = this.rules.filter(rule => 
      rule.sourceField.startsWith('userPreferences.') &&
      rule.documentTypes.includes(context.documentType)
    );

    for (const rule of preferenceRules) {
      const sourceValue = this.getNestedValue(context.userPreferences, rule.sourceField.replace('userPreferences.', ''));
      
      if (sourceValue && (!rule.condition || rule.condition(context))) {
        const transformedValue = rule.transformer ? 
          rule.transformer(sourceValue, context) : 
          sourceValue;

        if (transformedValue) {
          suggestions.push({
            field: rule.targetField,
            value: transformedValue,
            confidence: rule.confidence,
            source: 'user_preferences',
            reasoning: `Using your saved preference for ${rule.name}`,
            requiresVerification: rule.requiresVerification,
            legalImplications: rule.legalImplications
          });
        }
      }
    }

    return suggestions;
  }

  // Populate from cross-document data
  private static async populateFromCrossDocument(
    context: PopulationContext,
    stepConfig: any
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];

    if (!context.previousDocuments || context.previousDocuments.length === 0) {
      return suggestions;
    }

    // Get the most recent relevant document
    const relevantDoc = context.previousDocuments
      .filter(doc => doc.propertyData?.apn === context.propertyData.apn)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

    if (!relevantDoc) return suggestions;

    // Apply cross-document rules
    const crossDocRules = this.rules.filter(rule => 
      rule.sourceField.startsWith('previousDocument.') &&
      rule.documentTypes.includes(context.documentType)
    );

    for (const rule of crossDocRules) {
      const sourceValue = this.getNestedValue(relevantDoc, rule.sourceField.replace('previousDocument.', ''));
      
      if (sourceValue && (!rule.condition || rule.condition({ ...context, previousDocument: relevantDoc }))) {
        const transformedValue = rule.transformer ? 
          rule.transformer(sourceValue, context) : 
          sourceValue;

        if (transformedValue) {
          suggestions.push({
            field: rule.targetField,
            value: transformedValue,
            confidence: rule.confidence,
            source: 'cross_document',
            reasoning: `Auto-populated from previous ${relevantDoc.documentType} document`,
            requiresVerification: rule.requiresVerification,
            legalImplications: rule.legalImplications
          });
        }
      }
    }

    return suggestions;
  }

  // Populate from AI inference
  private static async populateFromAI(
    context: PopulationContext,
    stepConfig: any
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];

    try {
      // Use AI service for intelligent field suggestions
      const { AdvancedAIService } = await import('../services/advancedAIService');
      
      const aiSuggestions = await AdvancedAIService.getContextualSuggestions(context);
      
      // Convert AI suggestions to field suggestions
      for (const suggestion of aiSuggestions) {
        // Parse AI suggestion format (assuming it contains field suggestions)
        const fieldMatch = suggestion.match(/^([\w.]+):\s*(.+)$/);
        if (fieldMatch) {
          const [, field, value] = fieldMatch;
          suggestions.push({
            field,
            value,
            confidence: 0.6, // Lower confidence for AI inference
            source: 'ai_inference',
            reasoning: 'AI-suggested based on document context',
            requiresVerification: true,
            legalImplications: 'Please verify AI-generated suggestions'
          });
        }
      }

    } catch (error) {
      console.warn('AI field population failed:', error);
    }

    return suggestions;
  }

  // Resolve conflicts between suggestions
  private static resolveSuggestionConflicts(suggestions: FieldSuggestion[]): FieldSuggestion[] {
    const fieldMap = new Map<string, FieldSuggestion[]>();
    
    // Group suggestions by field
    for (const suggestion of suggestions) {
      if (!fieldMap.has(suggestion.field)) {
        fieldMap.set(suggestion.field, []);
      }
      fieldMap.get(suggestion.field)!.push(suggestion);
    }

    const resolved: FieldSuggestion[] = [];

    // Resolve conflicts for each field
    for (const [field, fieldSuggestions] of fieldMap) {
      if (fieldSuggestions.length === 1) {
        resolved.push(fieldSuggestions[0]);
      } else {
        // Multiple suggestions for same field - prioritize by source and confidence
        const prioritized = fieldSuggestions.sort((a, b) => {
          // Source priority: chain_of_title > property_data > user_preferences > cross_document > ai_inference
          const sourcePriority = {
            'chain_of_title': 5,
            'property_data': 4,
            'user_preferences': 3,
            'cross_document': 2,
            'ai_inference': 1
          };
          
          const aPriority = sourcePriority[a.source] || 0;
          const bPriority = sourcePriority[b.source] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          // If same source, prioritize by confidence
          return b.confidence - a.confidence;
        });

        // Use highest priority suggestion, add others as alternatives
        const primary = prioritized[0];
        const alternatives = prioritized.slice(1).map(s => ({
          value: s.value,
          confidence: s.confidence,
          reasoning: s.reasoning
        }));

        resolved.push({
          ...primary,
          alternatives: alternatives.length > 0 ? alternatives : undefined
        });
      }
    }

    return resolved;
  }

  // Determine if suggestion should be auto-applied
  private static shouldAutoApply(suggestion: FieldSuggestion, context: PopulationContext): boolean {
    if (!context.userPreferences.autoApplyHighConfidence) {
      return false;
    }

    if (suggestion.requiresVerification) {
      return false;
    }

    if (suggestion.confidence < context.userPreferences.verificationThreshold) {
      return false;
    }

    // Don't auto-apply legal-critical fields
    const legalCriticalFields = [
      'parties.grantorsText',
      'parties.granteesText',
      'parties.legalDescription',
      'tax.dttAmount'
    ];

    if (legalCriticalFields.includes(suggestion.field)) {
      return false;
    }

    return true;
  }

  // Calculate overall confidence
  private static calculateOverallConfidence(suggestions: FieldSuggestion[]): number {
    if (suggestions.length === 0) return 0;

    const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
    return totalConfidence / suggestions.length;
  }

  // Helper methods for transformers
  private static extractCountyFromAddress(address: string): string {
    // Simple county extraction - in production, this would use a more sophisticated service
    if (address.toLowerCase().includes('los angeles')) return 'Los Angeles';
    if (address.toLowerCase().includes('orange')) return 'Orange';
    if (address.toLowerCase().includes('san diego')) return 'San Diego';
    if (address.toLowerCase().includes('riverside')) return 'Riverside';
    if (address.toLowerCase().includes('san bernardino')) return 'San Bernardino';
    
    // Default fallback
    return 'Los Angeles';
  }

  private static formatOwnersAsGrantors(owners: any[]): string {
    if (!owners || owners.length === 0) return '';
    
    return owners.map(owner => {
      const name = owner.name || '';
      const vestingType = owner.vestingType || '';
      
      if (vestingType) {
        return `${name}, ${vestingType}`;
      }
      return name;
    }).join('; ');
  }

  private static formatChainOwnerAsGrantor(currentOwner: any): string {
    if (!currentOwner) return '';
    
    const name = currentOwner.name || '';
    const vestingType = currentOwner.vestingType || '';
    
    if (vestingType && vestingType !== 'unknown') {
      return `${name}, ${vestingType}`;
    }
    return name;
  }

  private static calculateDTT(assessedValue: number, context: PopulationContext): string {
    // Basic DTT calculation - in production, this would be more sophisticated
    const rate = 0.0011; // $1.10 per $1,000 (typical California rate)
    const dtt = assessedValue * rate;
    return dtt.toFixed(2);
  }

  // Utility methods
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('wizard_user_preferences');
      if (stored) {
        this.userPreferences = { ...this.userPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  // Public methods for managing preferences
  static updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    
    try {
      localStorage.setItem('wizard_user_preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  static getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  static clearCache(): void {
    // Clear any cached data
  }
}

// Export types and engine
export { SmartFieldPopulationEngine };
export type {
  FieldPopulationRule,
  PopulationContext,
  UserPreferences,
  FieldSuggestion,
  PopulationResult
};


