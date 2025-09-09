import { ChainOfTitleAnalysis, TitleTransfer, TitleIssue, RiskAssessment, RiskFactor, RequiredAction } from '../services/chainOfTitleService';
import { PropertyData } from './wizardState';

// Risk Analysis Engine for comprehensive title risk assessment
export interface RiskAnalysisRequest {
  chainOfTitle: ChainOfTitleAnalysis;
  propertyData: PropertyData;
  transactionType?: 'sale' | 'refinance' | 'gift' | 'inheritance';
  analysisDepth?: 'basic' | 'comprehensive' | 'expert';
  includeMarketRisk?: boolean;
  includeLegalRisk?: boolean;
  includeFinancialRisk?: boolean;
}

export interface MarketRiskFactors {
  propertyValueTrend: 'increasing' | 'stable' | 'declining';
  marketVolatility: number; // 0-1
  liquidityRisk: 'high' | 'medium' | 'low';
  neighborhoodStability: number; // 0-1
  comparableSales: number;
  daysOnMarket: number;
}

export interface LegalRiskFactors {
  titleDefects: number;
  encumbrances: number;
  easements: number;
  restrictions: number;
  litigationRisk: 'high' | 'medium' | 'low';
  complianceIssues: number;
}

export interface FinancialRiskFactors {
  outstandingLiens: number;
  taxDelinquency: boolean;
  assessmentRisk: 'high' | 'medium' | 'low';
  insuranceCost: number;
  transactionCosts: number;
}

export interface RiskPattern {
  pattern: string;
  riskType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  mitigation: string;
  cost: string;
  timeframe: string;
}

export interface RiskRule {
  id: string;
  name: string;
  condition: (analysis: ChainOfTitleAnalysis, propertyData: PropertyData) => boolean;
  riskFactor: RiskFactor;
  requiredActions: RequiredAction[];
}

export class RiskAnalysisEngine {
  private static riskPatterns: RiskPattern[] = [];
  private static riskRules: RiskRule[] = [];
  private static initialized = false;

  // Initialize the risk analysis engine
  static initialize(): void {
    if (this.initialized) return;

    this.initializeRiskPatterns();
    this.initializeRiskRules();
    this.initialized = true;
  }

  // Main risk analysis method
  static async analyzeRisk(request: RiskAnalysisRequest): Promise<RiskAssessment> {
    this.initialize();

    const startTime = Date.now();
    
    try {
      // Perform different types of risk analysis
      const titleRisks = this.analyzeTitleRisks(request.chainOfTitle);
      const patternRisks = this.analyzeRiskPatterns(request.chainOfTitle, request.propertyData);
      const ruleBasedRisks = this.applyRiskRules(request.chainOfTitle, request.propertyData);
      
      // Optional enhanced analysis
      let marketRisks: RiskFactor[] = [];
      let legalRisks: RiskFactor[] = [];
      let financialRisks: RiskFactor[] = [];

      if (request.includeMarketRisk) {
        marketRisks = await this.analyzeMarketRisks(request.propertyData);
      }

      if (request.includeLegalRisk) {
        legalRisks = await this.analyzeLegalRisks(request.chainOfTitle);
      }

      if (request.includeFinancialRisk) {
        financialRisks = await this.analyzeFinancialRisks(request.chainOfTitle, request.propertyData);
      }

      // Combine all risk factors
      const allRiskFactors = [
        ...titleRisks,
        ...patternRisks,
        ...ruleBasedRisks,
        ...marketRisks,
        ...legalRisks,
        ...financialRisks
      ];

      // Calculate overall risk assessment
      const riskAssessment = this.calculateOverallRisk(allRiskFactors, request.chainOfTitle.titleIssues);

      // Generate required actions
      const requiredActions = this.generateRequiredActions(allRiskFactors, request.chainOfTitle.titleIssues);

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(allRiskFactors, request.chainOfTitle);

      const analysisTime = Date.now() - startTime;
      console.log(`Risk analysis completed in ${analysisTime}ms`);

      return {
        overallRisk: riskAssessment.overallRisk,
        riskScore: riskAssessment.riskScore,
        riskFactors: allRiskFactors,
        titleIssues: request.chainOfTitle.titleIssues,
        recommendations,
        insurabilityRating: this.calculateInsurabilityRating(riskAssessment.riskScore, allRiskFactors),
        requiredActions
      };

    } catch (error) {
      console.error('Risk analysis failed:', error);
      throw new Error(`Risk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize risk patterns
  private static initializeRiskPatterns(): void {
    this.riskPatterns = [
      {
        pattern: 'frequent_transfers',
        riskType: 'title_stability',
        severity: 'medium',
        description: 'Property has changed hands frequently, indicating potential issues',
        indicators: ['More than 3 transfers in 5 years', 'Short ownership periods'],
        mitigation: 'Enhanced title search and verification',
        cost: '$500-$1,500',
        timeframe: '1-2 weeks'
      },
      {
        pattern: 'name_variations',
        riskType: 'identity_verification',
        severity: 'medium',
        description: 'Variations in owner names across transfers',
        indicators: ['Different spellings', 'Name changes', 'Corporate name changes'],
        mitigation: 'Identity verification and affidavit of same person',
        cost: '$200-$500',
        timeframe: '3-5 days'
      },
      {
        pattern: 'gap_in_chain',
        riskType: 'title_continuity',
        severity: 'high',
        description: 'Missing link in the chain of title',
        indicators: ['Unexplained ownership gap', 'Missing transfer documents'],
        mitigation: 'Curative title work and gap coverage',
        cost: '$1,000-$5,000',
        timeframe: '2-4 weeks'
      },
      {
        pattern: 'foreclosure_history',
        riskType: 'financial_distress',
        severity: 'high',
        description: 'Property has foreclosure history',
        indicators: ['Trustee sale', 'REO property', 'Short sale'],
        mitigation: 'Enhanced due diligence and title insurance',
        cost: '$1,500-$3,000',
        timeframe: '2-3 weeks'
      },
      {
        pattern: 'estate_transfers',
        riskType: 'probate_issues',
        severity: 'medium',
        description: 'Transfers involving estates or probate',
        indicators: ['Executor deeds', 'Administrator deeds', 'Heir transfers'],
        mitigation: 'Probate verification and heir searches',
        cost: '$800-$2,000',
        timeframe: '1-3 weeks'
      },
      {
        pattern: 'corporate_transfers',
        riskType: 'entity_validity',
        severity: 'medium',
        description: 'Transfers involving corporate entities',
        indicators: ['LLC transfers', 'Corporation transfers', 'Partnership transfers'],
        mitigation: 'Entity status verification and authority confirmation',
        cost: '$300-$800',
        timeframe: '1 week'
      },
      {
        pattern: 'tax_issues',
        riskType: 'financial_obligations',
        severity: 'high',
        description: 'Outstanding tax obligations or liens',
        indicators: ['Tax liens', 'Assessment appeals', 'Delinquent taxes'],
        mitigation: 'Tax clearance and lien resolution',
        cost: '$500-$2,500',
        timeframe: '2-6 weeks'
      },
      {
        pattern: 'legal_description_changes',
        riskType: 'boundary_issues',
        severity: 'medium',
        description: 'Changes in legal description across transfers',
        indicators: ['Lot splits', 'Boundary adjustments', 'Description variations'],
        mitigation: 'Survey and legal description verification',
        cost: '$1,000-$3,000',
        timeframe: '2-4 weeks'
      }
    ];
  }

  // Initialize risk rules
  private static initializeRiskRules(): void {
    this.riskRules = [
      {
        id: 'frequent_transfers_rule',
        name: 'Frequent Transfer Detection',
        condition: (analysis, propertyData) => {
          const recentTransfers = analysis.transfers.filter(t => 
            Date.now() - t.date.getTime() < 5 * 365 * 24 * 60 * 60 * 1000 // Last 5 years
          );
          return recentTransfers.length > 3;
        },
        riskFactor: {
          id: 'frequent_transfers',
          type: 'Title Stability',
          severity: 'medium',
          description: 'Property has changed hands frequently in recent years',
          impact: 'May indicate underlying issues with the property',
          likelihood: 0.7,
          mitigation: 'Enhanced title search and due diligence',
          cost: '$500-$1,500',
          timeframe: '1-2 weeks'
        },
        requiredActions: [{
          id: 'enhanced_title_search',
          action: 'Perform enhanced title search',
          priority: 'medium',
          responsible: 'Title Company',
          description: 'Conduct thorough investigation of recent transfers'
        }]
      },
      {
        id: 'title_gap_rule',
        name: 'Title Gap Detection',
        condition: (analysis, propertyData) => {
          // Check for gaps in ownership chain
          for (let i = 0; i < analysis.transfers.length - 1; i++) {
            const current = analysis.transfers[i];
            const next = analysis.transfers[i + 1];
            if (current.grantor !== next.grantee) {
              return true;
            }
          }
          return false;
        },
        riskFactor: {
          id: 'title_gap',
          type: 'Title Continuity',
          severity: 'high',
          description: 'Gap detected in chain of title',
          impact: 'May affect marketability and insurability of title',
          likelihood: 0.9,
          mitigation: 'Curative title work required',
          cost: '$1,000-$5,000',
          timeframe: '2-4 weeks'
        },
        requiredActions: [{
          id: 'curative_title_work',
          action: 'Perform curative title work',
          priority: 'high',
          responsible: 'Title Attorney',
          description: 'Resolve gaps in chain of title through legal documentation'
        }]
      },
      {
        id: 'name_variance_rule',
        name: 'Name Variance Detection',
        condition: (analysis, propertyData) => {
          const names = analysis.transfers.map(t => t.grantee.toLowerCase());
          const uniqueNames = new Set(names);
          return names.length > uniqueNames.size * 1.2; // 20% variance threshold
        },
        riskFactor: {
          id: 'name_variance',
          type: 'Identity Verification',
          severity: 'medium',
          description: 'Variations in owner names detected',
          impact: 'May require identity verification and documentation',
          likelihood: 0.6,
          mitigation: 'Affidavit of same person or entity',
          cost: '$200-$500',
          timeframe: '3-5 days'
        },
        requiredActions: [{
          id: 'identity_verification',
          action: 'Verify identity consistency',
          priority: 'medium',
          responsible: 'Title Officer',
          description: 'Obtain affidavits confirming identity of parties with name variations'
        }]
      },
      {
        id: 'recent_transfer_rule',
        name: 'Recent Transfer Risk',
        condition: (analysis, propertyData) => {
          const mostRecent = analysis.transfers[0];
          const daysSinceTransfer = (Date.now() - mostRecent.date.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceTransfer < 90; // Less than 90 days
        },
        riskFactor: {
          id: 'recent_transfer',
          type: 'Transaction Timing',
          severity: 'low',
          description: 'Property recently changed ownership',
          impact: 'May indicate flipping or rapid resale',
          likelihood: 0.4,
          mitigation: 'Verify transaction legitimacy and pricing',
          cost: '$100-$300',
          timeframe: '1-2 days'
        },
        requiredActions: [{
          id: 'transaction_verification',
          action: 'Verify recent transaction details',
          priority: 'low',
          responsible: 'Escrow Officer',
          description: 'Confirm legitimacy and terms of recent transfer'
        }]
      }
    ];
  }

  // Analyze title-specific risks
  private static analyzeTitleRisks(chainOfTitle: ChainOfTitleAnalysis): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Analyze title issues
    chainOfTitle.titleIssues.forEach(issue => {
      risks.push({
        id: `title_issue_${issue.id}`,
        type: issue.type.replace('_', ' '),
        severity: issue.severity,
        description: issue.description,
        impact: issue.impact,
        likelihood: this.calculateIssueLikelihood(issue),
        mitigation: issue.resolution,
        cost: this.estimateResolutionCost(issue),
        timeframe: this.estimateResolutionTime(issue)
      });
    });

    return risks;
  }

  // Analyze risk patterns
  private static analyzeRiskPatterns(chainOfTitle: ChainOfTitleAnalysis, propertyData: PropertyData): RiskFactor[] {
    const risks: RiskFactor[] = [];

    this.riskPatterns.forEach(pattern => {
      if (this.matchesPattern(pattern, chainOfTitle, propertyData)) {
        risks.push({
          id: pattern.pattern,
          type: pattern.riskType,
          severity: pattern.severity,
          description: pattern.description,
          impact: `Pattern detected: ${pattern.indicators.join(', ')}`,
          likelihood: this.calculatePatternLikelihood(pattern, chainOfTitle),
          mitigation: pattern.mitigation,
          cost: pattern.cost,
          timeframe: pattern.timeframe
        });
      }
    });

    return risks;
  }

  // Apply risk rules
  private static applyRiskRules(chainOfTitle: ChainOfTitleAnalysis, propertyData: PropertyData): RiskFactor[] {
    const risks: RiskFactor[] = [];

    this.riskRules.forEach(rule => {
      if (rule.condition(chainOfTitle, propertyData)) {
        risks.push(rule.riskFactor);
      }
    });

    return risks;
  }

  // Analyze market risks
  private static async analyzeMarketRisks(propertyData: PropertyData): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    try {
      // This would integrate with market data APIs
      // For now, we'll provide basic market risk assessment
      
      risks.push({
        id: 'market_volatility',
        type: 'Market Risk',
        severity: 'low',
        description: 'General market volatility considerations',
        impact: 'Property values may fluctuate with market conditions',
        likelihood: 0.3,
        mitigation: 'Consider market timing and comparable sales',
        cost: 'N/A',
        timeframe: 'Ongoing'
      });

    } catch (error) {
      console.warn('Market risk analysis failed:', error);
    }

    return risks;
  }

  // Analyze legal risks
  private static async analyzeLegalRisks(chainOfTitle: ChainOfTitleAnalysis): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Check for legal compliance issues
    const hasComplexTransfers = chainOfTitle.transfers.some(t => 
      t.documentType.includes('Trust') || 
      t.documentType.includes('Estate') ||
      t.documentType.includes('Corporation')
    );

    if (hasComplexTransfers) {
      risks.push({
        id: 'complex_entity_transfers',
        type: 'Legal Compliance',
        severity: 'medium',
        description: 'Transfers involving complex entities detected',
        impact: 'May require additional legal verification',
        likelihood: 0.6,
        mitigation: 'Verify entity authority and compliance',
        cost: '$500-$1,500',
        timeframe: '1-2 weeks'
      });
    }

    return risks;
  }

  // Analyze financial risks
  private static async analyzeFinancialRisks(chainOfTitle: ChainOfTitleAnalysis, propertyData: PropertyData): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Check for financial indicators in transfers
    const hasFinancialDistress = chainOfTitle.transfers.some(t => 
      t.documentType.includes('Foreclosure') ||
      t.documentType.includes('Trustee') ||
      t.consideration.toLowerCase().includes('nominal')
    );

    if (hasFinancialDistress) {
      risks.push({
        id: 'financial_distress_history',
        type: 'Financial Risk',
        severity: 'medium',
        description: 'History of financial distress detected',
        impact: 'May indicate underlying property or market issues',
        likelihood: 0.5,
        mitigation: 'Enhanced financial due diligence',
        cost: '$300-$800',
        timeframe: '1 week'
      });
    }

    return risks;
  }

  // Calculate overall risk assessment
  private static calculateOverallRisk(riskFactors: RiskFactor[], titleIssues: TitleIssue[]): { overallRisk: RiskAssessment['overallRisk']; riskScore: number } {
    let totalRiskScore = 0;
    let weightedScore = 0;

    // Calculate weighted risk score
    riskFactors.forEach(factor => {
      let severityWeight = 0;
      switch (factor.severity) {
        case 'critical': severityWeight = 4; break;
        case 'high': severityWeight = 3; break;
        case 'medium': severityWeight = 2; break;
        case 'low': severityWeight = 1; break;
      }
      
      const factorScore = severityWeight * factor.likelihood * 25; // Max 100 per factor
      totalRiskScore += factorScore;
      weightedScore += severityWeight;
    });

    // Add title issues impact
    titleIssues.forEach(issue => {
      let severityWeight = 0;
      switch (issue.severity) {
        case 'critical': severityWeight = 4; break;
        case 'high': severityWeight = 3; break;
        case 'medium': severityWeight = 2; break;
        case 'low': severityWeight = 1; break;
      }
      totalRiskScore += severityWeight * 20; // Fixed impact per issue
      weightedScore += severityWeight;
    });

    // Normalize score (0-100)
    const normalizedScore = weightedScore > 0 ? Math.min(100, totalRiskScore / Math.max(1, weightedScore)) : 0;
    const riskScore = Math.max(0, 100 - normalizedScore); // Invert so higher score = lower risk

    // Determine overall risk level
    let overallRisk: RiskAssessment['overallRisk'];
    if (riskScore >= 80) overallRisk = 'low';
    else if (riskScore >= 60) overallRisk = 'medium';
    else if (riskScore >= 40) overallRisk = 'high';
    else overallRisk = 'critical';

    return { overallRisk, riskScore };
  }

  // Calculate insurability rating
  private static calculateInsurabilityRating(riskScore: number, riskFactors: RiskFactor[]): RiskAssessment['insurabilityRating'] {
    const criticalFactors = riskFactors.filter(f => f.severity === 'critical').length;
    const highFactors = riskFactors.filter(f => f.severity === 'high').length;

    if (criticalFactors > 0) return 'uninsurable';
    if (highFactors > 2 || riskScore < 40) return 'poor';
    if (highFactors > 0 || riskScore < 60) return 'fair';
    if (riskScore < 80) return 'good';
    return 'excellent';
  }

  // Generate required actions
  private static generateRequiredActions(riskFactors: RiskFactor[], titleIssues: TitleIssue[]): RequiredAction[] {
    const actions: RequiredAction[] = [];

    // Actions from risk rules
    this.riskRules.forEach(rule => {
      rule.requiredActions.forEach(action => {
        if (!actions.find(a => a.id === action.id)) {
          actions.push(action);
        }
      });
    });

    // Actions from title issues
    titleIssues.forEach(issue => {
      if (issue.severity === 'high' || issue.severity === 'critical') {
        actions.push({
          id: `resolve_${issue.id}`,
          action: `Resolve ${issue.type.replace('_', ' ')}`,
          priority: issue.severity === 'critical' ? 'urgent' : 'high',
          responsible: 'Title Attorney',
          description: issue.resolution
        });
      }
    });

    return actions;
  }

  // Generate risk recommendations
  private static generateRiskRecommendations(riskFactors: RiskFactor[], chainOfTitle: ChainOfTitleAnalysis): string[] {
    const recommendations: string[] = [];

    const criticalFactors = riskFactors.filter(f => f.severity === 'critical');
    const highFactors = riskFactors.filter(f => f.severity === 'high');

    if (criticalFactors.length > 0) {
      recommendations.push('Immediate legal consultation required before proceeding');
      recommendations.push('Consider alternative transaction structures');
    }

    if (highFactors.length > 0) {
      recommendations.push('Enhanced title insurance coverage recommended');
      recommendations.push('Extended title search and examination required');
    }

    if (chainOfTitle.titleIssues.length > 0) {
      recommendations.push('Resolve all title issues before closing');
      recommendations.push('Obtain title insurance with appropriate endorsements');
    }

    if (recommendations.length === 0) {
      recommendations.push('Standard title insurance coverage appropriate');
      recommendations.push('Proceed with normal due diligence timeline');
    }

    return recommendations;
  }

  // Helper methods
  private static matchesPattern(pattern: RiskPattern, chainOfTitle: ChainOfTitleAnalysis, propertyData: PropertyData): boolean {
    switch (pattern.pattern) {
      case 'frequent_transfers':
        const recentTransfers = chainOfTitle.transfers.filter(t => 
          Date.now() - t.date.getTime() < 5 * 365 * 24 * 60 * 60 * 1000
        );
        return recentTransfers.length > 3;

      case 'name_variations':
        const names = chainOfTitle.transfers.map(t => t.grantee);
        const uniqueNames = new Set(names.map(n => n.toLowerCase().replace(/[^a-z]/g, '')));
        return names.length > uniqueNames.size;

      case 'gap_in_chain':
        for (let i = 0; i < chainOfTitle.transfers.length - 1; i++) {
          if (chainOfTitle.transfers[i].grantor !== chainOfTitle.transfers[i + 1].grantee) {
            return true;
          }
        }
        return false;

      case 'foreclosure_history':
        return chainOfTitle.transfers.some(t => 
          t.documentType.toLowerCase().includes('foreclosure') ||
          t.documentType.toLowerCase().includes('trustee') ||
          t.grantor.toLowerCase().includes('trustee')
        );

      case 'estate_transfers':
        return chainOfTitle.transfers.some(t => 
          t.documentType.toLowerCase().includes('estate') ||
          t.documentType.toLowerCase().includes('executor') ||
          t.documentType.toLowerCase().includes('administrator')
        );

      case 'corporate_transfers':
        return chainOfTitle.transfers.some(t => 
          t.grantee.toLowerCase().includes('llc') ||
          t.grantee.toLowerCase().includes('corp') ||
          t.grantee.toLowerCase().includes('inc')
        );

      case 'tax_issues':
        return chainOfTitle.titleIssues.some(issue => 
          issue.type.includes('lien') && issue.description.toLowerCase().includes('tax')
        );

      case 'legal_description_changes':
        const descriptions = chainOfTitle.transfers.map(t => t.recordingInfo.book + t.recordingInfo.page);
        return new Set(descriptions).size > 1;

      default:
        return false;
    }
  }

  private static calculatePatternLikelihood(pattern: RiskPattern, chainOfTitle: ChainOfTitleAnalysis): number {
    // Base likelihood on pattern severity and transfer count
    const baseLikelihood = pattern.severity === 'critical' ? 0.9 : 
                          pattern.severity === 'high' ? 0.7 :
                          pattern.severity === 'medium' ? 0.5 : 0.3;
    
    const transferFactor = Math.min(1, chainOfTitle.transfers.length / 10);
    return Math.min(1, baseLikelihood * (0.5 + transferFactor));
  }

  private static calculateIssueLikelihood(issue: TitleIssue): number {
    switch (issue.severity) {
      case 'critical': return 0.95;
      case 'high': return 0.8;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      default: return 0.5;
    }
  }

  private static estimateResolutionCost(issue: TitleIssue): string {
    switch (issue.severity) {
      case 'critical': return '$5,000-$15,000';
      case 'high': return '$2,000-$8,000';
      case 'medium': return '$500-$3,000';
      case 'low': return '$100-$1,000';
      default: return '$500-$2,000';
    }
  }

  private static estimateResolutionTime(issue: TitleIssue): string {
    switch (issue.severity) {
      case 'critical': return '4-8 weeks';
      case 'high': return '2-4 weeks';
      case 'medium': return '1-2 weeks';
      case 'low': return '3-7 days';
      default: return '1-2 weeks';
    }
  }

  // Public utility methods
  static getRiskPatterns(): RiskPattern[] {
    this.initialize();
    return [...this.riskPatterns];
  }

  static getRiskRules(): RiskRule[] {
    this.initialize();
    return [...this.riskRules];
  }

  static addCustomRiskRule(rule: RiskRule): void {
    this.initialize();
    this.riskRules.push(rule);
  }

  static removeRiskRule(ruleId: string): void {
    this.initialize();
    this.riskRules = this.riskRules.filter(rule => rule.id !== ruleId);
  }
}

// Export types and engine
export { RiskAnalysisEngine };
export type {
  RiskAnalysisRequest,
  MarketRiskFactors,
  LegalRiskFactors,
  FinancialRiskFactors,
  RiskPattern,
  RiskRule
};


