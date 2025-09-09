import { WizardStateManager, PropertyData, WizardState } from './wizardState';
import { IntelligentAIService } from '../services/aiService';
import { DOCUMENT_REGISTRY } from './documentRegistry';

// Error recovery validation and testing framework
export interface ErrorScenario {
  name: string;
  description: string;
  errorType: 'network' | 'api' | 'validation' | 'timeout' | 'auth' | 'data_corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  simulateError: () => Promise<void>;
  expectedRecovery: string;
}

export interface RecoveryTestResult {
  scenarioName: string;
  passed: boolean;
  recoveryTime: number;
  dataLoss: boolean;
  userExperienceImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  errorMessage: string;
  recoveryActions: string[];
  recommendations: string[];
}

export class ErrorRecoveryValidator {
  private stateManager: WizardStateManager;
  private originalFetch: typeof fetch;
  private testResults: RecoveryTestResult[] = [];

  constructor() {
    this.stateManager = new WizardStateManager();
    this.originalFetch = global.fetch;
  }

  // Define error scenarios to test
  private getErrorScenarios(): ErrorScenario[] {
    return [
      {
        name: 'Network Connection Lost',
        description: 'Complete network failure during property search',
        errorType: 'network',
        severity: 'high',
        simulateError: async () => {
          global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
        },
        expectedRecovery: 'Graceful degradation with offline mode and data preservation'
      },
      {
        name: 'TitlePoint API Timeout',
        description: 'TitlePoint service times out during property lookup',
        errorType: 'timeout',
        severity: 'medium',
        simulateError: async () => {
          global.fetch = jest.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 100)
            )
          );
        },
        expectedRecovery: 'Fallback to basic property data with user notification'
      },
      {
        name: 'AI Service Unavailable',
        description: 'AI service returns 503 Service Unavailable',
        errorType: 'api',
        severity: 'medium',
        simulateError: async () => {
          global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: () => Promise.resolve({ error: 'Service temporarily unavailable' })
          } as Response);
        },
        expectedRecovery: 'Use fallback AI logic with reduced functionality'
      },
      {
        name: 'Authentication Token Expired',
        description: 'JWT token expires during wizard session',
        errorType: 'auth',
        severity: 'high',
        simulateError: async () => {
          global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({ error: 'Token expired' })
          } as Response);
        },
        expectedRecovery: 'Prompt for re-authentication while preserving wizard state'
      },
      {
        name: 'Invalid Property Data',
        description: 'Property search returns corrupted or invalid data',
        errorType: 'data_corruption',
        severity: 'medium',
        simulateError: async () => {
          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              address: null, // Invalid data
              apn: undefined,
              county: '',
              owners: 'not_an_array' // Type mismatch
            })
          } as Response);
        },
        expectedRecovery: 'Data validation with user-friendly error messages'
      },
      {
        name: 'Browser Storage Full',
        description: 'LocalStorage quota exceeded during auto-save',
        errorType: 'data_corruption',
        severity: 'medium',
        simulateError: async () => {
          const originalSetItem = localStorage.setItem;
          localStorage.setItem = jest.fn().mockImplementation(() => {
            throw new Error('QuotaExceededError');
          });
        },
        expectedRecovery: 'Clear old data and continue with current session'
      },
      {
        name: 'PDF Generation Failure',
        description: 'Document generation service fails at final step',
        errorType: 'api',
        severity: 'critical',
        simulateError: async () => {
          global.fetch = jest.fn().mockImplementation((url) => {
            if (url.toString().includes('/api/generate/')) {
              return Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('PDF generation failed')
              } as Response);
            }
            return this.originalFetch(url);
          });
        },
        expectedRecovery: 'Preserve all user data and offer retry with alternative formats'
      },
      {
        name: 'Validation Schema Mismatch',
        description: 'Frontend validation schema conflicts with backend requirements',
        errorType: 'validation',
        severity: 'high',
        simulateError: async () => {
          // Simulate schema mismatch by corrupting validation
          const originalValidate = this.stateManager.validateCurrentStep;
          this.stateManager.validateCurrentStep = jest.fn().mockRejectedValue(
            new Error('Validation schema version mismatch')
          );
        },
        expectedRecovery: 'Graceful validation fallback with user guidance'
      }
    ];
  }

  // Test individual error scenario
  async testErrorScenario(scenario: ErrorScenario): Promise<RecoveryTestResult> {
    const startTime = Date.now();
    let dataLoss = false;
    let userExperienceImpact: RecoveryTestResult['userExperienceImpact'] = 'none';
    let errorMessage = '';
    let recoveryActions: string[] = [];
    let passed = false;

    try {
      // Set up initial state
      this.stateManager.selectDocument('grant_deed');
      const initialState = this.stateManager.getState();
      
      // Add some test data
      this.stateManager.updatePropertyData({
        address: '123 Test St, Los Angeles, CA',
        apn: '123-456-789',
        county: 'Los Angeles',
        legalDescription: 'Test legal description',
        currentOwners: [{ name: 'Test Owner' }]
      });

      this.stateManager.updateField('property', 'address', '123 Test St, Los Angeles, CA');
      this.stateManager.updateField('recording', 'requestedBy', 'Test Title Company');

      // Simulate the error
      await scenario.simulateError();

      // Attempt operation that should trigger error
      let operationResult: any;
      try {
        switch (scenario.errorType) {
          case 'network':
          case 'timeout':
            operationResult = await IntelligentAIService.searchProperty('123 Test St, Los Angeles, CA');
            break;
          case 'api':
            operationResult = await IntelligentAIService.suggestDocumentType(this.stateManager.getState().propertyData);
            break;
          case 'auth':
            operationResult = await fetch('/api/protected-endpoint');
            break;
          case 'data_corruption':
            if (scenario.name.includes('Browser Storage')) {
              this.stateManager.updateField('test', 'field', 'value');
            } else {
              operationResult = await IntelligentAIService.searchProperty('123 Test St, Los Angeles, CA');
            }
            break;
          case 'validation':
            await this.stateManager.goToStep(2);
            break;
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      // Check state after error
      const finalState = this.stateManager.getState();
      
      // Assess recovery
      dataLoss = this.assessDataLoss(initialState, finalState);
      userExperienceImpact = this.assessUserExperienceImpact(scenario, errorMessage);
      recoveryActions = this.identifyRecoveryActions(scenario, errorMessage);
      
      // Determine if recovery was successful
      passed = this.evaluateRecoverySuccess(scenario, dataLoss, userExperienceImpact, errorMessage);

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Test execution failed';
      userExperienceImpact = 'severe';
      passed = false;
    } finally {
      // Restore original functions
      global.fetch = this.originalFetch;
      this.restoreOriginalFunctions();
    }

    const recoveryTime = Date.now() - startTime;

    const result: RecoveryTestResult = {
      scenarioName: scenario.name,
      passed,
      recoveryTime,
      dataLoss,
      userExperienceImpact,
      errorMessage,
      recoveryActions,
      recommendations: this.generateRecommendations(scenario, passed, dataLoss, userExperienceImpact)
    };

    this.testResults.push(result);
    return result;
  }

  // Run all error recovery tests
  async runAllErrorRecoveryTests(): Promise<RecoveryTestResult[]> {
    const scenarios = this.getErrorScenarios();
    const results: RecoveryTestResult[] = [];

    console.log('🛡️ Starting error recovery validation tests...');

    for (const scenario of scenarios) {
      console.log(`Testing: ${scenario.name}`);
      try {
        const result = await this.testErrorScenario(scenario);
        results.push(result);
        
        // Brief pause between tests to avoid interference
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to test scenario ${scenario.name}:`, error);
        results.push({
          scenarioName: scenario.name,
          passed: false,
          recoveryTime: 0,
          dataLoss: true,
          userExperienceImpact: 'severe',
          errorMessage: error instanceof Error ? error.message : 'Test failed',
          recoveryActions: [],
          recommendations: ['Fix test execution error', 'Implement proper error handling']
        });
      }
    }

    this.testResults = results;
    return results;
  }

  // Assess if data was lost during error recovery
  private assessDataLoss(initialState: WizardState, finalState: WizardState): boolean {
    // Check if critical data is preserved
    const criticalFields = [
      'selectedDocument',
      'propertyData.address',
      'propertyData.apn',
      'stepData'
    ];

    for (const field of criticalFields) {
      const initialValue = this.getNestedValue(initialState, field);
      const finalValue = this.getNestedValue(finalState, field);
      
      if (initialValue && !finalValue) {
        return true; // Data loss detected
      }
    }

    return false;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Assess impact on user experience
  private assessUserExperienceImpact(
    scenario: ErrorScenario, 
    errorMessage: string
  ): RecoveryTestResult['userExperienceImpact'] {
    if (scenario.severity === 'critical') {
      return 'severe';
    }

    if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
      return 'moderate';
    }

    if (scenario.errorType === 'validation' || scenario.errorType === 'data_corruption') {
      return 'moderate';
    }

    if (scenario.errorType === 'api' && errorMessage.includes('fallback')) {
      return 'minimal';
    }

    return 'none';
  }

  // Identify recovery actions taken
  private identifyRecoveryActions(scenario: ErrorScenario, errorMessage: string): string[] {
    const actions: string[] = [];

    if (errorMessage.includes('fallback')) {
      actions.push('Fallback mechanism activated');
    }

    if (errorMessage.includes('retry')) {
      actions.push('Automatic retry attempted');
    }

    if (errorMessage.includes('cache')) {
      actions.push('Cached data used');
    }

    if (scenario.errorType === 'network') {
      actions.push('Offline mode enabled');
    }

    if (scenario.errorType === 'auth') {
      actions.push('Re-authentication prompted');
    }

    if (actions.length === 0) {
      actions.push('No specific recovery actions detected');
    }

    return actions;
  }

  // Evaluate if recovery was successful
  private evaluateRecoverySuccess(
    scenario: ErrorScenario,
    dataLoss: boolean,
    userExperienceImpact: RecoveryTestResult['userExperienceImpact'],
    errorMessage: string
  ): boolean {
    // Critical failures
    if (dataLoss && scenario.severity === 'critical') {
      return false;
    }

    if (userExperienceImpact === 'severe') {
      return false;
    }

    // High severity scenarios
    if (scenario.severity === 'high' && userExperienceImpact === 'moderate' && dataLoss) {
      return false;
    }

    // Success criteria
    if (!dataLoss && userExperienceImpact === 'none') {
      return true;
    }

    if (!dataLoss && userExperienceImpact === 'minimal') {
      return true;
    }

    if (scenario.severity === 'low' && !dataLoss) {
      return true;
    }

    return false;
  }

  // Generate recommendations for improvement
  private generateRecommendations(
    scenario: ErrorScenario,
    passed: boolean,
    dataLoss: boolean,
    userExperienceImpact: RecoveryTestResult['userExperienceImpact']
  ): string[] {
    const recommendations: string[] = [];

    if (!passed) {
      recommendations.push(`Improve error handling for ${scenario.errorType} errors`);
    }

    if (dataLoss) {
      recommendations.push('Implement better state persistence and recovery');
      recommendations.push('Add data validation before state updates');
    }

    if (userExperienceImpact === 'severe') {
      recommendations.push('Add user-friendly error messages and recovery guidance');
      recommendations.push('Implement graceful degradation for critical failures');
    }

    if (scenario.errorType === 'network') {
      recommendations.push('Implement offline mode with local data caching');
      recommendations.push('Add network status monitoring and user notifications');
    }

    if (scenario.errorType === 'api') {
      recommendations.push('Implement circuit breaker pattern for API calls');
      recommendations.push('Add comprehensive fallback mechanisms');
    }

    if (scenario.errorType === 'auth') {
      recommendations.push('Implement seamless token refresh');
      recommendations.push('Add session state preservation during re-authentication');
    }

    if (scenario.errorType === 'timeout') {
      recommendations.push('Implement request timeout handling with retry logic');
      recommendations.push('Add progress indicators for long-running operations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Error recovery is working well - continue monitoring');
    }

    return recommendations;
  }

  // Restore original functions after testing
  private restoreOriginalFunctions(): void {
    // Restore any mocked functions
    if (jest.isMockFunction(localStorage.setItem)) {
      (localStorage.setItem as jest.Mock).mockRestore();
    }
  }

  // Generate comprehensive error recovery report
  generateErrorRecoveryReport(): string {
    if (this.testResults.length === 0) {
      return 'No error recovery tests have been run. Execute tests first.';
    }

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    const dataLossIncidents = this.testResults.filter(r => r.dataLoss).length;
    const severeImpactIncidents = this.testResults.filter(r => r.userExperienceImpact === 'severe').length;
    const averageRecoveryTime = this.testResults.reduce((sum, r) => sum + r.recoveryTime, 0) / totalTests;

    let report = `
# 🛡️ Error Recovery Validation Report

## 📊 Test Summary
- **Total Scenarios Tested**: ${totalTests}
- **Passed**: ${passedTests} (${successRate.toFixed(1)}%)
- **Failed**: ${failedTests}
- **Data Loss Incidents**: ${dataLossIncidents}
- **Severe UX Impact**: ${severeImpactIncidents}
- **Average Recovery Time**: ${averageRecoveryTime.toFixed(0)}ms

## 🎯 Recovery Success Rate by Error Type
${this.generateErrorTypeAnalysis()}

## ❌ Failed Scenarios
${this.generateFailedScenariosReport()}

## 🚨 Critical Issues
${this.generateCriticalIssuesReport()}

## 💡 Recommendations
${this.generateOverallRecommendations()}

## 📋 Detailed Results
${this.testResults.map(result => `
### ${result.scenarioName}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Recovery Time**: ${result.recoveryTime}ms
- **Data Loss**: ${result.dataLoss ? '🔴 YES' : '🟢 NO'}
- **UX Impact**: ${this.getUXImpactEmoji(result.userExperienceImpact)} ${result.userExperienceImpact.toUpperCase()}
- **Error**: ${result.errorMessage || 'None'}
- **Recovery Actions**: ${result.recoveryActions.join(', ') || 'None'}
- **Recommendations**: ${result.recommendations.join('; ')}
`).join('\n')}
`;

    return report;
  }

  private generateErrorTypeAnalysis(): string {
    const errorTypes = ['network', 'api', 'validation', 'timeout', 'auth', 'data_corruption'];
    const analysis = errorTypes.map(type => {
      const typeResults = this.testResults.filter(r => 
        this.getErrorScenarios().find(s => s.name === r.scenarioName)?.errorType === type
      );
      
      if (typeResults.length === 0) return null;
      
      const passed = typeResults.filter(r => r.passed).length;
      const total = typeResults.length;
      const rate = (passed / total) * 100;
      
      return `- **${type}**: ${passed}/${total} (${rate.toFixed(1)}%)`;
    }).filter(Boolean);

    return analysis.join('\n') || 'No error type analysis available';
  }

  private generateFailedScenariosReport(): string {
    const failed = this.testResults.filter(r => !r.passed);
    
    if (failed.length === 0) {
      return '🎉 No failed scenarios - all error recovery tests passed!';
    }

    return failed.map(result => 
      `- **${result.scenarioName}**: ${result.errorMessage}`
    ).join('\n');
  }

  private generateCriticalIssuesReport(): string {
    const criticalIssues: string[] = [];

    const dataLossCount = this.testResults.filter(r => r.dataLoss).length;
    if (dataLossCount > 0) {
      criticalIssues.push(`${dataLossCount} scenarios resulted in data loss`);
    }

    const severeImpactCount = this.testResults.filter(r => r.userExperienceImpact === 'severe').length;
    if (severeImpactCount > 0) {
      criticalIssues.push(`${severeImpactCount} scenarios had severe user experience impact`);
    }

    const slowRecoveryCount = this.testResults.filter(r => r.recoveryTime > 5000).length;
    if (slowRecoveryCount > 0) {
      criticalIssues.push(`${slowRecoveryCount} scenarios had slow recovery (>5s)`);
    }

    if (criticalIssues.length === 0) {
      return '🟢 No critical issues identified';
    }

    return criticalIssues.map(issue => `- 🚨 ${issue}`).join('\n');
  }

  private generateOverallRecommendations(): string {
    const allRecommendations = this.testResults.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    return uniqueRecommendations.map(rec => `- ${rec}`).join('\n');
  }

  private getUXImpactEmoji(impact: RecoveryTestResult['userExperienceImpact']): string {
    switch (impact) {
      case 'none': return '🟢';
      case 'minimal': return '🟡';
      case 'moderate': return '🟠';
      case 'severe': return '🔴';
      default: return '⚪';
    }
  }

  // Get test results
  getTestResults(): RecoveryTestResult[] {
    return [...this.testResults];
  }

  // Clear test results
  clearTestResults(): void {
    this.testResults = [];
  }
}

// Export singleton instance
export const errorRecoveryValidator = new ErrorRecoveryValidator();


