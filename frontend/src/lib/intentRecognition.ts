import { WizardContext } from './wizardState';
import { DOCUMENT_REGISTRY } from './documentRegistry';

// Intent Recognition System for Natural Language Processing
export interface Intent {
  type: 'field_update' | 'information_request' | 'navigation' | 'validation' | 'help' | 'document_action';
  confidence: number;
  entities: Entity[];
  parameters: Record<string, any>;
  context: IntentContext;
}

export interface Entity {
  type: 'field_name' | 'value' | 'document_type' | 'step_name' | 'person_name' | 'address' | 'amount' | 'date';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  normalizedValue?: any;
}

export interface IntentContext {
  documentType: string;
  currentStep: number;
  availableFields: string[];
  previousIntents: Intent[];
  conversationTopic?: string;
}

export interface IntentPattern {
  intent: Intent['type'];
  patterns: RegExp[];
  entities: EntityPattern[];
  confidence: number;
  contextRequired?: boolean;
}

export interface EntityPattern {
  type: Entity['type'];
  pattern: RegExp;
  normalizer?: (value: string) => any;
  validator?: (value: any, context: WizardContext) => boolean;
}

export class IntentRecognitionEngine {
  private static patterns: IntentPattern[] = [];
  private static entityPatterns: EntityPattern[] = [];
  private static initialized = false;

  // Initialize the intent recognition system
  static initialize(): void {
    if (this.initialized) return;

    this.initializeIntentPatterns();
    this.initializeEntityPatterns();
    this.initialized = true;
  }

  // Main intent recognition method
  static recognizeIntent(
    text: string,
    context: WizardContext,
    conversationHistory: Intent[] = []
  ): Intent {
    this.initialize();

    const normalizedText = text.toLowerCase().trim();
    const intentContext: IntentContext = {
      documentType: context.documentType,
      currentStep: context.currentStep,
      availableFields: this.getAvailableFields(context),
      previousIntents: conversationHistory.slice(-5), // Last 5 intents for context
      conversationTopic: this.inferConversationTopic(conversationHistory)
    };

    // Extract entities first
    const entities = this.extractEntities(text, context);

    // Match intent patterns
    let bestMatch: { intent: Intent['type']; confidence: number } = {
      intent: 'help',
      confidence: 0.1
    };

    for (const pattern of this.patterns) {
      const confidence = this.matchPattern(normalizedText, pattern, entities, intentContext);
      if (confidence > bestMatch.confidence) {
        bestMatch = { intent: pattern.intent, confidence };
      }
    }

    // Apply context-based confidence adjustments
    const adjustedConfidence = this.adjustConfidenceWithContext(
      bestMatch.intent,
      bestMatch.confidence,
      entities,
      intentContext
    );

    // Extract parameters based on intent and entities
    const parameters = this.extractParameters(bestMatch.intent, entities, context);

    return {
      type: bestMatch.intent,
      confidence: adjustedConfidence,
      entities,
      parameters,
      context: intentContext
    };
  }

  // Initialize intent patterns
  private static initializeIntentPatterns(): void {
    this.patterns = [
      // Field Update Patterns
      {
        intent: 'field_update',
        patterns: [
          /^(fill|enter|set|update|put|add|input)\s+(.+)/,
          /^(.+)\s+(is|should be|equals?)\s+(.+)/,
          /^(change|modify)\s+(.+)\s+to\s+(.+)/,
          /^make\s+(.+)\s+(.+)/
        ],
        entities: ['field_name', 'value'],
        confidence: 0.8
      },

      // Information Request Patterns
      {
        intent: 'information_request',
        patterns: [
          /^(what|how|why|when|where)\s+(.+)/,
          /^(explain|tell me about|describe)\s+(.+)/,
          /^(.+)\s+(mean|means)\?$/,
          /^(do i need|is .+ required)\s+(.+)/
        ],
        entities: ['field_name', 'document_type'],
        confidence: 0.9
      },

      // Navigation Patterns
      {
        intent: 'navigation',
        patterns: [
          /^(go to|navigate to|move to|jump to)\s+(.+)/,
          /^(next|previous|back|forward)\s*(step)?/,
          /^(skip|continue|proceed)/,
          /^step\s+(\d+)/
        ],
        entities: ['step_name'],
        confidence: 0.9
      },

      // Validation Patterns
      {
        intent: 'validation',
        patterns: [
          /^(check|validate|verify|review)\s+(.+)/,
          /^(is .+ correct|are .+ right)/,
          /^(any errors|problems|issues)/,
          /^(ready to submit|can i proceed)/
        ],
        entities: ['field_name'],
        confidence: 0.8
      },

      // Help Patterns
      {
        intent: 'help',
        patterns: [
          /^(help|assist|support)/,
          /^(i don't know|i'm confused|not sure)/,
          /^(what do i do|how do i)/,
          /^(stuck|lost|need help)/
        ],
        entities: [],
        confidence: 0.7
      },

      // Document Action Patterns
      {
        intent: 'document_action',
        patterns: [
          /^(generate|create|make|produce)\s+(document|deed|pdf)/,
          /^(save|download|export)\s+(.+)/,
          /^(preview|show|display)\s+(.+)/,
          /^(print|email|send)\s+(.+)/
        ],
        entities: ['document_type'],
        confidence: 0.8
      }
    ];
  }

  // Initialize entity patterns
  private static initializeEntityPatterns(): void {
    this.entityPatterns = [
      // Field Names
      {
        type: 'field_name',
        pattern: /\b(grantor|grantee|property|address|apn|legal description|transfer tax|recording|title|vesting|consideration|notary)\b/gi,
        normalizer: (value: string) => value.toLowerCase().replace(/\s+/g, '_')
      },

      // Person Names
      {
        type: 'person_name',
        pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
        normalizer: (value: string) => value.trim()
      },

      // Addresses
      {
        type: 'address',
        pattern: /\b\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place)\b[^,]*(?:,\s*[A-Za-z\s]+)?(?:,\s*[A-Z]{2})?\s*\d{5}?\b/gi,
        normalizer: (value: string) => value.trim()
      },

      // Amounts (money)
      {
        type: 'amount',
        pattern: /\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*dollars?\b/gi,
        normalizer: (value: string) => {
          const numStr = value.replace(/[$,\s]/g, '').replace(/dollars?/i, '');
          return parseFloat(numStr) || 0;
        }
      },

      // Dates
      {
        type: 'date',
        pattern: /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi,
        normalizer: (value: string) => {
          try {
            return new Date(value);
          } catch {
            return value;
          }
        }
      },

      // Document Types
      {
        type: 'document_type',
        pattern: /\b(grant deed|quitclaim deed|warranty deed|interspousal transfer|tax deed|property profile)\b/gi,
        normalizer: (value: string) => value.toLowerCase().replace(/\s+/g, '_')
      },

      // Step Names
      {
        type: 'step_name',
        pattern: /\b(property|recording|tax|parties|review|step\s+\d+)\b/gi,
        normalizer: (value: string) => value.toLowerCase().replace(/step\s+/, '')
      },

      // Generic Values
      {
        type: 'value',
        pattern: /"([^"]+)"|'([^']+)'|(?:is|equals?|should be)\s+([^\s,]+)/gi,
        normalizer: (value: string) => value.replace(/^["']|["']$/g, '').trim()
      }
    ];
  }

  // Extract entities from text
  private static extractEntities(text: string, context: WizardContext): Entity[] {
    const entities: Entity[] = [];

    for (const pattern of this.entityPatterns) {
      const matches = Array.from(text.matchAll(pattern.pattern));
      
      for (const match of matches) {
        const value = match[0];
        const startIndex = match.index || 0;
        const endIndex = startIndex + value.length;
        
        // Calculate confidence based on context relevance
        const confidence = this.calculateEntityConfidence(
          pattern.type,
          value,
          context
        );

        if (confidence > 0.3) { // Only include entities with reasonable confidence
          entities.push({
            type: pattern.type,
            value,
            confidence,
            startIndex,
            endIndex,
            normalizedValue: pattern.normalizer ? pattern.normalizer(value) : value
          });
        }
      }
    }

    // Remove overlapping entities (keep highest confidence)
    return this.resolveEntityConflicts(entities);
  }

  // Match intent patterns
  private static matchPattern(
    text: string,
    pattern: IntentPattern,
    entities: Entity[],
    context: IntentContext
  ): number {
    let maxConfidence = 0;

    for (const regex of pattern.patterns) {
      const match = text.match(regex);
      if (match) {
        let confidence = pattern.confidence;

        // Boost confidence if required entities are present
        if (pattern.entities.length > 0) {
          const foundEntityTypes = new Set(entities.map(e => e.type));
          const requiredEntityTypes = new Set(pattern.entities);
          const entityMatch = this.setIntersection(foundEntityTypes, requiredEntityTypes).size / requiredEntityTypes.size;
          confidence *= (0.5 + 0.5 * entityMatch); // 50% base + 50% entity match
        }

        // Context relevance boost
        if (pattern.contextRequired) {
          confidence *= this.calculateContextRelevance(pattern.intent, context);
        }

        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    return maxConfidence;
  }

  // Calculate entity confidence based on context
  private static calculateEntityConfidence(
    entityType: Entity['type'],
    value: string,
    context: WizardContext
  ): number {
    let confidence = 0.5; // Base confidence

    switch (entityType) {
      case 'field_name':
        // Higher confidence if field exists in current step
        const availableFields = this.getAvailableFields(context);
        const normalizedValue = value.toLowerCase().replace(/\s+/g, '_');
        if (availableFields.includes(normalizedValue)) {
          confidence = 0.9;
        } else if (availableFields.some(field => field.includes(normalizedValue) || normalizedValue.includes(field))) {
          confidence = 0.7;
        }
        break;

      case 'document_type':
        // Higher confidence if document type exists in registry
        const normalizedDocType = value.toLowerCase().replace(/\s+/g, '_');
        if (DOCUMENT_REGISTRY[normalizedDocType]) {
          confidence = 0.9;
        }
        break;

      case 'address':
        // Higher confidence for well-formed addresses
        if (value.includes(',') && /\d{5}/.test(value)) {
          confidence = 0.8;
        }
        break;

      case 'amount':
        // Higher confidence for properly formatted amounts
        if (/\$[\d,]+\.\d{2}/.test(value)) {
          confidence = 0.8;
        }
        break;

      default:
        confidence = 0.6;
    }

    return Math.min(confidence, 1.0);
  }

  // Adjust confidence based on context
  private static adjustConfidenceWithContext(
    intent: Intent['type'],
    confidence: number,
    entities: Entity[],
    context: IntentContext
  ): number {
    let adjustedConfidence = confidence;

    // Boost confidence for context-relevant intents
    switch (intent) {
      case 'field_update':
        // Higher confidence if we have field names and values
        const hasFieldName = entities.some(e => e.type === 'field_name');
        const hasValue = entities.some(e => e.type === 'value');
        if (hasFieldName && hasValue) {
          adjustedConfidence *= 1.2;
        }
        break;

      case 'navigation':
        // Higher confidence if we have step references
        const hasStepRef = entities.some(e => e.type === 'step_name');
        if (hasStepRef) {
          adjustedConfidence *= 1.1;
        }
        break;

      case 'information_request':
        // Higher confidence for question words
        if (entities.some(e => e.type === 'field_name' || e.type === 'document_type')) {
          adjustedConfidence *= 1.1;
        }
        break;
    }

    // Consider conversation history
    if (context.previousIntents.length > 0) {
      const lastIntent = context.previousIntents[context.previousIntents.length - 1];
      
      // Boost confidence for follow-up intents
      if (intent === lastIntent.type) {
        adjustedConfidence *= 1.05; // Small boost for consistency
      }
      
      // Context switching penalty
      if (intent !== lastIntent.type && lastIntent.confidence > 0.8) {
        adjustedConfidence *= 0.95; // Small penalty for context switching
      }
    }

    return Math.min(adjustedConfidence, 1.0);
  }

  // Extract parameters based on intent and entities
  private static extractParameters(
    intent: Intent['type'],
    entities: Entity[],
    context: WizardContext
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (intent) {
      case 'field_update':
        const fieldEntity = entities.find(e => e.type === 'field_name');
        const valueEntity = entities.find(e => e.type === 'value') || 
                           entities.find(e => e.type === 'person_name') ||
                           entities.find(e => e.type === 'address') ||
                           entities.find(e => e.type === 'amount');
        
        if (fieldEntity) {
          parameters.field = fieldEntity.normalizedValue;
        }
        if (valueEntity) {
          parameters.value = valueEntity.normalizedValue;
        }
        break;

      case 'navigation':
        const stepEntity = entities.find(e => e.type === 'step_name');
        if (stepEntity) {
          parameters.targetStep = stepEntity.normalizedValue;
        }
        break;

      case 'information_request':
        const topicEntity = entities.find(e => 
          e.type === 'field_name' || 
          e.type === 'document_type' || 
          e.type === 'step_name'
        );
        if (topicEntity) {
          parameters.topic = topicEntity.normalizedValue;
        }
        break;

      case 'validation':
        const validationTarget = entities.find(e => e.type === 'field_name');
        if (validationTarget) {
          parameters.target = validationTarget.normalizedValue;
        } else {
          parameters.target = 'all'; // Validate everything
        }
        break;

      case 'document_action':
        const actionType = entities.find(e => e.type === 'document_type');
        if (actionType) {
          parameters.documentType = actionType.normalizedValue;
        }
        parameters.action = 'generate'; // Default action
        break;
    }

    return parameters;
  }

  // Get available fields for current context
  private static getAvailableFields(context: WizardContext): string[] {
    const documentConfig = DOCUMENT_REGISTRY[context.documentType];
    if (!documentConfig) return [];

    const currentStepConfig = documentConfig.requiredSteps[context.currentStep - 1];
    if (!currentStepConfig) return [];

    return currentStepConfig.fields || [];
  }

  // Infer conversation topic from history
  private static inferConversationTopic(history: Intent[]): string | undefined {
    if (history.length === 0) return undefined;

    // Look for common parameters in recent intents
    const recentIntents = history.slice(-3);
    const topics = recentIntents
      .map(intent => intent.parameters.topic || intent.parameters.field)
      .filter(Boolean);

    // Return most common topic
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonTopic = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostCommonTopic?.[0];
  }

  // Resolve overlapping entities
  private static resolveEntityConflicts(entities: Entity[]): Entity[] {
    const resolved: Entity[] = [];
    const sorted = entities.sort((a, b) => a.startIndex - b.startIndex);

    for (const entity of sorted) {
      const overlapping = resolved.find(existing => 
        (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
        (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex)
      );

      if (overlapping) {
        // Keep the entity with higher confidence
        if (entity.confidence > overlapping.confidence) {
          const index = resolved.indexOf(overlapping);
          resolved[index] = entity;
        }
      } else {
        resolved.push(entity);
      }
    }

    return resolved;
  }

  // Calculate context relevance
  private static calculateContextRelevance(intent: Intent['type'], context: IntentContext): number {
    // Base relevance
    let relevance = 0.8;

    // Adjust based on current step and document type
    const documentConfig = DOCUMENT_REGISTRY[context.documentType];
    if (documentConfig) {
      const currentStepConfig = documentConfig.requiredSteps[context.currentStep - 1];
      
      if (currentStepConfig) {
        // Higher relevance for intents that match step capabilities
        if (intent === 'field_update' && currentStepConfig.fields.length > 0) {
          relevance = 1.0;
        } else if (intent === 'validation' && currentStepConfig.required) {
          relevance = 0.9;
        }
      }
    }

    return relevance;
  }

  // Utility: Set intersection
  private static setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    return new Set([...setA].filter(x => setB.has(x)));
  }

  // Clear conversation history (for testing)
  static clearHistory(): void {
    // This could be used to reset the system state
  }

  // Get pattern statistics (for debugging)
  static getPatternStats(): { patterns: number; entities: number } {
    return {
      patterns: this.patterns.length,
      entities: this.entityPatterns.length
    };
  }
}

// Export types and main class
export { IntentRecognitionEngine };
export type { Intent, Entity, IntentContext, IntentPattern, EntityPattern };


