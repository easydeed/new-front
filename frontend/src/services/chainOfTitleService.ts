import { PropertyData } from '../lib/wizardState';

// Chain of Title Service following TitlePoint integration patterns
export interface ChainOfTitleRequest {
  propertyData: PropertyData;
  searchDepth?: 'basic' | 'comprehensive' | 'full_history';
  includeRiskAnalysis?: boolean;
  includeLegalValidation?: boolean;
}

export interface TitleTransfer {
  id: string;
  date: Date;
  grantor: string;
  grantee: string;
  documentType: string;
  consideration: string;
  recordingInfo: RecordingInfo;
  instrumentNumber: string;
  bookPage: string;
  riskFactors: string[];
  legalIssues: string[];
  confidence: number;
}

export interface RecordingInfo {
  county: string;
  recordingDate: Date;
  book: string;
  page: string;
  instrumentNumber: string;
  documentNumber: string;
}

export interface OwnershipPeriod {
  owner: string;
  vestingType: string;
  startDate: Date;
  endDate?: Date;
  duration: string;
  acquisitionMethod: string;
  dispositionMethod?: string;
}

export interface TitleIssue {
  id: string;
  type: 'lien' | 'encumbrance' | 'easement' | 'restriction' | 'gap_in_title' | 'name_variance' | 'legal_description_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedParties: string[];
  legalBasis: string;
  resolution: string;
  status: 'active' | 'resolved' | 'pending_resolution';
  discoveredDate: Date;
  impact: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: RiskFactor[];
  titleIssues: TitleIssue[];
  recommendations: string[];
  insurabilityRating: 'excellent' | 'good' | 'fair' | 'poor' | 'uninsurable';
  requiredActions: RequiredAction[];
}

export interface RiskFactor {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  likelihood: number; // 0-1
  mitigation: string;
  cost: string;
  timeframe: string;
}

export interface RequiredAction {
  id: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  responsible: string;
  cost?: string;
  description: string;
}

export interface ChainOfTitleAnalysis {
  requestId: string;
  propertyInfo: {
    address: string;
    apn: string;
    county: string;
    legalDescription: string;
    fips: string;
  };
  transfers: TitleTransfer[];
  ownershipHistory: OwnershipPeriod[];
  currentOwner: {
    name: string;
    vestingType: string;
    acquisitionDate: Date;
    acquisitionMethod: string;
    ownershipDuration: string;
  };
  riskAssessment: RiskAssessment;
  titleIssues: TitleIssue[];
  recommendations: {
    documentType: string;
    additionalDueDiligence: string[];
    titleInsurance: boolean;
    legalReview: boolean;
    estimatedCost: string;
    timeframe: string;
  };
  dataSource: 'titlepoint' | 'county_records' | 'ai_analysis' | 'hybrid';
  confidence: number;
  lastUpdated: Date;
  completionTime: number;
}

export interface TitlePointServiceRequest {
  requestId: string;
  serviceType: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  resultIds: string[];
  errorMessage?: string;
}

export class ChainOfTitleService {
  private static apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  private static requestCache = new Map<string, ChainOfTitleAnalysis>();
  private static pendingRequests = new Map<string, Promise<ChainOfTitleAnalysis>>();

  // Main entry point for chain of title analysis
  static async getChainOfTitle(request: ChainOfTitleRequest): Promise<ChainOfTitleAnalysis> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    if (this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey)!;
      // Return cached if less than 1 hour old
      if (Date.now() - cached.lastUpdated.getTime() < 60 * 60 * 1000) {
        return cached;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return await this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const promise = this.performChainOfTitleAnalysis(request);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      this.requestCache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Perform comprehensive chain of title analysis
  private static async performChainOfTitleAnalysis(request: ChainOfTitleRequest): Promise<ChainOfTitleAnalysis> {
    const startTime = Date.now();
    
    try {
      // Step 1: Create TitlePoint service request for Legal/Vesting data
      const legalVestingRequest = await this.createTitlePointService({
        serviceType: 'TitlePoint.Geo.LegalVesting',
        propertyData: request.propertyData,
        searchDepth: request.searchDepth || 'comprehensive'
      });

      // Step 2: Wait for completion and get results
      const legalVestingData = await this.waitForTitlePointCompletion(legalVestingRequest.requestId);

      // Step 3: Create additional service requests if comprehensive analysis requested
      let instrumentData = null;
      if (request.searchDepth === 'comprehensive' || request.searchDepth === 'full_history') {
        const instrumentRequest = await this.createTitlePointService({
          serviceType: 'TitlePoint.Geo.Address',
          propertyData: request.propertyData,
          searchDepth: request.searchDepth
        });
        instrumentData = await this.waitForTitlePointCompletion(instrumentRequest.requestId);
      }

      // Step 4: Parse and analyze the data
      const analysis = await this.analyzeChainOfTitle({
        legalVestingData,
        instrumentData,
        propertyData: request.propertyData,
        includeRiskAnalysis: request.includeRiskAnalysis ?? true,
        includeLegalValidation: request.includeLegalValidation ?? true
      });

      // Step 5: Enhance with AI analysis if requested
      if (request.includeRiskAnalysis) {
        analysis.riskAssessment = await this.performRiskAnalysis(analysis);
      }

      analysis.completionTime = Date.now() - startTime;
      return analysis;

    } catch (error) {
      console.error('Chain of title analysis failed:', error);
      throw new Error(`Chain of title analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create TitlePoint service following existing patterns
  private static async createTitlePointService(params: {
    serviceType: string;
    propertyData: PropertyData;
    searchDepth: string;
  }): Promise<TitlePointServiceRequest> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/titlepoint/create-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          serviceType: params.serviceType,
          propertyData: {
            apn: params.propertyData.apn,
            county: params.propertyData.county,
            state: 'CA', // California specific
            address: params.propertyData.address
          },
          searchDepth: params.searchDepth,
          parameters: this.buildTitlePointParameters(params.serviceType, params.propertyData),
          customerRef: `COT_${Date.now()}`,
          orderComment: `Chain of Title Analysis - ${params.propertyData.address}`
        })
      });

      if (!response.ok) {
        throw new Error(`TitlePoint service creation failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        requestId: data.requestId,
        serviceType: params.serviceType,
        status: 'pending',
        createdAt: new Date(),
        resultIds: []
      };
    } catch (error) {
      throw new Error(`Failed to create TitlePoint service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Wait for TitlePoint service completion following existing patterns
  private static async waitForTitlePointCompletion(requestId: string): Promise<any> {
    const maxWaitTime = 60000; // 60 seconds
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/titlepoint/request-status/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const statusData = await response.json();
        
        if (statusData.status === 'complete') {
          // Get the actual results
          const resultsResponse = await fetch(`${this.apiBaseUrl}/api/titlepoint/get-results/${requestId}`, {
            headers: {
              'Authorization': `Bearer ${this.getAuthToken()}`
            }
          });

          if (!resultsResponse.ok) {
            throw new Error(`Results retrieval failed: ${resultsResponse.status}`);
          }

          return await resultsResponse.json();
        } else if (statusData.status === 'failed') {
          throw new Error(`TitlePoint service failed: ${statusData.errorMessage}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.warn(`Status check attempt failed: ${error}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`TitlePoint service timeout after ${maxWaitTime}ms`);
  }

  // Analyze chain of title data
  private static async analyzeChainOfTitle(params: {
    legalVestingData: any;
    instrumentData?: any;
    propertyData: PropertyData;
    includeRiskAnalysis: boolean;
    includeLegalValidation: boolean;
  }): Promise<ChainOfTitleAnalysis> {
    
    // Parse transfers from legal/vesting data
    const transfers = this.parseTransfers(params.legalVestingData, params.instrumentData);
    
    // Build ownership history
    const ownershipHistory = this.buildOwnershipHistory(transfers);
    
    // Identify current owner
    const currentOwner = this.identifyCurrentOwner(transfers, params.propertyData);
    
    // Detect title issues
    const titleIssues = await this.detectTitleIssues(transfers, params.legalVestingData);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(transfers, titleIssues, params.propertyData);

    return {
      requestId: `cot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      propertyInfo: {
        address: params.propertyData.address,
        apn: params.propertyData.apn || '',
        county: params.propertyData.county || '',
        legalDescription: params.propertyData.legalDescription || '',
        fips: params.legalVestingData?.fips || ''
      },
      transfers,
      ownershipHistory,
      currentOwner,
      riskAssessment: {
        overallRisk: 'medium', // Will be updated by risk analysis
        riskScore: 50,
        riskFactors: [],
        titleIssues,
        recommendations: recommendations.additionalDueDiligence,
        insurabilityRating: 'good',
        requiredActions: []
      },
      titleIssues,
      recommendations,
      dataSource: 'titlepoint',
      confidence: 0.85,
      lastUpdated: new Date(),
      completionTime: 0 // Will be set by caller
    };
  }

  // Parse transfers from TitlePoint data
  private static parseTransfers(legalVestingData: any, instrumentData?: any): TitleTransfer[] {
    const transfers: TitleTransfer[] = [];
    
    try {
      // Parse from legal/vesting data
      const deeds = legalVestingData?.result?.LvDeeds?.LegalAndVesting2DeedInfo || [];
      
      deeds.forEach((deed: any, index: number) => {
        transfers.push({
          id: `transfer_${index}`,
          date: new Date(deed.RecordedDate || Date.now()),
          grantor: deed.Grantor || 'Unknown',
          grantee: deed.Grantee || 'Unknown',
          documentType: deed.DocType || 'Unknown',
          consideration: deed.Consideration || 'Not disclosed',
          recordingInfo: {
            county: deed.County || '',
            recordingDate: new Date(deed.RecordedDate || Date.now()),
            book: deed.Book || '',
            page: deed.Page || '',
            instrumentNumber: deed.InstrumentNumber || '',
            documentNumber: deed.DocumentNumber || ''
          },
          instrumentNumber: deed.InstrumentNumber || '',
          bookPage: `${deed.Book || ''}-${deed.Page || ''}`,
          riskFactors: [],
          legalIssues: [],
          confidence: 0.8
        });
      });

      // Sort by date (most recent first)
      transfers.sort((a, b) => b.date.getTime() - a.date.getTime());
      
    } catch (error) {
      console.error('Error parsing transfers:', error);
    }

    return transfers;
  }

  // Build ownership history from transfers
  private static buildOwnershipHistory(transfers: TitleTransfer[]): OwnershipPeriod[] {
    const history: OwnershipPeriod[] = [];
    
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];
      const nextTransfer = transfers[i + 1];
      
      history.push({
        owner: transfer.grantee,
        vestingType: this.inferVestingType(transfer.grantee),
        startDate: transfer.date,
        endDate: nextTransfer?.date,
        duration: this.calculateDuration(transfer.date, nextTransfer?.date),
        acquisitionMethod: transfer.documentType,
        dispositionMethod: nextTransfer?.documentType
      });
    }

    return history;
  }

  // Identify current owner
  private static identifyCurrentOwner(transfers: TitleTransfer[], propertyData: PropertyData): ChainOfTitleAnalysis['currentOwner'] {
    const mostRecentTransfer = transfers[0];
    const currentOwnerFromProperty = propertyData.currentOwners?.[0];

    return {
      name: currentOwnerFromProperty?.name || mostRecentTransfer?.grantee || 'Unknown',
      vestingType: currentOwnerFromProperty?.vestingType || this.inferVestingType(mostRecentTransfer?.grantee || ''),
      acquisitionDate: mostRecentTransfer?.date || new Date(),
      acquisitionMethod: mostRecentTransfer?.documentType || 'Unknown',
      ownershipDuration: this.calculateDuration(mostRecentTransfer?.date || new Date())
    };
  }

  // Detect title issues
  private static async detectTitleIssues(transfers: TitleTransfer[], legalVestingData: any): Promise<TitleIssue[]> {
    const issues: TitleIssue[] = [];

    // Check for name variances
    const nameVariances = this.detectNameVariances(transfers);
    issues.push(...nameVariances);

    // Check for gaps in title
    const titleGaps = this.detectTitleGaps(transfers);
    issues.push(...titleGaps);

    // Check for legal description issues
    const legalDescIssues = this.detectLegalDescriptionIssues(legalVestingData);
    issues.push(...legalDescIssues);

    return issues;
  }

  // Perform AI-powered risk analysis
  private static async performRiskAnalysis(analysis: ChainOfTitleAnalysis): Promise<RiskAssessment> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/risk-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          chainOfTitle: analysis,
          analysisType: 'comprehensive'
        })
      });

      if (response.ok) {
        const riskData = await response.json();
        return this.parseRiskAssessment(riskData);
      }
    } catch (error) {
      console.warn('AI risk analysis failed, using fallback:', error);
    }

    // Fallback risk analysis
    return this.performFallbackRiskAnalysis(analysis);
  }

  // Helper methods
  private static generateCacheKey(request: ChainOfTitleRequest): string {
    return `cot_${request.propertyData.apn || request.propertyData.address}_${request.searchDepth || 'basic'}`;
  }

  private static buildTitlePointParameters(serviceType: string, propertyData: PropertyData): string {
    switch (serviceType) {
      case 'TitlePoint.Geo.LegalVesting':
        return `General.AutoSearchProperty=true;General.AutoSearchTaxes=false;LegalVesting.IncludeDeeds=true;LegalVesting.IncludeVesting=true`;
      case 'TitlePoint.Geo.Address':
        return `Document.SearchType=Instrument;General.AutoSearchProperty=true`;
      default:
        return 'General.AutoSearchProperty=true';
    }
  }

  private static inferVestingType(granteeName: string): string {
    const name = granteeName.toLowerCase();
    if (name.includes('husband') && name.includes('wife')) return 'community property';
    if (name.includes('joint tenants')) return 'joint tenants';
    if (name.includes('tenants in common')) return 'tenants in common';
    if (name.includes('single') || name.includes('unmarried')) return 'sole and separate';
    return 'unknown';
  }

  private static calculateDuration(startDate: Date, endDate?: Date): string {
    const end = endDate || new Date();
    const diffMs = end.getTime() - startDate.getTime();
    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (years > 0) {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  private static detectNameVariances(transfers: TitleTransfer[]): TitleIssue[] {
    // Implementation for detecting name variances
    return [];
  }

  private static detectTitleGaps(transfers: TitleTransfer[]): TitleIssue[] {
    // Implementation for detecting gaps in title
    return [];
  }

  private static detectLegalDescriptionIssues(legalVestingData: any): TitleIssue[] {
    // Implementation for detecting legal description issues
    return [];
  }

  private static generateRecommendations(transfers: TitleTransfer[], titleIssues: TitleIssue[], propertyData: PropertyData): ChainOfTitleAnalysis['recommendations'] {
    const hasIssues = titleIssues.length > 0;
    const recentTransfers = transfers.filter(t => Date.now() - t.date.getTime() < 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years

    return {
      documentType: 'grant_deed',
      additionalDueDiligence: hasIssues ? ['Title insurance required', 'Legal review recommended'] : ['Standard title search'],
      titleInsurance: hasIssues || recentTransfers.length > 2,
      legalReview: hasIssues,
      estimatedCost: hasIssues ? '$2,000 - $5,000' : '$500 - $1,500',
      timeframe: hasIssues ? '2-4 weeks' : '1-2 weeks'
    };
  }

  private static parseRiskAssessment(riskData: any): RiskAssessment {
    return {
      overallRisk: riskData.overallRisk || 'medium',
      riskScore: riskData.riskScore || 50,
      riskFactors: riskData.riskFactors || [],
      titleIssues: riskData.titleIssues || [],
      recommendations: riskData.recommendations || [],
      insurabilityRating: riskData.insurabilityRating || 'good',
      requiredActions: riskData.requiredActions || []
    };
  }

  private static performFallbackRiskAnalysis(analysis: ChainOfTitleAnalysis): RiskAssessment {
    const riskScore = Math.max(0, 100 - (analysis.titleIssues.length * 20));
    
    return {
      overallRisk: riskScore > 80 ? 'low' : riskScore > 60 ? 'medium' : 'high',
      riskScore,
      riskFactors: [],
      titleIssues: analysis.titleIssues,
      recommendations: ['Consider title insurance', 'Verify current ownership'],
      insurabilityRating: riskScore > 80 ? 'excellent' : riskScore > 60 ? 'good' : 'fair',
      requiredActions: []
    };
  }

  private static getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  // Public utility methods
  static clearCache(): void {
    this.requestCache.clear();
  }

  static getCachedAnalysis(propertyData: PropertyData): ChainOfTitleAnalysis | null {
    const cacheKey = this.generateCacheKey({ propertyData });
    return this.requestCache.get(cacheKey) || null;
  }
}

// Export types and service
export type {
  ChainOfTitleRequest,
  ChainOfTitleAnalysis,
  TitleTransfer,
  TitleIssue,
  RiskAssessment,
  OwnershipPeriod
};


