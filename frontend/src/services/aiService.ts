import { PropertyData, AISuggestion, WizardContext } from '../lib/wizardState';
import { AICapability } from '../lib/documentRegistry';

// Core AI service interfaces
export interface DocumentSuggestion {
  recommendedType: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    type: string;
    confidence: number;
    reasoning: string;
    pros: string[];
    cons: string[];
  }>;
  riskFactors: string[];
  legalConsiderations: string[];
}

export interface FieldSuggestionContext {
  propertyData: PropertyData;
  currentStepData: Record<string, any>;
  userContext?: {
    userType: 'professional' | 'individual';
    experience: 'beginner' | 'intermediate' | 'expert';
    preferences: Record<string, any>;
  };
}

export interface FieldSuggestion {
  field: string;
  value: any;
  confidence: number;
  reasoning: string;
  source: 'titlepoint' | 'property_records' | 'ai_inference' | 'user_input';
  requiresVerification: boolean;
  legalImplications?: string;
}

export interface ChainOfTitleAnalysis {
  transfers: Array<{
    date: Date;
    grantor: string;
    grantee: string;
    documentType: string;
    consideration?: string;
    recordingInfo: string;
    riskFactors?: string[];
  }>;
  currentOwner: {
    name: string;
    vestingType: string;
    acquisitionDate: Date;
  };
  ownershipDuration: string;
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
    titleIssues: string[];
  };
  recommendations: {
    documentType: string;
    additionalDueDiligence: string[];
    titleInsurance: boolean;
  };
}

export interface LegalValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    legalBasis: string;
    suggestion: string;
  }>;
  warnings: string[];
  complianceChecks: Record<string, boolean>;
  recommendations: string[];
}

export interface PromptResponse {
  intent: 'field_update' | 'information_request' | 'navigation' | 'validation';
  actions: Array<{
    type: string;
    target: string;
    value: any;
    confidence: number;
  }>;
  response: string;
  suggestions: AISuggestion[];
}

// Main AI Service Class
export class IntelligentAIService {
  private static baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private static authToken: string | null = null;

  // Authentication management
  static setAuthToken(token: string): void {
    this.authToken = token;
  }

  static getAuthToken(): string | null {
    if (this.authToken) return this.authToken;
    
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    
    return null;
  }

  // Enhanced document type suggestion based on property analysis
  static async suggestDocumentType(propertyData: PropertyData): Promise<DocumentSuggestion> {
    try {
      // Try the enhanced AI endpoint first
      const response = await this.apiCall('/api/property/ai-document-suggestion', {
        propertyData: {
          address: propertyData.address,
          apn: propertyData.apn,
          county: propertyData.county,
          legalDescription: propertyData.legalDescription,
          currentOwners: propertyData.currentOwners,
          liens: propertyData.titlePointData?.liens || [],
          taxInfo: propertyData.titlePointData?.taxInfo,
          propertyType: propertyData.propertyType,
          transactionContext: propertyData.transactionContext
        },
        context: {
          hasCurrentOwners: propertyData.currentOwners.length > 0,
          hasLiens: propertyData.titlePointData?.liens?.length || 0 > 0,
          propertyType: propertyData.propertyType,
          transactionContext: propertyData.transactionContext
        }
      });
      
      return {
        recommendedType: response.recommendedType,
        confidence: response.confidence,
        reasoning: response.reasoning,
        alternatives: response.alternatives || [],
        riskFactors: response.riskFactors || [],
        legalConsiderations: response.legalConsiderations || []
      };
    } catch (error) {
      console.warn('Enhanced AI suggestion failed, using fallback:', error);
      // Fallback logic when AI service is unavailable
      return this.getFallbackDocumentSuggestion(propertyData);
    }
  }

  // Intelligent field suggestions based on context
  static async getFieldSuggestions(
    documentType: string, 
    stepId: string, 
    context: FieldSuggestionContext
  ): Promise<FieldSuggestion[]> {
    try {
      const response = await this.apiCall('/api/ai/field-suggestions', {
        document_type: documentType,
        step_id: stepId,
        property_data: context.propertyData,
        current_data: context.currentStepData,
        user_context: context.userContext
      });
      
      return response.suggestions.map((suggestion: any) => ({
        field: suggestion.field,
        value: suggestion.value,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        source: suggestion.source,
        requiresVerification: suggestion.requires_verification,
        legalImplications: suggestion.legal_implications
      }));
    } catch (error) {
      // Fallback to basic suggestions
      return this.getFallbackFieldSuggestions(documentType, stepId, context);
    }
  }

  // Chain of title analysis with risk assessment
  static async getChainOfTitle(propertyData: PropertyData): Promise<ChainOfTitleAnalysis> {
    try {
      const response = await this.apiCall('/api/ai/chain-of-title', {
        property_data: propertyData,
        analysis_depth: 'comprehensive',
        include_risk_analysis: true
      });
      
      return {
        transfers: response.transfers.map((transfer: any) => ({
          date: new Date(transfer.date),
          grantor: transfer.grantor,
          grantee: transfer.grantee,
          documentType: transfer.document_type,
          consideration: transfer.consideration,
          recordingInfo: transfer.recording_info,
          riskFactors: transfer.risk_factors
        })),
        currentOwner: response.current_owner,
        ownershipDuration: response.ownership_duration,
        riskAssessment: {
          overallRisk: response.risk_assessment.overall_risk,
          riskFactors: response.risk_assessment.risk_factors,
          recommendations: response.risk_assessment.recommendations,
          titleIssues: response.risk_assessment.title_issues
        },
        recommendations: {
          documentType: response.recommendations.document_type,
          additionalDueDiligence: response.recommendations.additional_due_diligence,
          titleInsurance: response.recommendations.title_insurance
        }
      };
    } catch (error) {
      // Fallback analysis
      return this.getFallbackChainOfTitle(propertyData);
    }
  }

  // Legal validation with compliance checking
  static async validateDocument(
    documentType: string,
    documentData: Record<string, any>
  ): Promise<LegalValidationResult> {
    try {
      const response = await this.apiCall('/api/ai/validate-document', {
        document_type: documentType,
        document_data: documentData,
        jurisdiction: 'california',
        validation_level: 'comprehensive'
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
        warnings: response.warnings,
        complianceChecks: response.compliance_checks,
        recommendations: response.recommendations
      };
    } catch (error) {
      // Fallback validation
      return this.getFallbackValidation(documentType, documentData);
    }
  }

  // Natural language prompt processing
  static async processNaturalLanguagePrompt(
    prompt: string,
    context: WizardContext
  ): Promise<PromptResponse> {
    try {
      const response = await this.apiCall('/api/ai/process-prompt', {
        prompt,
        document_type: context.documentType,
        current_step: context.currentStep,
        property_data: context.propertyData,
        step_data: context.stepData
      });
      
      return {
        intent: response.intent,
        actions: response.actions.map((action: any) => ({
          type: action.type,
          target: action.target,
          value: action.value,
          confidence: action.confidence
        })),
        response: response.response,
        suggestions: response.suggestions
      };
    } catch (error) {
      // Fallback prompt processing
      return this.getFallbackPromptResponse(prompt, context);
    }
  }

  // Capability-specific methods
  static async executeCapability(
    capability: AICapability,
    context: {
      stepId: string;
      currentData: Record<string, any>;
      documentType: string;
      propertyData?: PropertyData;
    }
  ): Promise<AISuggestion[]> {
    try {
      const response = await this.apiCall('/api/ai/execute-capability', {
        capability,
        context
      });
      
      return response.suggestions || [];
    } catch (error) {
      // Fallback capability execution
      return this.getFallbackCapabilitySuggestions(capability, context);
    }
  }

  // Enhanced property search with TitlePoint integration
  static async searchProperty(address: string, options: {
    includeOwners?: boolean;
    includeLegalDescription?: boolean;
    includeAPN?: boolean;
    includeTaxInfo?: boolean;
    includeLiens?: boolean;
  } = {}): Promise<PropertyData | null> {
    try {
      const response = await this.apiCall('/api/property/titlepoint-search', {
        address,
        includeOwners: options.includeOwners ?? true,
        includeLegalDescription: options.includeLegalDescription ?? true,
        includeAPN: options.includeAPN ?? true,
        includeTaxInfo: options.includeTaxInfo ?? false,
        includeLiens: options.includeLiens ?? false
      });
      
      if (!response.success) {
        throw new Error('Property search failed');
      }
      
      return {
        address: response.address,
        apn: response.apn || '',
        county: response.county || '',
        legalDescription: response.legalDescription || '',
        currentOwners: response.owners || [],
        titlePointData: {
          liens: response.liens || [],
          encumbrances: [],
          taxInfo: response.taxInfo,
          chainOfTitle: [],
          lastUpdated: new Date(response.lastUpdated)
        },
        propertyType: 'residential', // Default
        transactionContext: response.dataSource
      };
    } catch (error) {
      console.error('Enhanced property search failed:', error);
      return null;
    }
  }

  // Tax calculation
  static async calculateTransferTax(
    propertyValue: number,
    county: string,
    city?: string
  ): Promise<{
    countyAmount: number;
    cityAmount: number;
    totalAmount: number;
    basis: string;
    exemptions: string[];
  }> {
    try {
      const response = await this.apiCall('/api/ai/calculate-transfer-tax', {
        property_value: propertyValue,
        county,
        city,
        jurisdiction: city ? 'city' : 'unincorporated'
      });
      
      return {
        countyAmount: response.county_amount,
        cityAmount: response.city_amount,
        totalAmount: response.total_amount,
        basis: response.basis,
        exemptions: response.exemptions
      };
    } catch (error) {
      // Fallback tax calculation
      return this.getFallbackTaxCalculation(propertyValue, county, city);
    }
  }

  // Error handling with retry logic
  private static async apiCall(endpoint: string, data: any): Promise<any> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.getAuthToken() && { 'Authorization': `Bearer ${this.getAuthToken()}` })
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw new Error(`AI service failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  // Fallback methods for when AI service is unavailable
  private static getFallbackDocumentSuggestion(propertyData: PropertyData): DocumentSuggestion {
    // Basic logic to suggest document type
    const hasMultipleOwners = propertyData.currentOwners.length > 1;
    const hasSpouseIndicators = propertyData.currentOwners.some(owner => 
      owner.name.toLowerCase().includes('husband') || 
      owner.name.toLowerCase().includes('wife') ||
      owner.name.toLowerCase().includes('married')
    );

    if (hasSpouseIndicators) {
      return {
        recommendedType: 'interspousal_transfer',
        confidence: 0.7,
        reasoning: 'Detected spouse-related ownership, interspousal transfer may be appropriate',
        alternatives: [
          {
            type: 'grant_deed',
            confidence: 0.6,
            reasoning: 'Standard transfer with warranties',
            pros: ['Full warranties', 'Standard protection'],
            cons: ['More complex', 'Higher cost']
          }
        ],
        riskFactors: ['Verify marriage status'],
        legalConsiderations: ['Tax exemption may apply']
      };
    }

    return {
      recommendedType: 'grant_deed',
      confidence: 0.8,
      reasoning: 'Standard property transfer - most common and provides good protection',
      alternatives: [
        {
          type: 'quitclaim_deed',
          confidence: 0.4,
          reasoning: 'Simpler but no warranties',
          pros: ['Simple', 'Quick'],
          cons: ['No warranties', 'Higher risk']
        }
      ],
      riskFactors: ['Verify clear title'],
      legalConsiderations: ['Transfer tax applies']
    };
  }

  private static getFallbackFieldSuggestions(
    documentType: string,
    stepId: string,
    context: FieldSuggestionContext
  ): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];

    // Basic suggestions based on property data
    if (stepId === 'property' && context.propertyData.address) {
      suggestions.push({
        field: 'address',
        value: context.propertyData.address,
        confidence: 0.9,
        reasoning: 'Using provided property address',
        source: 'user_input',
        requiresVerification: false
      });
    }

    if (stepId === 'parties' && context.propertyData.currentOwners.length > 0) {
      const grantorText = context.propertyData.currentOwners
        .map(owner => owner.name)
        .join('; ');
      
      suggestions.push({
        field: 'grantorsText',
        value: grantorText,
        confidence: 0.8,
        reasoning: 'Using current property owners from records',
        source: 'property_records',
        requiresVerification: true,
        legalImplications: 'Grantor names must match title records exactly'
      });
    }

    return suggestions;
  }

  private static getFallbackChainOfTitle(propertyData: PropertyData): ChainOfTitleAnalysis {
    return {
      transfers: [],
      currentOwner: {
        name: propertyData.currentOwners[0]?.name || 'Unknown',
        vestingType: propertyData.currentOwners[0]?.vestingType || 'Unknown',
        acquisitionDate: new Date()
      },
      ownershipDuration: 'Unknown',
      riskAssessment: {
        overallRisk: 'medium',
        riskFactors: ['Chain of title analysis unavailable'],
        recommendations: ['Obtain title insurance', 'Conduct manual title search'],
        titleIssues: []
      },
      recommendations: {
        documentType: 'grant_deed',
        additionalDueDiligence: ['Title search', 'Lien search'],
        titleInsurance: true
      }
    };
  }

  private static getFallbackValidation(
    documentType: string,
    documentData: Record<string, any>
  ): LegalValidationResult {
    const errors = [];
    const warnings = [];

    // Basic validation checks
    if (!documentData.grantorsText) {
      errors.push({
        field: 'grantorsText',
        message: 'Grantor information is required',
        severity: 'error' as const,
        legalBasis: 'California Civil Code §1095',
        suggestion: 'Enter the current property owner names exactly as shown on title'
      });
    }

    if (!documentData.granteesText) {
      errors.push({
        field: 'granteesText',
        message: 'Grantee information is required',
        severity: 'error' as const,
        legalBasis: 'California Civil Code §1095',
        suggestion: 'Enter the new property owner names and how they will hold title'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      complianceChecks: {
        'grantor_present': !!documentData.grantorsText,
        'grantee_present': !!documentData.granteesText,
        'property_identified': !!documentData.legalDescription
      },
      recommendations: [
        'Verify all names match official records',
        'Consider title insurance',
        'Review with legal counsel if needed'
      ]
    };
  }

  private static getFallbackPromptResponse(
    prompt: string,
    context: WizardContext
  ): PromptResponse {
    const lowerPrompt = prompt.toLowerCase();
    
    // Simple pattern matching for common requests
    if (lowerPrompt.includes('fill') && lowerPrompt.includes('name')) {
      return {
        intent: 'field_update',
        actions: [{
          type: 'suggestion',
          target: 'grantorsText',
          value: 'AI service unavailable - please enter manually',
          confidence: 0.5
        }],
        response: 'I would help fill in the names, but the AI service is currently unavailable. Please enter the information manually.',
        suggestions: []
      };
    }

    return {
      intent: 'information_request',
      actions: [],
      response: 'I understand you need help, but the AI service is currently unavailable. Please refer to the field help text or contact support.',
      suggestions: []
    };
  }

  private static getFallbackCapabilitySuggestions(
    capability: AICapability,
    context: any
  ): AISuggestion[] {
    // Return empty suggestions when AI service is unavailable
    return [];
  }

  private static getFallbackTaxCalculation(
    propertyValue: number,
    county: string,
    city?: string
  ) {
    // Basic California transfer tax calculation
    const countyRate = 0.0011; // $1.10 per $1,000
    const cityRate = city ? 0.0045 : 0; // Varies by city, using LA rate as example
    
    const countyAmount = Math.round((propertyValue * countyRate) * 100) / 100;
    const cityAmount = Math.round((propertyValue * cityRate) * 100) / 100;
    
    return {
      countyAmount,
      cityAmount,
      totalAmount: countyAmount + cityAmount,
      basis: 'full_value',
      exemptions: []
    };
  }
}

// Export types and service
export type {
  DocumentSuggestion,
  FieldSuggestionContext,
  FieldSuggestion,
  ChainOfTitleAnalysis,
  LegalValidationResult,
  PromptResponse
};
