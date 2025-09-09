import { PropertyData, WizardState } from './wizardState';
import { UserPreferences } from './smartFieldPopulation';
import { DOCUMENT_REGISTRY } from './documentRegistry';

// Intelligent Defaults and User Preference Learning System
export interface UserBehaviorPattern {
  id: string;
  userId: string;
  pattern: string;
  frequency: number;
  lastUsed: Date;
  confidence: number;
  context: BehaviorContext;
}

export interface BehaviorContext {
  documentType: string;
  propertyType?: string;
  county?: string;
  transactionType?: string;
  userRole?: string;
}

export interface LearningData {
  fieldPath: string;
  value: any;
  documentType: string;
  frequency: number;
  lastUsed: Date;
  context: Record<string, any>;
  userSpecific: boolean;
}

export interface IntelligentDefault {
  field: string;
  value: any;
  confidence: number;
  source: 'user_pattern' | 'global_pattern' | 'contextual' | 'property_based' | 'document_type';
  reasoning: string;
  adaptable: boolean;
  expiresAt?: Date;
}

export interface DefaultsContext {
  documentType: string;
  propertyData?: PropertyData;
  userRole?: string;
  county?: string;
  previousDocuments?: Array<{ documentType: string; stepData: any }>;
  sessionData?: Record<string, any>;
}

export interface LearningEvent {
  type: 'field_change' | 'document_complete' | 'preference_update' | 'error_correction';
  field?: string;
  oldValue?: any;
  newValue?: any;
  documentType: string;
  context: DefaultsContext;
  timestamp: Date;
  userInitiated: boolean;
}

export interface AdaptationRule {
  id: string;
  name: string;
  condition: (context: DefaultsContext, patterns: UserBehaviorPattern[]) => boolean;
  adaptation: (context: DefaultsContext, patterns: UserBehaviorPattern[]) => IntelligentDefault[];
  priority: number;
  enabled: boolean;
}

export class IntelligentDefaultsEngine {
  private static learningData: Map<string, LearningData> = new Map();
  private static userPatterns: Map<string, UserBehaviorPattern[]> = new Map();
  private static adaptationRules: AdaptationRule[] = [];
  private static initialized = false;

  // Initialize the intelligent defaults engine
  static initialize(): void {
    if (this.initialized) return;

    this.loadLearningData();
    this.initializeAdaptationRules();
    this.initialized = true;
  }

  // Get intelligent defaults for a given context
  static async getIntelligentDefaults(context: DefaultsContext): Promise<IntelligentDefault[]> {
    this.initialize();

    const defaults: IntelligentDefault[] = [];

    try {
      // Get user-specific patterns
      const userPatterns = await this.getUserPatterns(context);
      
      // Get contextual defaults
      const contextualDefaults = await this.getContextualDefaults(context);
      
      // Get property-based defaults
      const propertyDefaults = await this.getPropertyBasedDefaults(context);
      
      // Get document-type defaults
      const documentDefaults = await this.getDocumentTypeDefaults(context);
      
      // Apply adaptation rules
      const adaptedDefaults = await this.applyAdaptationRules(context, userPatterns);

      // Combine and prioritize defaults
      defaults.push(
        ...userPatterns,
        ...contextualDefaults,
        ...propertyDefaults,
        ...documentDefaults,
        ...adaptedDefaults
      );

      // Remove duplicates and prioritize by confidence
      const uniqueDefaults = this.deduplicateDefaults(defaults);
      
      return uniqueDefaults.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Failed to get intelligent defaults:', error);
      return [];
    }
  }

  // Learn from user behavior
  static async learnFromEvent(event: LearningEvent): Promise<void> {
    this.initialize();

    try {
      // Update learning data
      await this.updateLearningData(event);
      
      // Update user patterns
      await this.updateUserPatterns(event);
      
      // Adapt rules based on new learning
      await this.adaptRules(event);
      
      // Persist learning data
      await this.persistLearningData();

    } catch (error) {
      console.error('Failed to learn from event:', error);
    }
  }

  // Get user-specific patterns
  private static async getUserPatterns(context: DefaultsContext): Promise<IntelligentDefault[]> {
    const defaults: IntelligentDefault[] = [];
    const userId = this.getCurrentUserId();
    
    if (!userId) return defaults;

    const userPatterns = this.userPatterns.get(userId) || [];
    
    // Filter patterns by context
    const relevantPatterns = userPatterns.filter(pattern => 
      pattern.context.documentType === context.documentType &&
      (!context.county || pattern.context.county === context.county) &&
      pattern.frequency >= 2 && // Must have been used at least twice
      pattern.confidence > 0.6
    );

    // Convert patterns to defaults
    for (const pattern of relevantPatterns) {
      const learningKey = `${userId}_${pattern.pattern}_${context.documentType}`;
      const learningData = this.learningData.get(learningKey);
      
      if (learningData) {
        defaults.push({
          field: learningData.fieldPath,
          value: learningData.value,
          confidence: pattern.confidence,
          source: 'user_pattern',
          reasoning: `You typically use "${learningData.value}" for this field (used ${pattern.frequency} times)`,
          adaptable: true
        });
      }
    }

    return defaults;
  }

  // Get contextual defaults based on property and document context
  private static async getContextualDefaults(context: DefaultsContext): Promise<IntelligentDefault[]> {
    const defaults: IntelligentDefault[] = [];

    // County-specific defaults
    if (context.county) {
      const countyDefaults = this.getCountyDefaults(context.county, context.documentType);
      defaults.push(...countyDefaults);
    }

    // Property type defaults
    if (context.propertyData?.propertyType) {
      const propertyTypeDefaults = this.getPropertyTypeDefaults(
        context.propertyData.propertyType,
        context.documentType
      );
      defaults.push(...propertyTypeDefaults);
    }

    // Transaction type defaults
    if (context.propertyData?.transactionContext) {
      const transactionDefaults = this.getTransactionDefaults(
        context.propertyData.transactionContext,
        context.documentType
      );
      defaults.push(...transactionDefaults);
    }

    return defaults;
  }

  // Get property-based defaults
  private static async getPropertyBasedDefaults(context: DefaultsContext): Promise<IntelligentDefault[]> {
    const defaults: IntelligentDefault[] = [];

    if (!context.propertyData) return defaults;

    const property = context.propertyData;

    // Address-based county inference
    if (property.address && !property.county) {
      const inferredCounty = this.inferCountyFromAddress(property.address);
      if (inferredCounty) {
        defaults.push({
          field: 'parties.county',
          value: inferredCounty,
          confidence: 0.8,
          source: 'property_based',
          reasoning: `County inferred from property address: ${property.address}`,
          adaptable: false
        });
      }
    }

    // APN-based defaults
    if (property.apn) {
      defaults.push({
        field: 'recording.apn',
        value: property.apn,
        confidence: 0.95,
        source: 'property_based',
        reasoning: 'APN from property data',
        adaptable: false
      });
    }

    // Legal description
    if (property.legalDescription) {
      defaults.push({
        field: 'parties.legalDescription',
        value: property.legalDescription,
        confidence: 0.9,
        source: 'property_based',
        reasoning: 'Legal description from property records',
        adaptable: false
      });
    }

    // Current owners to grantors
    if (property.currentOwners && property.currentOwners.length > 0) {
      const grantorsText = property.currentOwners
        .map(owner => `${owner.name}${owner.vestingType ? `, ${owner.vestingType}` : ''}`)
        .join('; ');
      
      defaults.push({
        field: 'parties.grantorsText',
        value: grantorsText,
        confidence: 0.85,
        source: 'property_based',
        reasoning: 'Current property owners from title records',
        adaptable: true
      });
    }

    return defaults;
  }

  // Get document-type specific defaults
  private static async getDocumentTypeDefaults(context: DefaultsContext): Promise<IntelligentDefault[]> {
    const defaults: IntelligentDefault[] = [];
    const documentConfig = DOCUMENT_REGISTRY[context.documentType];

    if (!documentConfig) return defaults;

    // Document-specific defaults
    switch (context.documentType) {
      case 'interspousal_transfer':
        defaults.push({
          field: 'tax.exemptionReason',
          value: 'Interspousal transfer - no consideration',
          confidence: 0.95,
          source: 'document_type',
          reasoning: 'Standard exemption reason for interspousal transfers',
          adaptable: false
        });
        break;

      case 'grant_deed':
        defaults.push({
          field: 'tax.dttBasis',
          value: 'full_value',
          confidence: 0.8,
          source: 'document_type',
          reasoning: 'Most grant deeds use full value basis for transfer tax',
          adaptable: true
        });
        break;

      case 'quitclaim_deed':
        defaults.push({
          field: 'tax.dttBasis',
          value: 'nominal',
          confidence: 0.7,
          source: 'document_type',
          reasoning: 'Quitclaim deeds often have nominal consideration',
          adaptable: true
        });
        break;
    }

    return defaults;
  }

  // Apply adaptation rules
  private static async applyAdaptationRules(
    context: DefaultsContext,
    userPatterns: UserBehaviorPattern[]
  ): Promise<IntelligentDefault[]> {
    const defaults: IntelligentDefault[] = [];

    // Sort rules by priority
    const sortedRules = this.adaptationRules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.condition(context, userPatterns)) {
        const ruleDefaults = rule.adaptation(context, userPatterns);
        defaults.push(...ruleDefaults);
      }
    }

    return defaults;
  }

  // Update learning data from events
  private static async updateLearningData(event: LearningEvent): Promise<void> {
    if (event.type !== 'field_change' || !event.field || !event.newValue) return;

    const userId = this.getCurrentUserId();
    const key = `${userId}_${event.field}_${event.documentType}`;
    
    const existing = this.learningData.get(key);
    
    if (existing) {
      existing.frequency += 1;
      existing.lastUsed = event.timestamp;
      existing.value = event.newValue;
    } else {
      this.learningData.set(key, {
        fieldPath: event.field,
        value: event.newValue,
        documentType: event.documentType,
        frequency: 1,
        lastUsed: event.timestamp,
        context: { ...event.context },
        userSpecific: true
      });
    }
  }

  // Update user patterns
  private static async updateUserPatterns(event: LearningEvent): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const userPatterns = this.userPatterns.get(userId) || [];
    const patternId = `${event.field}_${event.newValue}_${event.documentType}`;
    
    const existingPattern = userPatterns.find(p => p.id === patternId);
    
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.lastUsed = event.timestamp;
      existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.05);
    } else {
      userPatterns.push({
        id: patternId,
        userId,
        pattern: `${event.field}=${event.newValue}`,
        frequency: 1,
        lastUsed: event.timestamp,
        confidence: 0.6,
        context: {
          documentType: event.documentType,
          county: event.context.county,
          propertyType: event.context.propertyData?.propertyType
        }
      });
    }

    this.userPatterns.set(userId, userPatterns);
  }

  // Initialize adaptation rules
  private static initializeAdaptationRules(): void {
    this.adaptationRules = [
      {
        id: 'frequent_title_company',
        name: 'Frequent Title Company',
        condition: (context, patterns) => {
          const titleCompanyPatterns = patterns.filter(p => 
            p.pattern.includes('recording.requestedBy') && p.frequency >= 3
          );
          return titleCompanyPatterns.length > 0;
        },
        adaptation: (context, patterns) => {
          const titleCompanyPattern = patterns
            .filter(p => p.pattern.includes('recording.requestedBy'))
            .sort((a, b) => b.frequency - a.frequency)[0];
          
          if (titleCompanyPattern) {
            const value = titleCompanyPattern.pattern.split('=')[1];
            return [{
              field: 'recording.requestedBy',
              value,
              confidence: titleCompanyPattern.confidence,
              source: 'user_pattern',
              reasoning: `You frequently use "${value}" as the requesting title company`,
              adaptable: true
            }];
          }
          return [];
        },
        priority: 10,
        enabled: true
      },

      {
        id: 'consistent_return_address',
        name: 'Consistent Return Address',
        condition: (context, patterns) => {
          const addressPatterns = patterns.filter(p => 
            p.pattern.includes('recording.mailTo') && p.frequency >= 2
          );
          return addressPatterns.length > 0;
        },
        adaptation: (context, patterns) => {
          const addressPattern = patterns
            .filter(p => p.pattern.includes('recording.mailTo'))
            .sort((a, b) => b.frequency - a.frequency)[0];
          
          if (addressPattern) {
            try {
              const value = JSON.parse(addressPattern.pattern.split('=')[1]);
              return [{
                field: 'recording.mailTo',
                value,
                confidence: addressPattern.confidence,
                source: 'user_pattern',
                reasoning: 'Your frequently used return address',
                adaptable: true
              }];
            } catch (error) {
              console.warn('Failed to parse return address pattern:', error);
            }
          }
          return [];
        },
        priority: 8,
        enabled: true
      },

      {
        id: 'county_specific_preferences',
        name: 'County-Specific Preferences',
        condition: (context, patterns) => {
          return context.county !== undefined && patterns.some(p => 
            p.context.county === context.county && p.frequency >= 2
          );
        },
        adaptation: (context, patterns) => {
          const countyPatterns = patterns.filter(p => 
            p.context.county === context.county && p.frequency >= 2
          );
          
          return countyPatterns.map(pattern => {
            const [field, value] = pattern.pattern.split('=');
            return {
              field,
              value,
              confidence: pattern.confidence * 0.9, // Slightly lower confidence for county-specific
              source: 'contextual',
              reasoning: `Your preference for ${context.county} County documents`,
              adaptable: true
            };
          });
        },
        priority: 6,
        enabled: true
      },

      {
        id: 'error_correction_learning',
        name: 'Error Correction Learning',
        condition: (context, patterns) => {
          // This would be triggered by error correction events
          return patterns.some(p => p.pattern.includes('corrected_'));
        },
        adaptation: (context, patterns) => {
          const correctionPatterns = patterns.filter(p => 
            p.pattern.includes('corrected_') && p.frequency >= 1
          );
          
          return correctionPatterns.map(pattern => {
            const [, field, value] = pattern.pattern.split('_');
            return {
              field,
              value,
              confidence: 0.9,
              source: 'user_pattern',
              reasoning: 'Based on your previous corrections',
              adaptable: true
            };
          });
        },
        priority: 12,
        enabled: true
      }
    ];
  }

  // Helper methods
  private static getCountyDefaults(county: string, documentType: string): IntelligentDefault[] {
    const defaults: IntelligentDefault[] = [];

    // County-specific transfer tax rates and jurisdictions
    const countyTaxInfo = this.getCountyTaxInfo(county);
    if (countyTaxInfo) {
      defaults.push({
        field: 'tax.jurisdiction',
        value: countyTaxInfo.jurisdiction,
        confidence: 0.9,
        source: 'contextual',
        reasoning: `Standard jurisdiction for ${county} County`,
        adaptable: false
      });
    }

    return defaults;
  }

  private static getPropertyTypeDefaults(propertyType: string, documentType: string): IntelligentDefault[] {
    const defaults: IntelligentDefault[] = [];

    // Property type specific defaults
    if (propertyType === 'residential' && documentType === 'grant_deed') {
      defaults.push({
        field: 'tax.dttBasis',
        value: 'full_value',
        confidence: 0.8,
        source: 'contextual',
        reasoning: 'Residential properties typically use full value for transfer tax',
        adaptable: true
      });
    }

    return defaults;
  }

  private static getTransactionDefaults(transactionType: string, documentType: string): IntelligentDefault[] {
    const defaults: IntelligentDefault[] = [];

    if (transactionType === 'gift' && documentType === 'grant_deed') {
      defaults.push({
        field: 'tax.dttBasis',
        value: 'nominal',
        confidence: 0.85,
        source: 'contextual',
        reasoning: 'Gift transactions typically have nominal consideration',
        adaptable: true
      });
    }

    return defaults;
  }

  private static inferCountyFromAddress(address: string): string | null {
    const lowerAddress = address.toLowerCase();
    
    // Simple county inference - in production, this would use a more sophisticated service
    if (lowerAddress.includes('los angeles') || lowerAddress.includes('la,')) return 'Los Angeles';
    if (lowerAddress.includes('orange') || lowerAddress.includes('oc,')) return 'Orange';
    if (lowerAddress.includes('san diego')) return 'San Diego';
    if (lowerAddress.includes('riverside')) return 'Riverside';
    if (lowerAddress.includes('san bernardino')) return 'San Bernardino';
    
    return null;
  }

  private static getCountyTaxInfo(county: string): { jurisdiction: string; rate: number } | null {
    const countyInfo: Record<string, { jurisdiction: string; rate: number }> = {
      'Los Angeles': { jurisdiction: 'unincorporated', rate: 0.0011 },
      'Orange': { jurisdiction: 'unincorporated', rate: 0.0011 },
      'San Diego': { jurisdiction: 'unincorporated', rate: 0.0011 },
      'Riverside': { jurisdiction: 'unincorporated', rate: 0.0011 },
      'San Bernardino': { jurisdiction: 'unincorporated', rate: 0.0011 }
    };

    return countyInfo[county] || null;
  }

  private static deduplicateDefaults(defaults: IntelligentDefault[]): IntelligentDefault[] {
    const fieldMap = new Map<string, IntelligentDefault>();

    for (const defaultValue of defaults) {
      const existing = fieldMap.get(defaultValue.field);
      
      if (!existing || defaultValue.confidence > existing.confidence) {
        fieldMap.set(defaultValue.field, defaultValue);
      }
    }

    return Array.from(fieldMap.values());
  }

  private static getCurrentUserId(): string | null {
    // In production, this would get the actual user ID
    return localStorage.getItem('user_id') || 'anonymous';
  }

  private static loadLearningData(): void {
    try {
      const stored = localStorage.getItem('intelligent_defaults_learning');
      if (stored) {
        const data = JSON.parse(stored);
        this.learningData = new Map(data.learningData || []);
        this.userPatterns = new Map(data.userPatterns || []);
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  }

  private static async persistLearningData(): Promise<void> {
    try {
      const data = {
        learningData: Array.from(this.learningData.entries()),
        userPatterns: Array.from(this.userPatterns.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('intelligent_defaults_learning', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist learning data:', error);
    }
  }

  private static async adaptRules(event: LearningEvent): Promise<void> {
    // Implement rule adaptation based on learning events
    // This could adjust rule priorities, enable/disable rules, or create new rules
  }

  // Public methods for managing the system
  static clearLearningData(): void {
    this.learningData.clear();
    this.userPatterns.clear();
    localStorage.removeItem('intelligent_defaults_learning');
  }

  static exportLearningData(): any {
    return {
      learningData: Array.from(this.learningData.entries()),
      userPatterns: Array.from(this.userPatterns.entries()),
      exportedAt: new Date().toISOString()
    };
  }

  static importLearningData(data: any): void {
    try {
      if (data.learningData) {
        this.learningData = new Map(data.learningData);
      }
      if (data.userPatterns) {
        this.userPatterns = new Map(data.userPatterns);
      }
      this.persistLearningData();
    } catch (error) {
      console.error('Failed to import learning data:', error);
    }
  }

  static getStatistics(): any {
    return {
      totalLearningEntries: this.learningData.size,
      totalUserPatterns: Array.from(this.userPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      adaptationRules: this.adaptationRules.length,
      enabledRules: this.adaptationRules.filter(r => r.enabled).length
    };
  }
}

// Export types and engine
export { IntelligentDefaultsEngine };
export type {
  UserBehaviorPattern,
  BehaviorContext,
  LearningData,
  IntelligentDefault,
  DefaultsContext,
  LearningEvent,
  AdaptationRule
};


