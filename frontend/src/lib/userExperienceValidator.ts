import { WizardStateManager, PropertyData } from './wizardState';
import { DOCUMENT_REGISTRY } from './documentRegistry';
import { aiIntegrationTester } from './aiIntegrationTesting';
import { performanceOptimizer } from './performanceOptimization';
import { errorRecoveryValidator } from './errorRecoveryValidation';
import { legalComplianceValidator } from './legalComplianceValidator';

// User experience validation and testing framework
export interface UserJourney {
  id: string;
  name: string;
  description: string;
  userType: 'novice' | 'intermediate' | 'professional';
  documentType: string;
  steps: UserJourneyStep[];
  expectedDuration: number; // in milliseconds
  successCriteria: string[];
}

export interface UserJourneyStep {
  stepId: string;
  stepName: string;
  userAction: string;
  expectedOutcome: string;
  maxDuration: number;
  criticalPath: boolean;
}

export interface UXTestResult {
  journeyId: string;
  journeyName: string;
  userType: string;
  passed: boolean;
  actualDuration: number;
  expectedDuration: number;
  completionRate: number;
  usabilityScore: number;
  accessibilityScore: number;
  stepResults: UXStepResult[];
  issues: UXIssue[];
  recommendations: string[];
}

export interface UXStepResult {
  stepId: string;
  stepName: string;
  passed: boolean;
  duration: number;
  maxDuration: number;
  userFriction: 'none' | 'low' | 'medium' | 'high';
  errorCount: number;
  helpNeeded: boolean;
}

export interface UXIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'navigation' | 'clarity' | 'performance' | 'accessibility' | 'legal' | 'ai_assistance';
  description: string;
  impact: string;
  recommendation: string;
  stepId?: string;
}

export interface UXMetrics {
  overallSatisfaction: number; // 1-5 scale
  easeOfUse: number; // 1-5 scale
  completionConfidence: number; // 1-5 scale
  aiHelpfulness: number; // 1-5 scale
  timeToComplete: number;
  errorRecoveryRating: number; // 1-5 scale
  legalClarityRating: number; // 1-5 scale
}

export class UserExperienceValidator {
  private stateManager: WizardStateManager;
  private testResults: Map<string, UXTestResult> = new Map();

  constructor() {
    this.stateManager = new WizardStateManager();
  }

  // Define user journeys for testing
  private getUserJourneys(): UserJourney[] {
    return [
      {
        id: 'novice_grant_deed',
        name: 'Novice User - Grant Deed Creation',
        description: 'First-time user creating a grant deed with AI assistance',
        userType: 'novice',
        documentType: 'grant_deed',
        expectedDuration: 12 * 60 * 1000, // 12 minutes
        successCriteria: [
          'Complete property search successfully',
          'Understand document type recommendation',
          'Fill all required fields with AI help',
          'Generate valid deed document',
          'Understand legal implications'
        ],
        steps: [
          {
            stepId: 'property_search',
            stepName: 'Property Search',
            userAction: 'Enter property address and verify details',
            expectedOutcome: 'Property data populated with AI suggestions',
            maxDuration: 3 * 60 * 1000, // 3 minutes
            criticalPath: true
          },
          {
            stepId: 'document_selection',
            stepName: 'Document Type Selection',
            userAction: 'Review AI recommendation and select document type',
            expectedOutcome: 'Understand why Grant Deed is recommended',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'recording_info',
            stepName: 'Recording Information',
            userAction: 'Enter recording details with AI assistance',
            expectedOutcome: 'Recording information completed accurately',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'tax_calculation',
            stepName: 'Transfer Tax',
            userAction: 'Calculate transfer tax with AI help',
            expectedOutcome: 'Transfer tax calculated correctly',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'parties_vesting',
            stepName: 'Parties and Vesting',
            userAction: 'Enter grantor/grantee information',
            expectedOutcome: 'Parties information complete and legally valid',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'review_generate',
            stepName: 'Review and Generate',
            userAction: 'Review document and generate PDF',
            expectedOutcome: 'Valid deed document generated',
            maxDuration: 1 * 60 * 1000, // 1 minute
            criticalPath: true
          }
        ]
      },
      {
        id: 'professional_interspousal',
        name: 'Professional User - Interspousal Transfer',
        description: 'Experienced user creating interspousal transfer deed',
        userType: 'professional',
        documentType: 'interspousal_transfer',
        expectedDuration: 6 * 60 * 1000, // 6 minutes
        successCriteria: [
          'Quickly navigate through steps',
          'Leverage AI for efficiency',
          'Complete without errors',
          'Understand tax exemptions',
          'Generate compliant document'
        ],
        steps: [
          {
            stepId: 'property_search',
            stepName: 'Property Search',
            userAction: 'Quick property lookup',
            expectedOutcome: 'Property verified efficiently',
            maxDuration: 1 * 60 * 1000, // 1 minute
            criticalPath: true
          },
          {
            stepId: 'document_selection',
            stepName: 'Document Selection',
            userAction: 'Select interspousal transfer',
            expectedOutcome: 'Document type confirmed',
            maxDuration: 30 * 1000, // 30 seconds
            criticalPath: true
          },
          {
            stepId: 'spouse_information',
            stepName: 'Spouse Information',
            userAction: 'Enter both spouses details',
            expectedOutcome: 'Spouse information validated',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'tax_exemption',
            stepName: 'Tax Exemption',
            userAction: 'Claim interspousal tax exemption',
            expectedOutcome: 'Tax exemption properly claimed',
            maxDuration: 1 * 60 * 1000, // 1 minute
            criticalPath: true
          },
          {
            stepId: 'review_generate',
            stepName: 'Review and Generate',
            userAction: 'Final review and generation',
            expectedOutcome: 'Compliant interspousal deed generated',
            maxDuration: 1.5 * 60 * 1000, // 1.5 minutes
            criticalPath: true
          }
        ]
      },
      {
        id: 'intermediate_quitclaim',
        name: 'Intermediate User - Quitclaim Deed',
        description: 'Moderately experienced user creating quitclaim deed',
        userType: 'intermediate',
        documentType: 'quitclaim_deed',
        expectedDuration: 8 * 60 * 1000, // 8 minutes
        successCriteria: [
          'Navigate with moderate assistance',
          'Understand quitclaim limitations',
          'Complete required fields',
          'Generate valid document'
        ],
        steps: [
          {
            stepId: 'property_search',
            stepName: 'Property Search',
            userAction: 'Search and verify property',
            expectedOutcome: 'Property details confirmed',
            maxDuration: 2 * 60 * 1000, // 2 minutes
            criticalPath: true
          },
          {
            stepId: 'document_selection',
            stepName: 'Document Selection',
            userAction: 'Choose quitclaim deed with understanding',
            expectedOutcome: 'Understand quitclaim implications',
            maxDuration: 1.5 * 60 * 1000, // 1.5 minutes
            criticalPath: true
          },
          {
            stepId: 'parties_info',
            stepName: 'Parties Information',
            userAction: 'Enter grantor and grantee details',
            expectedOutcome: 'Parties information complete',
            maxDuration: 2.5 * 60 * 1000, // 2.5 minutes
            criticalPath: true
          },
          {
            stepId: 'recording_details',
            stepName: 'Recording Details',
            userAction: 'Complete recording information',
            expectedOutcome: 'Recording details accurate',
            maxDuration: 1.5 * 60 * 1000, // 1.5 minutes
            criticalPath: true
          },
          {
            stepId: 'review_generate',
            stepName: 'Review and Generate',
            userAction: 'Review and generate quitclaim deed',
            expectedOutcome: 'Valid quitclaim deed created',
            maxDuration: 0.5 * 60 * 1000, // 30 seconds
            criticalPath: true
          }
        ]
      }
    ];
  }

  // Test individual user journey
  async testUserJourney(journey: UserJourney): Promise<UXTestResult> {
    const startTime = Date.now();
    const stepResults: UXStepResult[] = [];
    const issues: UXIssue[] = [];
    let totalErrors = 0;

    try {
      // Initialize wizard for this journey
      this.stateManager.selectDocument(journey.documentType);
      
      // Test each step in the journey
      for (const step of journey.steps) {
        const stepResult = await this.testJourneyStep(journey, step);
        stepResults.push(stepResult);
        totalErrors += stepResult.errorCount;

        // Identify issues based on step performance
        if (!stepResult.passed) {
          issues.push({
            severity: stepResult.criticalPath ? 'critical' : 'high',
            category: 'navigation',
            description: `Step "${step.stepName}" failed to complete successfully`,
            impact: 'User cannot progress in wizard',
            recommendation: 'Improve step validation and user guidance',
            stepId: step.stepId
          });
        }

        if (stepResult.duration > stepResult.maxDuration) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            description: `Step "${step.stepName}" took longer than expected`,
            impact: 'Poor user experience and potential abandonment',
            recommendation: 'Optimize step performance and add progress indicators',
            stepId: step.stepId
          });
        }

        if (stepResult.userFriction === 'high') {
          issues.push({
            severity: 'high',
            category: 'clarity',
            description: `Step "${step.stepName}" has high user friction`,
            impact: 'Users struggle to complete step',
            recommendation: 'Improve UI clarity and add better help text',
            stepId: step.stepId
          });
        }
      }

      const totalDuration = Date.now() - startTime;
      const completionRate = stepResults.filter(s => s.passed).length / stepResults.length;
      
      // Calculate scores
      const usabilityScore = this.calculateUsabilityScore(stepResults, totalErrors, journey.userType);
      const accessibilityScore = this.calculateAccessibilityScore(stepResults);
      
      const passed = completionRate >= 0.8 && totalDuration <= journey.expectedDuration * 1.5;
      
      const result: UXTestResult = {
        journeyId: journey.id,
        journeyName: journey.name,
        userType: journey.userType,
        passed,
        actualDuration: totalDuration,
        expectedDuration: journey.expectedDuration,
        completionRate,
        usabilityScore,
        accessibilityScore,
        stepResults,
        issues,
        recommendations: this.generateUXRecommendations(journey, stepResults, issues)
      };

      this.testResults.set(journey.id, result);
      return result;

    } catch (error) {
      const result: UXTestResult = {
        journeyId: journey.id,
        journeyName: journey.name,
        userType: journey.userType,
        passed: false,
        actualDuration: Date.now() - startTime,
        expectedDuration: journey.expectedDuration,
        completionRate: 0,
        usabilityScore: 0,
        accessibilityScore: 0,
        stepResults,
        issues: [{
          severity: 'critical',
          category: 'navigation',
          description: `Journey failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          impact: 'Complete journey failure',
          recommendation: 'Fix critical system error'
        }],
        recommendations: ['Fix critical system error before proceeding']
      };

      this.testResults.set(journey.id, result);
      return result;
    }
  }

  // Test individual journey step
  private async testJourneyStep(journey: UserJourney, step: UserJourneyStep): Promise<UXStepResult> {
    const startTime = Date.now();
    let errorCount = 0;
    let helpNeeded = false;
    let userFriction: UXStepResult['userFriction'] = 'none';

    try {
      // Simulate user actions based on step
      switch (step.stepId) {
        case 'property_search':
          await this.simulatePropertySearch(journey.userType);
          break;
        case 'document_selection':
          await this.simulateDocumentSelection(journey.documentType, journey.userType);
          break;
        case 'recording_info':
        case 'recording_details':
          await this.simulateRecordingInfo(journey.userType);
          break;
        case 'tax_calculation':
        case 'tax_exemption':
          await this.simulateTaxCalculation(journey.documentType, journey.userType);
          break;
        case 'parties_vesting':
        case 'parties_info':
        case 'spouse_information':
          await this.simulatePartiesInfo(journey.documentType, journey.userType);
          break;
        case 'review_generate':
          await this.simulateReviewGenerate(journey.userType);
          break;
      }

      // Assess user friction based on user type and step complexity
      userFriction = this.assessUserFriction(step, journey.userType);
      
      // Determine if help was needed
      helpNeeded = journey.userType === 'novice' || userFriction === 'high';

    } catch (error) {
      errorCount++;
      userFriction = 'high';
    }

    const duration = Date.now() - startTime;
    const passed = errorCount === 0 && duration <= step.maxDuration;

    return {
      stepId: step.stepId,
      stepName: step.stepName,
      passed,
      duration,
      maxDuration: step.maxDuration,
      userFriction,
      errorCount,
      helpNeeded
    };
  }

  // Simulate property search step
  private async simulatePropertySearch(userType: string): Promise<void> {
    const testAddress = '123 Main St, Los Angeles, CA 90210';
    
    // Simulate typing delay based on user type
    const typingDelay = userType === 'novice' ? 100 : userType === 'intermediate' ? 50 : 20;
    await new Promise(resolve => setTimeout(resolve, testAddress.length * typingDelay));
    
    // Update property data
    this.stateManager.updatePropertyData({
      address: testAddress,
      apn: '123-456-789',
      county: 'Los Angeles',
      legalDescription: 'Test legal description',
      currentOwners: [{ name: 'Test Owner' }]
    });
  }

  // Simulate document selection step
  private async simulateDocumentSelection(documentType: string, userType: string): Promise<void> {
    // Simulate decision time based on user type
    const decisionTime = userType === 'novice' ? 2000 : userType === 'intermediate' ? 1000 : 500;
    await new Promise(resolve => setTimeout(resolve, decisionTime));
    
    this.stateManager.selectDocument(documentType);
  }

  // Simulate recording information step
  private async simulateRecordingInfo(userType: string): Promise<void> {
    const formFillTime = userType === 'novice' ? 1500 : userType === 'intermediate' ? 800 : 400;
    await new Promise(resolve => setTimeout(resolve, formFillTime));
    
    this.stateManager.updateField('recording', 'requestedBy', 'Test Title Company');
    this.stateManager.updateField('recording', 'mailTo', 'Test Address');
  }

  // Simulate tax calculation step
  private async simulateTaxCalculation(documentType: string, userType: string): Promise<void> {
    const calculationTime = userType === 'novice' ? 2000 : userType === 'intermediate' ? 1000 : 500;
    await new Promise(resolve => setTimeout(resolve, calculationTime));
    
    if (documentType === 'interspousal_transfer') {
      this.stateManager.updateField('tax', 'exempt', true);
    } else {
      this.stateManager.updateField('tax', 'dttAmount', '1000');
      this.stateManager.updateField('tax', 'dttBasis', 'full_consideration');
    }
  }

  // Simulate parties information step
  private async simulatePartiesInfo(documentType: string, userType: string): Promise<void> {
    const formFillTime = userType === 'novice' ? 2000 : userType === 'intermediate' ? 1200 : 600;
    await new Promise(resolve => setTimeout(resolve, formFillTime));
    
    if (documentType === 'interspousal_transfer') {
      this.stateManager.updateField('parties', 'spouse1', { name: 'John Smith' });
      this.stateManager.updateField('parties', 'spouse2', { name: 'Mary Smith' });
      this.stateManager.updateField('parties', 'marriageStatus', 'married');
    } else {
      this.stateManager.updateField('parties', 'grantors', [{ name: 'Test Grantor' }]);
      this.stateManager.updateField('parties', 'grantees', [{ name: 'Test Grantee', vesting: 'sole and separate' }]);
    }
  }

  // Simulate review and generate step
  private async simulateReviewGenerate(userType: string): Promise<void> {
    const reviewTime = userType === 'novice' ? 1000 : userType === 'intermediate' ? 600 : 300;
    await new Promise(resolve => setTimeout(resolve, reviewTime));
    
    // Simulate document generation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Assess user friction for a step
  private assessUserFriction(step: UserJourneyStep, userType: string): UXStepResult['userFriction'] {
    // Complex steps are harder for novice users
    const complexSteps = ['tax_calculation', 'parties_vesting', 'spouse_information'];
    
    if (userType === 'novice' && complexSteps.includes(step.stepId)) {
      return 'high';
    }
    
    if (userType === 'intermediate' && complexSteps.includes(step.stepId)) {
      return 'medium';
    }
    
    if (step.criticalPath && userType === 'novice') {
      return 'medium';
    }
    
    return userType === 'professional' ? 'none' : 'low';
  }

  // Calculate usability score
  private calculateUsabilityScore(stepResults: UXStepResult[], totalErrors: number, userType: string): number {
    const baseScore = 5.0;
    let score = baseScore;
    
    // Deduct for errors
    score -= totalErrors * 0.5;
    
    // Deduct for failed steps
    const failedSteps = stepResults.filter(s => !s.passed).length;
    score -= failedSteps * 0.8;
    
    // Deduct for high friction
    const highFrictionSteps = stepResults.filter(s => s.userFriction === 'high').length;
    score -= highFrictionSteps * 0.3;
    
    // Adjust for user type expectations
    if (userType === 'novice') {
      score += 0.2; // More forgiving for novices
    } else if (userType === 'professional') {
      score -= 0.2; // Higher expectations for professionals
    }
    
    return Math.max(0, Math.min(5, score));
  }

  // Calculate accessibility score
  private calculateAccessibilityScore(stepResults: UXStepResult[]): number {
    // Simplified accessibility scoring based on step completion and help usage
    const baseScore = 5.0;
    let score = baseScore;
    
    const helpNeededCount = stepResults.filter(s => s.helpNeeded).length;
    const totalSteps = stepResults.length;
    
    if (helpNeededCount / totalSteps > 0.5) {
      score -= 1.0; // Too much help needed
    }
    
    const highFrictionCount = stepResults.filter(s => s.userFriction === 'high').length;
    score -= (highFrictionCount / totalSteps) * 2.0;
    
    return Math.max(0, Math.min(5, score));
  }

  // Generate UX recommendations
  private generateUXRecommendations(
    journey: UserJourney,
    stepResults: UXStepResult[],
    issues: UXIssue[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Performance recommendations
    const slowSteps = stepResults.filter(s => s.duration > s.maxDuration);
    if (slowSteps.length > 0) {
      recommendations.push(`Optimize performance for ${slowSteps.length} slow steps`);
    }
    
    // Friction recommendations
    const highFrictionSteps = stepResults.filter(s => s.userFriction === 'high');
    if (highFrictionSteps.length > 0) {
      recommendations.push(`Reduce user friction in ${highFrictionSteps.length} steps`);
    }
    
    // User type specific recommendations
    if (journey.userType === 'novice') {
      const helpNeededSteps = stepResults.filter(s => s.helpNeeded);
      if (helpNeededSteps.length > stepResults.length * 0.6) {
        recommendations.push('Add more contextual help and guidance for novice users');
      }
    }
    
    // Critical path recommendations
    const failedCriticalSteps = stepResults.filter(s => !s.passed && 
      journey.steps.find(js => js.stepId === s.stepId)?.criticalPath
    );
    if (failedCriticalSteps.length > 0) {
      recommendations.push('Fix critical path failures that block user progress');
    }
    
    // Issue-based recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical UX issues immediately');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('User experience is satisfactory - continue monitoring');
    }
    
    return recommendations;
  }

  // Run all user experience tests
  async runAllUXTests(): Promise<Map<string, UXTestResult>> {
    const journeys = this.getUserJourneys();
    const results = new Map<string, UXTestResult>();
    
    console.log('🎯 Starting user experience validation tests...');
    
    for (const journey of journeys) {
      console.log(`Testing journey: ${journey.name}`);
      try {
        const result = await this.testUserJourney(journey);
        results.set(journey.id, result);
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to test journey ${journey.id}:`, error);
      }
    }
    
    return results;
  }

  // Generate comprehensive UX report
  generateUXReport(results: Map<string, UXTestResult>): string {
    if (results.size === 0) {
      return 'No UX test results available. Run tests first.';
    }

    const allResults = Array.from(results.values());
    const passedJourneys = allResults.filter(r => r.passed).length;
    const totalJourneys = allResults.length;
    const successRate = (passedJourneys / totalJourneys) * 100;
    
    const averageUsabilityScore = allResults.reduce((sum, r) => sum + r.usabilityScore, 0) / totalJourneys;
    const averageAccessibilityScore = allResults.reduce((sum, r) => sum + r.accessibilityScore, 0) / totalJourneys;
    const averageCompletionRate = allResults.reduce((sum, r) => sum + r.completionRate, 0) / totalJourneys;

    let report = `
# 🎯 User Experience Validation Report

## 📊 Overall UX Metrics
- **Journey Success Rate**: ${passedJourneys}/${totalJourneys} (${successRate.toFixed(1)}%)
- **Average Usability Score**: ${averageUsabilityScore.toFixed(1)}/5.0
- **Average Accessibility Score**: ${averageAccessibilityScore.toFixed(1)}/5.0
- **Average Completion Rate**: ${(averageCompletionRate * 100).toFixed(1)}%

## 👥 User Type Performance
${this.generateUserTypeAnalysis(allResults)}

## 📋 Document Type Performance
${this.generateDocumentTypeAnalysis(allResults)}

## 🚨 Critical UX Issues
${this.generateCriticalIssuesAnalysis(allResults)}

## 💡 UX Recommendations
${this.generateOverallUXRecommendations(allResults)}

## 📈 Performance Analysis
${this.generatePerformanceAnalysis(allResults)}

## 📋 Detailed Journey Results
${allResults.map(result => `
### ${result.journeyName}
- **User Type**: ${result.userType}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${(result.actualDuration / 1000).toFixed(1)}s (expected: ${(result.expectedDuration / 1000).toFixed(1)}s)
- **Completion Rate**: ${(result.completionRate * 100).toFixed(1)}%
- **Usability Score**: ${result.usabilityScore.toFixed(1)}/5.0
- **Accessibility Score**: ${result.accessibilityScore.toFixed(1)}/5.0
- **Issues**: ${result.issues.length} identified
- **Step Performance**: ${result.stepResults.filter(s => s.passed).length}/${result.stepResults.length} steps passed
`).join('\n')}
`;

    return report;
  }

  private generateUserTypeAnalysis(results: UXTestResult[]): string {
    const userTypes = ['novice', 'intermediate', 'professional'];
    
    return userTypes.map(userType => {
      const typeResults = results.filter(r => r.userType === userType);
      if (typeResults.length === 0) return null;
      
      const passed = typeResults.filter(r => r.passed).length;
      const avgUsability = typeResults.reduce((sum, r) => sum + r.usabilityScore, 0) / typeResults.length;
      const avgCompletion = typeResults.reduce((sum, r) => sum + r.completionRate, 0) / typeResults.length;
      
      return `- **${userType.charAt(0).toUpperCase() + userType.slice(1)}**: ${passed}/${typeResults.length} passed, ${avgUsability.toFixed(1)} usability, ${(avgCompletion * 100).toFixed(1)}% completion`;
    }).filter(Boolean).join('\n');
  }

  private generateDocumentTypeAnalysis(results: UXTestResult[]): string {
    const documentTypes = [...new Set(results.map(r => 
      this.getUserJourneys().find(j => j.id === r.journeyId)?.documentType
    ))].filter(Boolean);
    
    return documentTypes.map(docType => {
      const docResults = results.filter(r => 
        this.getUserJourneys().find(j => j.id === r.journeyId)?.documentType === docType
      );
      
      const passed = docResults.filter(r => r.passed).length;
      const avgDuration = docResults.reduce((sum, r) => sum + r.actualDuration, 0) / docResults.length;
      
      return `- **${docType?.replace('_', ' ')}**: ${passed}/${docResults.length} passed, ${(avgDuration / 1000).toFixed(1)}s avg duration`;
    }).join('\n');
  }

  private generateCriticalIssuesAnalysis(results: UXTestResult[]): string {
    const allIssues = results.flatMap(r => r.issues);
    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    const highIssues = allIssues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length === 0 && highIssues.length === 0) {
      return '🟢 No critical or high-severity UX issues identified';
    }
    
    let analysis = '';
    if (criticalIssues.length > 0) {
      analysis += `🔴 **${criticalIssues.length} Critical Issues**:\n`;
      analysis += criticalIssues.slice(0, 3).map(i => `- ${i.description}`).join('\n');
    }
    
    if (highIssues.length > 0) {
      analysis += `\n🟠 **${highIssues.length} High-Severity Issues**:\n`;
      analysis += highIssues.slice(0, 3).map(i => `- ${i.description}`).join('\n');
    }
    
    return analysis;
  }

  private generateOverallUXRecommendations(results: UXTestResult[]): string {
    const allRecommendations = results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    return uniqueRecommendations.slice(0, 10).map(rec => `- ${rec}`).join('\n');
  }

  private generatePerformanceAnalysis(results: UXTestResult[]): string {
    const slowJourneys = results.filter(r => r.actualDuration > r.expectedDuration * 1.2);
    const fastJourneys = results.filter(r => r.actualDuration < r.expectedDuration * 0.8);
    
    let analysis = `- **Slow Journeys**: ${slowJourneys.length} (>${20}% over expected time)\n`;
    analysis += `- **Fast Journeys**: ${fastJourneys.length} (<${20}% under expected time)\n`;
    
    const avgSpeedRatio = results.reduce((sum, r) => sum + (r.actualDuration / r.expectedDuration), 0) / results.length;
    analysis += `- **Average Speed Ratio**: ${avgSpeedRatio.toFixed(2)}x expected time`;
    
    return analysis;
  }

  // Get test results
  getTestResults(): Map<string, UXTestResult> {
    return new Map(this.testResults);
  }

  // Clear test results
  clearTestResults(): void {
    this.testResults.clear();
  }
}

// Export singleton instance
export const userExperienceValidator = new UserExperienceValidator();


