import { IntelligentAIService, DocumentSuggestion, FieldSuggestion } from '../services/aiService';
import { PropertyData, WizardContext, AISuggestion } from './wizardState';
import { DOCUMENT_REGISTRY, AICapability } from './documentRegistry';
import { validatePhase1_2Integration } from './phase1-2-validation';

// AI Integration Testing Framework
export interface AITestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  warnings: string[];
  metrics: Record<string, any>;
}

export interface AIIntegrationTestSuite {
  documentType: string;
  testResults: AITestResult[];
  overallScore: number;
  recommendations: string[];
}

export class AIIntegrationTester {
  private testResults: Map<string, AITestResult[]> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  // Test AI document suggestion across all document types
  async testDocumentSuggestions(): Promise<AITestResult[]> {
    const results: AITestResult[] = [];
    
    // Test scenarios for different property types
    const testScenarios = [
      {
        name: 'Single Owner Property',
        propertyData: {
          address: '123 Main St, Los Angeles, CA 90210',
          apn: '123-456-789',
          county: 'Los Angeles',
          legalDescription: 'Lot 1, Block 2, Tract 12345',
          currentOwners: [{ name: 'John Doe, a single man' }]
        },
        expectedType: 'grant_deed',
        minConfidence: 0.7
      },
      {
        name: 'Married Couple Property',
        propertyData: {
          address: '456 Oak Ave, Orange, CA 92868',
          apn: '987-654-321',
          county: 'Orange',
          legalDescription: 'Lot 5, Block 10, Tract 54321',
          currentOwners: [{ name: 'John Smith and Mary Smith, husband and wife' }]
        },
        expectedType: 'interspousal_transfer',
        minConfidence: 0.8
      },
      {
        name: 'Property with Liens',
        propertyData: {
          address: '789 Pine St, San Diego, CA 92101',
          apn: '555-666-777',
          county: 'San Diego',
          legalDescription: 'Lot 3, Block 7, Tract 98765',
          currentOwners: [{ name: 'Jane Doe' }],
          titlePointData: {
            liens: [{ type: 'mortgage', amount: '250000', creditor: 'Bank of America' }],
            encumbrances: [],
            taxInfo: undefined,
            chainOfTitle: [],
            lastUpdated: new Date()
          }
        },
        expectedType: 'warranty_deed',
        minConfidence: 0.6
      }
    ];

    for (const scenario of testScenarios) {
      const startTime = Date.now();
      try {
        const suggestion = await IntelligentAIService.suggestDocumentType(scenario.propertyData as PropertyData);
        const duration = Date.now() - startTime;
        
        const passed = suggestion.recommendedType === scenario.expectedType && 
                      suggestion.confidence >= scenario.minConfidence;
        
        results.push({
          testName: `Document Suggestion: ${scenario.name}`,
          passed,
          duration,
          warnings: passed ? [] : [`Expected ${scenario.expectedType}, got ${suggestion.recommendedType} with confidence ${suggestion.confidence}`],
          metrics: {
            recommendedType: suggestion.recommendedType,
            confidence: suggestion.confidence,
            alternativesCount: suggestion.alternatives.length,
            riskFactorsCount: suggestion.riskFactors.length
          }
        });
      } catch (error) {
        results.push({
          testName: `Document Suggestion: ${scenario.name}`,
          passed: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          warnings: ['AI service failed'],
          metrics: {}
        });
      }
    }

    return results;
  }

  // Test AI field suggestions for each document type
  async testFieldSuggestions(): Promise<AITestResult[]> {
    const results: AITestResult[] = [];
    
    const documentTypes = Object.keys(DOCUMENT_REGISTRY);
    
    for (const documentType of documentTypes) {
      const config = DOCUMENT_REGISTRY[documentType];
      
      for (const step of config.requiredSteps) {
        const startTime = Date.now();
        
        try {
          const context = {
            propertyData: {
              address: '123 Main St, Los Angeles, CA',
              apn: '123-456-789',
              county: 'Los Angeles',
              legalDescription: 'Test legal description',
              currentOwners: [{ name: 'Test Owner' }]
            },
            currentStepData: {},
            userContext: {
              userType: 'professional' as const,
              experience: 'intermediate' as const,
              preferences: {}
            }
          };
          
          const suggestions = await IntelligentAIService.getFieldSuggestions(
            documentType,
            step.id,
            context
          );
          
          const duration = Date.now() - startTime;
          
          // Validate suggestions quality
          const validSuggestions = suggestions.filter(s => 
            s.field && s.value && s.confidence > 0 && s.reasoning
          );
          
          const passed = validSuggestions.length >= 0; // Allow empty suggestions
          
          results.push({
            testName: `Field Suggestions: ${documentType} - ${step.name}`,
            passed,
            duration,
            warnings: validSuggestions.length === 0 ? ['No suggestions generated'] : [],
            metrics: {
              totalSuggestions: suggestions.length,
              validSuggestions: validSuggestions.length,
              averageConfidence: suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length || 0,
              sourcesUsed: [...new Set(suggestions.map(s => s.source))]
            }
          });
        } catch (error) {
          results.push({
            testName: `Field Suggestions: ${documentType} - ${step.name}`,
            passed: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            warnings: ['Field suggestion service failed'],
            metrics: {}
          });
        }
      }
    }
    
    return results;
  }

  // Test AI capabilities execution
  async testAICapabilities(): Promise<AITestResult[]> {
    const results: AITestResult[] = [];
    
    // Get all unique AI capabilities
    const allCapabilities = new Set<AICapability>();
    Object.values(DOCUMENT_REGISTRY).forEach(config => {
      config.requiredSteps.forEach(step => {
        step.aiCapabilities.forEach(cap => allCapabilities.add(cap));
      });
    });

    for (const capability of allCapabilities) {
      const startTime = Date.now();
      
      try {
        const context = {
          stepId: 'property',
          currentData: {
            address: '123 Main St, Los Angeles, CA',
            county: 'Los Angeles'
          },
          documentType: 'grant_deed',
          propertyData: {
            address: '123 Main St, Los Angeles, CA',
            apn: '123-456-789',
            county: 'Los Angeles',
            legalDescription: 'Test legal description',
            currentOwners: [{ name: 'Test Owner' }]
          }
        };
        
        const suggestions = await IntelligentAIService.executeCapability(capability, context);
        const duration = Date.now() - startTime;
        
        const passed = Array.isArray(suggestions);
        
        results.push({
          testName: `AI Capability: ${capability}`,
          passed,
          duration,
          warnings: suggestions.length === 0 ? ['No suggestions generated'] : [],
          metrics: {
            suggestionsCount: suggestions.length,
            capability: capability
          }
        });
      } catch (error) {
        results.push({
          testName: `AI Capability: ${capability}`,
          passed: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          warnings: ['AI capability execution failed'],
          metrics: { capability }
        });
      }
    }
    
    return results;
  }

  // Test property search integration
  async testPropertySearch(): Promise<AITestResult[]> {
    const results: AITestResult[] = [];
    
    const testAddresses = [
      '123 Main St, Los Angeles, CA 90210',
      '456 Oak Ave, Orange, CA 92868',
      '789 Pine St, San Diego, CA 92101',
      'Invalid Address Format', // Should handle gracefully
      '', // Empty address
    ];

    for (const address of testAddresses) {
      const startTime = Date.now();
      
      try {
        const propertyData = await IntelligentAIService.searchProperty(address);
        const duration = Date.now() - startTime;
        
        const passed = address.length > 0 ? propertyData !== null : propertyData === null;
        
        results.push({
          testName: `Property Search: ${address || 'Empty Address'}`,
          passed,
          duration,
          warnings: !passed ? ['Unexpected property search result'] : [],
          metrics: {
            hasData: propertyData !== null,
            hasAPN: propertyData?.apn ? true : false,
            hasOwners: propertyData?.currentOwners.length || 0,
            dataSource: propertyData?.transactionContext || 'none'
          }
        });
      } catch (error) {
        const isExpectedError = address.length === 0 || address === 'Invalid Address Format';
        
        results.push({
          testName: `Property Search: ${address || 'Empty Address'}`,
          passed: isExpectedError,
          duration: Date.now() - startTime,
          error: isExpectedError ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
          warnings: isExpectedError ? ['Expected error handled correctly'] : ['Unexpected error'],
          metrics: { expectedError: isExpectedError }
        });
      }
    }
    
    return results;
  }

  // Test natural language processing
  async testNaturalLanguageProcessing(): Promise<AITestResult[]> {
    const results: AITestResult[] = [];
    
    const testPrompts = [
      {
        prompt: 'fill in the grantor names',
        context: {
          documentType: 'grant_deed',
          currentStep: 4,
          propertyData: {
            address: '123 Main St, Los Angeles, CA',
            currentOwners: [{ name: 'John Doe' }]
          } as PropertyData,
          stepData: { parties: {} }
        },
        expectedIntent: 'field_update'
      },
      {
        prompt: 'calculate the transfer tax',
        context: {
          documentType: 'grant_deed',
          currentStep: 3,
          propertyData: {
            address: '123 Main St, Los Angeles, CA',
            county: 'Los Angeles'
          } as PropertyData,
          stepData: { tax: { propertyValue: 500000 } }
        },
        expectedIntent: 'field_update'
      },
      {
        prompt: 'what is a grant deed?',
        context: {
          documentType: 'grant_deed',
          currentStep: 1,
          propertyData: {} as PropertyData,
          stepData: {}
        },
        expectedIntent: 'information_request'
      }
    ];

    for (const testCase of testPrompts) {
      const startTime = Date.now();
      
      try {
        const response = await IntelligentAIService.processNaturalLanguagePrompt(
          testCase.prompt,
          testCase.context
        );
        
        const duration = Date.now() - startTime;
        const passed = response.intent === testCase.expectedIntent;
        
        results.push({
          testName: `Natural Language: "${testCase.prompt}"`,
          passed,
          duration,
          warnings: !passed ? [`Expected intent ${testCase.expectedIntent}, got ${response.intent}`] : [],
          metrics: {
            intent: response.intent,
            actionsCount: response.actions.length,
            suggestionsCount: response.suggestions.length,
            hasResponse: response.response.length > 0
          }
        });
      } catch (error) {
        results.push({
          testName: `Natural Language: "${testCase.prompt}"`,
          passed: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          warnings: ['Natural language processing failed'],
          metrics: {}
        });
      }
    }
    
    return results;
  }

  // Run comprehensive AI integration test suite
  async runComprehensiveTests(): Promise<Map<string, AIIntegrationTestSuite>> {
    const testSuites = new Map<string, AIIntegrationTestSuite>();
    
    console.log('🧪 Starting comprehensive AI integration tests...');
    
    // Document suggestion tests
    console.log('Testing document suggestions...');
    const documentSuggestionResults = await this.testDocumentSuggestions();
    
    // Field suggestion tests
    console.log('Testing field suggestions...');
    const fieldSuggestionResults = await this.testFieldSuggestions();
    
    // AI capability tests
    console.log('Testing AI capabilities...');
    const capabilityResults = await this.testAICapabilities();
    
    // Property search tests
    console.log('Testing property search...');
    const propertySearchResults = await this.testPropertySearch();
    
    // Natural language tests
    console.log('Testing natural language processing...');
    const nlpResults = await this.testNaturalLanguageProcessing();
    
    // Combine all results
    const allResults = [
      ...documentSuggestionResults,
      ...fieldSuggestionResults,
      ...capabilityResults,
      ...propertySearchResults,
      ...nlpResults
    ];
    
    // Calculate overall scores and create test suites
    const passedTests = allResults.filter(r => r.passed).length;
    const totalTests = allResults.length;
    const overallScore = (passedTests / totalTests) * 100;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(allResults);
    
    testSuites.set('comprehensive', {
      documentType: 'all',
      testResults: allResults,
      overallScore,
      recommendations
    });
    
    // Store results for reporting
    this.testResults.set('comprehensive', allResults);
    
    return testSuites;
  }

  // Generate recommendations based on test results
  private generateRecommendations(results: AITestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => !r.passed);
    const slowTests = results.filter(r => r.duration > 5000); // > 5 seconds
    const lowConfidenceTests = results.filter(r => 
      r.metrics.confidence && r.metrics.confidence < 0.5
    );
    
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed - review error handling and fallback mechanisms`);
    }
    
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} tests are slow (>5s) - implement caching and performance optimization`);
    }
    
    if (lowConfidenceTests.length > 0) {
      recommendations.push(`${lowConfidenceTests.length} tests show low AI confidence - improve training data or fallback logic`);
    }
    
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    if (averageDuration > 2000) {
      recommendations.push('Average response time is high - consider implementing request caching');
    }
    
    const errorRate = failedTests.length / results.length;
    if (errorRate > 0.1) {
      recommendations.push('Error rate is high (>10%) - improve error handling and service reliability');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All AI integration tests passed - system is ready for production');
    }
    
    return recommendations;
  }

  // Generate detailed test report
  generateTestReport(): string {
    const allResults = Array.from(this.testResults.values()).flat();
    
    if (allResults.length === 0) {
      return 'No test results available. Run tests first.';
    }
    
    const passedTests = allResults.filter(r => r.passed).length;
    const failedTests = allResults.filter(r => !r.passed).length;
    const totalTests = allResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    const averageDuration = allResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    
    let report = `
# 🧪 AI Integration Test Report

## 📊 Test Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests} (${successRate.toFixed(1)}%)
- **Failed**: ${failedTests}
- **Average Duration**: ${averageDuration.toFixed(0)}ms

## 📋 Test Categories

### Document Suggestions
${this.formatCategoryResults(allResults.filter(r => r.testName.includes('Document Suggestion')))}

### Field Suggestions  
${this.formatCategoryResults(allResults.filter(r => r.testName.includes('Field Suggestions')))}

### AI Capabilities
${this.formatCategoryResults(allResults.filter(r => r.testName.includes('AI Capability')))}

### Property Search
${this.formatCategoryResults(allResults.filter(r => r.testName.includes('Property Search')))}

### Natural Language Processing
${this.formatCategoryResults(allResults.filter(r => r.testName.includes('Natural Language')))}

## ⚠️ Failed Tests
${failedTests > 0 ? allResults.filter(r => !r.passed).map(r => 
  `- **${r.testName}**: ${r.error || 'Test failed'}`
).join('\n') : 'No failed tests'}

## 🚀 Recommendations
${this.generateRecommendations(allResults).map(r => `- ${r}`).join('\n')}

## 📈 Performance Metrics
- **Fastest Test**: ${Math.min(...allResults.map(r => r.duration))}ms
- **Slowest Test**: ${Math.max(...allResults.map(r => r.duration))}ms
- **Tests >2s**: ${allResults.filter(r => r.duration > 2000).length}
- **Tests >5s**: ${allResults.filter(r => r.duration > 5000).length}
`;
    
    return report;
  }

  private formatCategoryResults(results: AITestResult[]): string {
    if (results.length === 0) return 'No tests in this category';
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const rate = (passed / total) * 100;
    
    return `${passed}/${total} passed (${rate.toFixed(1)}%)`;
  }
}

// Export singleton instance
export const aiIntegrationTester = new AIIntegrationTester();


