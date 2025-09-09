import { PropertyData, WizardContext } from '../lib/wizardState';
import { DOCUMENT_REGISTRY } from '../lib/documentRegistry';

// Advanced AI Service with Natural Language Processing
export interface NaturalLanguagePrompt {
  text: string;
  context: WizardContext;
  timestamp: Date;
  userId?: string;
}

export interface IntentRecognition {
  intent: 'field_update' | 'information_request' | 'navigation' | 'validation' | 'help' | 'document_action';
  confidence: number;
  entities: Entity[];
  parameters: Record<string, any>;
}

export interface Entity {
  type: 'field_name' | 'value' | 'document_type' | 'step_name' | 'person_name' | 'address' | 'amount';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface AIAction {
  type: 'update_field' | 'navigate_step' | 'show_help' | 'validate_data' | 'suggest_value' | 'explain_requirement';
  target: string;
  value?: any;
  confidence: number;
  reasoning: string;
  requiresConfirmation: boolean;
}

export interface ConversationContext {
  previousPrompts: NaturalLanguagePrompt[];
  currentTopic?: string;
  userPreferences: Record<string, any>;
  sessionData: Record<string, any>;
}

export interface NLPResponse {
  intent: IntentRecognition;
  actions: AIAction[];
  response: string;
  suggestions: string[];
  followUpQuestions: string[];
  conversationContext: ConversationContext;
  confidence: number;
  processingTime: number;
}

export interface ChainOfTitleAnalysis {
  transfers: TitleTransfer[];
  currentOwner: OwnerInfo;
  ownershipDuration: string;
  riskAssessment: RiskAssessment;
  recommendations: TitleRecommendations;
}

export interface TitleTransfer {
  date: Date;
  grantor: string;
  grantee: string;
  documentType: string;
  consideration: string;
  recordingInfo: RecordingInfo;
  riskFactors: string[];
}

export interface OwnerInfo {
  name: string;
  vestingType: string;
  acquisitionDate: Date;
  acquisitionMethod: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  titleIssues: TitleIssue[];
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string;
}

export interface TitleIssue {
  type: string;
  description: string;
  legalBasis: string;
  resolution: string;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
}

export interface TitleRecommendations {
  documentType: string;
  additionalDueDiligence: string[];
  titleInsurance: boolean;
  legalReview: boolean;
}

export interface RecordingInfo {
  book: string;
  page: string;
  instrumentNumber: string;
  recordingDate: Date;
  county: string;
}

export interface LegalValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceChecks: ComplianceCheck[];
  recommendations: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  legalBasis: string;
  suggestion: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: string;
  recommendation: string;
}

export interface ComplianceCheck {
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'needs_review';
  details: string;
  legalBasis: string;
}

export class AdvancedAIService {
  private static conversationHistory: Map<string, ConversationContext> = new Map();
  private static apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  private static maxRetries = 3;
  private static retryDelay = 1000;

  // Natural Language Processing - Main Entry Point
  static async processNaturalLanguagePrompt(
    prompt: string,
    context: WizardContext,
    conversationId?: string
  ): Promise<NLPResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation context
      const conversationContext = this.getConversationContext(conversationId || 'default');
      
      // Add current prompt to history
      const nlPrompt: NaturalLanguagePrompt = {
        text: prompt,
        context,
        timestamp: new Date()
      };
      conversationContext.previousPrompts.push(nlPrompt);
      
      // Keep only last 10 prompts for context
      if (conversationContext.previousPrompts.length > 10) {
        conversationContext.previousPrompts = conversationContext.previousPrompts.slice(-10);
      }

      // Process the prompt
      const response = await this.apiCall('/api/ai/process-natural-language', {
        prompt,
        context,
        conversation_context: conversationContext,
        document_type: context.documentType,
        current_step: context.currentStep,
        property_data: context.propertyData,
        step_data: context.stepData
      });

      // Parse response
      const nlpResponse: NLPResponse = {
        intent: {
          intent: response.intent.type,
          confidence: response.intent.confidence,
          entities: response.intent.entities || [],
          parameters: response.intent.parameters || {}
        },
        actions: response.actions.map((action: any) => ({
          type: action.type,
          target: action.target,
          value: action.value,
          confidence: action.confidence,
          reasoning: action.reasoning,
          requiresConfirmation: action.requires_confirmation || false
        })),
        response: response.response,
        suggestions: response.suggestions || [],
        followUpQuestions: response.follow_up_questions || [],
        conversationContext,
        confidence: response.confidence,
        processingTime: Date.now() - startTime
      };

      // Update conversation context
      conversationContext.currentTopic = response.current_topic;
      conversationContext.sessionData = { ...conversationContext.sessionData, ...response.session_data };
      
      this.conversationHistory.set(conversationId || 'default', conversationContext);

      return nlpResponse;
    } catch (error) {
      console.error('Natural language processing failed:', error);
      return this.getFallbackNLPResponse(prompt, context, Date.now() - startTime);
    }
  }

  // Intent Recognition System
  static async recognizeIntent(prompt: string, context: WizardContext): Promise<IntentRecognition> {
    try {
      const response = await this.apiCall('/api/ai/recognize-intent', {
        prompt,
        context,
        document_type: context.documentType,
        current_step: context.currentStep
      });

      return {
        intent: response.intent,
        confidence: response.confidence,
        entities: response.entities || [],
        parameters: response.parameters || {}
      };
    } catch (error) {
      console.error('Intent recognition failed:', error);
      return this.getFallbackIntent(prompt, context);
    }
  }

  // Enhanced Chain of Title Analysis with TitlePoint Integration
  static async getChainOfTitle(propertyData: PropertyData, searchDepth: 'basic' | 'comprehensive' | 'full_history' = 'comprehensive'): Promise<ChainOfTitleAnalysis> {
    try {
      // Use the new Chain of Title service
      const { ChainOfTitleService } = await import('../services/chainOfTitleService');
      
      const analysis = await ChainOfTitleService.getChainOfTitle({
        propertyData,
        searchDepth,
        includeRiskAnalysis: true,
        includeLegalValidation: true
      });

      return analysis;
    } catch (error) {
      console.error('Chain of title analysis failed:', error);
      return this.getFallbackChainOfTitle(propertyData);
    }
  }

  // Natural Language Chain of Title Queries
  static async processChainOfTitleQuery(
    query: string,
    propertyData: PropertyData,
    context: WizardContext
  ): Promise<NLPResponse> {
    try {
      // Determine if this is a chain of title related query
      const isChainQuery = this.isChainOfTitleQuery(query);
      
      if (!isChainQuery) {
        return this.processNaturalLanguagePrompt(query, context);
      }

      // Process chain of title specific query
      const queryType = this.classifyChainQuery(query);
      
      let response: string;
      let actions: AIAction[] = [];
      let suggestions: string[] = [];

      switch (queryType) {
        case 'ownership_history':
          response = await this.handleOwnershipHistoryQuery(query, propertyData);
          suggestions = [
            'Show me the ownership timeline',
            'Who owned this property before?',
            'How long has the current owner had this property?'
          ];
          break;

        case 'title_issues':
          response = await this.handleTitleIssuesQuery(query, propertyData);
          actions.push({
            type: 'show_help',
            target: 'title_issues',
            confidence: 0.9,
            reasoning: 'User is asking about title issues',
            requiresConfirmation: false
          });
          suggestions = [
            'Are there any liens on this property?',
            'What title issues should I be concerned about?',
            'Is the title clear?'
          ];
          break;

        case 'risk_analysis':
          response = await this.handleRiskAnalysisQuery(query, propertyData);
          actions.push({
            type: 'validate_data',
            target: 'risk_assessment',
            confidence: 0.8,
            reasoning: 'User wants risk analysis',
            requiresConfirmation: false
          });
          suggestions = [
            'What are the risks with this property?',
            'Should I get title insurance?',
            'Are there any red flags?'
          ];
          break;

        case 'document_recommendation':
          response = await this.handleDocumentRecommendationQuery(query, propertyData);
          actions.push({
            type: 'suggest_value',
            target: 'document_type',
            confidence: 0.85,
            reasoning: 'Providing document recommendation based on chain of title',
            requiresConfirmation: false
          });
          suggestions = [
            'What type of deed should I use?',
            'Is a grant deed appropriate?',
            'What document do you recommend?'
          ];
          break;

        default:
          response = await this.handleGeneralChainQuery(query, propertyData);
          suggestions = [
            'Show me the chain of title',
            'Analyze the ownership history',
            'Check for title issues'
          ];
      }

      return {
        intent: {
          intent: 'information_request',
          confidence: 0.9,
          entities: [{ type: 'document_type', value: 'chain_of_title', confidence: 0.9, startIndex: 0, endIndex: query.length }],
          parameters: { topic: 'chain_of_title', queryType }
        },
        actions,
        response,
        suggestions,
        followUpQuestions: this.generateChainOfTitleFollowUps(queryType),
        conversationContext: this.getConversationContext('chain_of_title'),
        confidence: 0.9,
        processingTime: 150
      };

    } catch (error) {
      console.error('Chain of title query processing failed:', error);
      return this.getFallbackNLPResponse(query, context, 150);
    }
  }

  // Enhanced Legal Validation
  static async validateDocument(
    documentType: string,
    documentData: Record<string, any>,
    validationLevel: 'basic' | 'comprehensive' | 'expert' = 'comprehensive'
  ): Promise<LegalValidationResult> {
    try {
      const response = await this.apiCall('/api/ai/validate-document', {
        document_type: documentType,
        document_data: documentData,
        jurisdiction: 'california',
        validation_level: validationLevel,
        include_suggestions: true
      });

      return {
        isValid: response.is_valid,
        errors: response.errors.map((error: any) => ({
          field: error.field,
          message: error.message,
          severity: error.severity,
          legalBasis: error.legal_basis,
          suggestion: error.suggestion
        })),
        warnings: response.warnings.map((warning: any) => ({
          field: warning.field,
          message: warning.message,
          impact: warning.impact,
          recommendation: warning.recommendation
        })),
        complianceChecks: response.compliance_checks.map((check: any) => ({
          requirement: check.requirement,
          status: check.status,
          details: check.details,
          legalBasis: check.legal_basis
        })),
        recommendations: response.recommendations
      };
    } catch (error) {
      console.error('Legal validation failed:', error);
      return this.getFallbackValidation(documentType, documentData);
    }
  }

  // Smart Context-Aware Suggestions
  static async getContextualSuggestions(
    context: WizardContext,
    userInput?: string
  ): Promise<string[]> {
    try {
      const response = await this.apiCall('/api/ai/contextual-suggestions', {
        context,
        user_input: userInput,
        document_type: context.documentType,
        current_step: context.currentStep,
        property_data: context.propertyData
      });

      return response.suggestions || [];
    } catch (error) {
      console.error('Contextual suggestions failed:', error);
      return this.getFallbackSuggestions(context);
    }
  }

  // Conversation Management
  private static getConversationContext(conversationId: string): ConversationContext {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, {
        previousPrompts: [],
        userPreferences: {},
        sessionData: {}
      });
    }
    return this.conversationHistory.get(conversationId)!;
  }

  static clearConversationHistory(conversationId?: string): void {
    if (conversationId) {
      this.conversationHistory.delete(conversationId);
    } else {
      this.conversationHistory.clear();
    }
  }

  // API Call with Enhanced Error Handling
  private static async apiCall(endpoint: string, data: any): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'X-Request-ID': this.generateRequestId()
          },
          body: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            version: '2.0'
          })
        });
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Validate response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid API response format');
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          // Exponential backoff with jitter
          const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`AI service failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  // Fallback Methods
  private static getFallbackNLPResponse(prompt: string, context: WizardContext, processingTime: number): NLPResponse {
    const intent = this.getFallbackIntent(prompt, context);
    
    return {
      intent,
      actions: [],
      response: "I'm having trouble processing your request right now. Please try rephrasing your question or use the form fields directly.",
      suggestions: [
        "Try using simpler language",
        "Be more specific about what you want to do",
        "Use the form fields if AI assistance isn't working"
      ],
      followUpQuestions: [],
      conversationContext: this.getConversationContext('default'),
      confidence: 0.1,
      processingTime
    };
  }

  private static getFallbackIntent(prompt: string, context: WizardContext): IntentRecognition {
    // Simple keyword-based intent recognition
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('fill') || lowerPrompt.includes('enter') || lowerPrompt.includes('update')) {
      return {
        intent: 'field_update',
        confidence: 0.6,
        entities: [],
        parameters: {}
      };
    }
    
    if (lowerPrompt.includes('what') || lowerPrompt.includes('how') || lowerPrompt.includes('explain')) {
      return {
        intent: 'information_request',
        confidence: 0.6,
        entities: [],
        parameters: {}
      };
    }
    
    if (lowerPrompt.includes('next') || lowerPrompt.includes('previous') || lowerPrompt.includes('step')) {
      return {
        intent: 'navigation',
        confidence: 0.6,
        entities: [],
        parameters: {}
      };
    }
    
    return {
      intent: 'help',
      confidence: 0.3,
      entities: [],
      parameters: {}
    };
  }

  private static getFallbackChainOfTitle(propertyData: PropertyData): ChainOfTitleAnalysis {
    return {
      transfers: [],
      currentOwner: {
        name: propertyData.currentOwners[0]?.name || 'Unknown',
        vestingType: propertyData.currentOwners[0]?.vestingType || 'Unknown',
        acquisitionDate: new Date(),
        acquisitionMethod: 'Unknown'
      },
      ownershipDuration: 'Unknown',
      riskAssessment: {
        overallRisk: 'medium',
        riskFactors: [{
          type: 'data_unavailable',
          severity: 'medium',
          description: 'Chain of title data is not available',
          impact: 'Unable to assess title risks',
          mitigation: 'Obtain title report from title company'
        }],
        recommendations: ['Obtain professional title report', 'Consider title insurance'],
        titleIssues: []
      },
      recommendations: {
        documentType: 'grant_deed',
        additionalDueDiligence: ['Title search', 'Survey review'],
        titleInsurance: true,
        legalReview: true
      }
    };
  }

  private static getFallbackValidation(documentType: string, documentData: Record<string, any>): LegalValidationResult {
    return {
      isValid: false,
      errors: [{
        field: 'system',
        message: 'Legal validation service is currently unavailable',
        severity: 'warning',
        legalBasis: 'System limitation',
        suggestion: 'Please review document manually or try again later'
      }],
      warnings: [],
      complianceChecks: [],
      recommendations: ['Manual legal review recommended', 'Consult with attorney if needed']
    };
  }

  private static getFallbackSuggestions(context: WizardContext): string[] {
    const documentConfig = DOCUMENT_REGISTRY[context.documentType];
    if (!documentConfig) return [];

    const currentStep = documentConfig.requiredSteps[context.currentStep - 1];
    if (!currentStep) return [];

    return [
      `Complete the ${currentStep.name} step`,
      'Review the legal requirements',
      'Use the help text for guidance'
    ];
  }

  // Chain of Title Query Processing Helper Methods
  private static isChainOfTitleQuery(query: string): boolean {
    const chainKeywords = [
      'chain of title', 'ownership history', 'title issues', 'title problems',
      'previous owner', 'current owner', 'title search', 'title report',
      'liens', 'encumbrances', 'title insurance', 'title risk', 'title defects',
      'ownership timeline', 'property history', 'deed history', 'transfers'
    ];
    
    const lowerQuery = query.toLowerCase();
    return chainKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private static classifyChainQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('history') || lowerQuery.includes('timeline') || lowerQuery.includes('previous') || lowerQuery.includes('owned')) {
      return 'ownership_history';
    }
    if (lowerQuery.includes('issue') || lowerQuery.includes('problem') || lowerQuery.includes('lien') || lowerQuery.includes('defect')) {
      return 'title_issues';
    }
    if (lowerQuery.includes('risk') || lowerQuery.includes('insurance') || lowerQuery.includes('safe') || lowerQuery.includes('concern')) {
      return 'risk_analysis';
    }
    if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('should') || lowerQuery.includes('type')) {
      return 'document_recommendation';
    }
    
    return 'general';
  }

  private static async handleOwnershipHistoryQuery(query: string, propertyData: PropertyData): Promise<string> {
    try {
      const analysis = await this.getChainOfTitle(propertyData);
      
      if (analysis.transfers.length === 0) {
        return "I couldn't find detailed ownership history for this property. This might be because the property is newly constructed or the records aren't available in our system.";
      }

      const currentOwner = analysis.currentOwner;
      const transferCount = analysis.transfers.length;
      const ownershipDuration = currentOwner.ownershipDuration;

      let response = `Here's what I found about the ownership history:\n\n`;
      response += `**Current Owner:** ${currentOwner.name}\n`;
      response += `**Ownership Duration:** ${ownershipDuration}\n`;
      response += `**Acquisition Method:** ${currentOwner.acquisitionMethod}\n`;
      response += `**Total Transfers Found:** ${transferCount}\n\n`;

      if (transferCount > 0) {
        response += `**Recent Transfer History:**\n`;
        analysis.transfers.slice(0, 3).forEach((transfer, index) => {
          response += `${index + 1}. ${transfer.date.toLocaleDateString()}: ${transfer.grantor} → ${transfer.grantee} (${transfer.documentType})\n`;
        });

        if (transferCount > 3) {
          response += `... and ${transferCount - 3} more transfers in the history.\n`;
        }
      }

      return response;
    } catch (error) {
      return "I'm having trouble accessing the ownership history right now. You might want to request a title report from a title company for complete ownership information.";
    }
  }

  private static async handleTitleIssuesQuery(query: string, propertyData: PropertyData): Promise<string> {
    try {
      const analysis = await this.getChainOfTitle(propertyData);
      
      if (analysis.titleIssues.length === 0) {
        return "Good news! I didn't find any significant title issues with this property. The title appears to be clear based on available records.";
      }

      let response = `I found ${analysis.titleIssues.length} potential title issue(s):\n\n`;
      
      analysis.titleIssues.forEach((issue, index) => {
        response += `**${index + 1}. ${issue.type.replace('_', ' ').toUpperCase()}** (${issue.severity} severity)\n`;
        response += `Description: ${issue.description}\n`;
        response += `Resolution: ${issue.resolution}\n\n`;
      });

      response += `**Recommendation:** ${analysis.recommendations.titleInsurance ? 'Title insurance is recommended' : 'Standard title insurance should be sufficient'} for this transaction.`;

      return response;
    } catch (error) {
      return "I'm having trouble checking for title issues right now. I recommend getting a professional title search to identify any potential problems.";
    }
  }

  private static async handleRiskAnalysisQuery(query: string, propertyData: PropertyData): Promise<string> {
    try {
      const analysis = await this.getChainOfTitle(propertyData);
      const risk = analysis.riskAssessment;

      let response = `**Risk Assessment Summary:**\n\n`;
      response += `**Overall Risk Level:** ${risk.overallRisk.toUpperCase()}\n`;
      response += `**Risk Score:** ${risk.riskScore}/100\n`;
      response += `**Insurability Rating:** ${risk.insurabilityRating}\n\n`;

      if (risk.riskFactors.length > 0) {
        response += `**Key Risk Factors:**\n`;
        risk.riskFactors.slice(0, 3).forEach((factor, index) => {
          response += `${index + 1}. ${factor.type} (${factor.severity}): ${factor.description}\n`;
        });
        response += `\n`;
      }

      response += `**Recommendations:**\n`;
      risk.recommendations.forEach((rec, index) => {
        response += `• ${rec}\n`;
      });

      if (analysis.recommendations.titleInsurance) {
        response += `\n**Title Insurance:** Strongly recommended for this transaction.`;
      }

      return response;
    } catch (error) {
      return "I'm unable to perform a complete risk analysis right now. For a comprehensive risk assessment, consider getting a professional title report and consulting with a title company.";
    }
  }

  private static async handleDocumentRecommendationQuery(query: string, propertyData: PropertyData): Promise<string> {
    try {
      const analysis = await this.getChainOfTitle(propertyData);
      const recommendedDoc = analysis.recommendations.documentType;
      const riskLevel = analysis.riskAssessment.overallRisk;

      let response = `Based on the chain of title analysis, here's my recommendation:\n\n`;
      response += `**Recommended Document:** ${recommendedDoc.replace('_', ' ').toUpperCase()}\n\n`;

      response += `**Reasoning:**\n`;
      if (riskLevel === 'low') {
        response += `• The title appears clean with minimal risk factors\n`;
        response += `• Standard transfer documentation should be sufficient\n`;
      } else if (riskLevel === 'medium') {
        response += `• Some risk factors were identified that require attention\n`;
        response += `• Enhanced documentation may be needed\n`;
      } else {
        response += `• Significant risk factors were found\n`;
        response += `• Consider additional legal protections\n`;
      }

      if (analysis.recommendations.legalReview) {
        response += `• Legal review is recommended before proceeding\n`;
      }

      response += `\n**Additional Considerations:**\n`;
      response += `• Estimated Cost: ${analysis.recommendations.estimatedCost}\n`;
      response += `• Timeframe: ${analysis.recommendations.timeframe}\n`;

      return response;
    } catch (error) {
      return "I'm having trouble analyzing the property for document recommendations. A grant deed is typically appropriate for most property transfers, but you should consult with a real estate attorney for specific guidance.";
    }
  }

  private static async handleGeneralChainQuery(query: string, propertyData: PropertyData): Promise<string> {
    try {
      const analysis = await this.getChainOfTitle(propertyData);
      
      let response = `Here's a summary of the chain of title analysis:\n\n`;
      response += `**Property:** ${analysis.propertyInfo.address}\n`;
      response += `**Current Owner:** ${analysis.currentOwner.name}\n`;
      response += `**Ownership Duration:** ${analysis.currentOwner.ownershipDuration}\n`;
      response += `**Total Transfers:** ${analysis.transfers.length}\n`;
      response += `**Title Issues:** ${analysis.titleIssues.length}\n`;
      response += `**Risk Level:** ${analysis.riskAssessment.overallRisk}\n\n`;

      response += `**Quick Assessment:**\n`;
      if (analysis.riskAssessment.overallRisk === 'low') {
        response += `✅ This property appears to have a clean title with minimal concerns.\n`;
      } else if (analysis.riskAssessment.overallRisk === 'medium') {
        response += `⚠️ Some issues were identified that should be addressed.\n`;
      } else {
        response += `🚨 Significant issues were found that require immediate attention.\n`;
      }

      response += `\nWould you like me to explain any specific aspect in more detail?`;

      return response;
    } catch (error) {
      return "I'm having trouble accessing the chain of title information right now. You can request a title report from a title company for comprehensive property history and title analysis.";
    }
  }

  private static generateChainOfTitleFollowUps(queryType: string): string[] {
    const followUps: Record<string, string[]> = {
      ownership_history: [
        'How long has each owner held the property?',
        'Were there any unusual transfers?',
        'Show me the complete ownership timeline'
      ],
      title_issues: [
        'How can these issues be resolved?',
        'What will it cost to fix these problems?',
        'Should I be concerned about these issues?'
      ],
      risk_analysis: [
        'What can I do to mitigate these risks?',
        'Is title insurance necessary?',
        'Should I get a survey?'
      ],
      document_recommendation: [
        'What are the alternatives to this document type?',
        'What are the pros and cons of each option?',
        'How much will this cost?'
      ],
      general: [
        'Show me the ownership history',
        'Are there any title issues?',
        'What document do you recommend?'
      ]
    };

    return followUps[queryType] || followUps.general;
  }

  // Utility Methods
  private static getAuthToken(): string {
    // In a real implementation, this would get the token from secure storage
    return localStorage.getItem('auth_token') || '';
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health Check
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export types for use in other components
export type {
  NaturalLanguagePrompt,
  IntentRecognition,
  Entity,
  AIAction,
  ConversationContext,
  NLPResponse,
  ChainOfTitleAnalysis,
  LegalValidationResult
};
