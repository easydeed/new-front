import { aiIntegrationTester } from './aiIntegrationTesting';
import { performanceOptimizer } from './performanceOptimization';
import { errorRecoveryValidator } from './errorRecoveryValidation';
import { legalComplianceValidator } from './legalComplianceValidator';
import { userExperienceValidator } from './userExperienceValidator';
import { WizardStateManager } from './wizardState';

// Phase 1.3 comprehensive test runner and validation orchestrator
export interface Phase1_3TestResults {
  aiIntegration: {
    passed: boolean;
    score: number;
    testCount: number;
    recommendations: string[];
  };
  performance: {
    passed: boolean;
    metrics: any;
    recommendations: string[];
  };
  errorRecovery: {
    passed: boolean;
    successRate: number;
    criticalIssues: number;
    recommendations: string[];
  };
  legalCompliance: {
    passed: boolean;
    complianceRate: number;
    mandatoryFailures: number;
    recommendations: string[];
  };
  userExperience: {
    passed: boolean;
    usabilityScore: number;
    completionRate: number;
    recommendations: string[];
  };
  overall: {
    passed: boolean;
    overallScore: number;
    readyForProduction: boolean;
    criticalIssues: string[];
    nextSteps: string[];
  };
}

export class Phase1_3TestRunner {
  private stateManager: WizardStateManager;
  private testResults: Phase1_3TestResults | null = null;

  constructor() {
    this.stateManager = new WizardStateManager();
  }

  // Run comprehensive Phase 1.3 validation
  async runComprehensiveValidation(): Promise<Phase1_3TestResults> {
    console.log('🚀 Starting Phase 1.3 Comprehensive Validation...');
    console.log('This will test AI integration, performance, error recovery, legal compliance, and user experience.');

    const startTime = Date.now();

    try {
      // Initialize performance monitoring
      await performanceOptimizer.preloadCommonData();

      // 1. AI Integration Testing
      console.log('\n🧪 Running AI Integration Tests...');
      const aiResults = await this.runAIIntegrationTests();

      // 2. Performance Optimization Testing
      console.log('\n📈 Running Performance Tests...');
      const performanceResults = await this.runPerformanceTests();

      // 3. Error Recovery Validation
      console.log('\n🛡️ Running Error Recovery Tests...');
      const errorRecoveryResults = await this.runErrorRecoveryTests();

      // 4. Legal Compliance Validation
      console.log('\n⚖️ Running Legal Compliance Tests...');
      const legalComplianceResults = await this.runLegalComplianceTests();

      // 5. User Experience Testing
      console.log('\n🎯 Running User Experience Tests...');
      const uxResults = await this.runUserExperienceTests();

      // 6. Overall Assessment
      console.log('\n📊 Calculating Overall Assessment...');
      const overallResults = this.calculateOverallResults({
        aiResults,
        performanceResults,
        errorRecoveryResults,
        legalComplianceResults,
        uxResults
      });

      const totalDuration = Date.now() - startTime;
      console.log(`\n✅ Phase 1.3 Validation Complete in ${(totalDuration / 1000).toFixed(1)}s`);

      this.testResults = {
        aiIntegration: aiResults,
        performance: performanceResults,
        errorRecovery: errorRecoveryResults,
        legalCompliance: legalComplianceResults,
        userExperience: uxResults,
        overall: overallResults
      };

      return this.testResults;

    } catch (error) {
      console.error('❌ Phase 1.3 Validation Failed:', error);
      throw new Error(`Phase 1.3 validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Run AI integration tests
  private async runAIIntegrationTests(): Promise<Phase1_3TestResults['aiIntegration']> {
    try {
      const testSuites = await aiIntegrationTester.runComprehensiveTests();
      const comprehensiveResults = testSuites.get('comprehensive');
      
      if (!comprehensiveResults) {
        throw new Error('No comprehensive AI test results available');
      }

      const passedTests = comprehensiveResults.testResults.filter(r => r.passed).length;
      const totalTests = comprehensiveResults.testResults.length;
      const score = (passedTests / totalTests) * 100;
      const passed = score >= 80; // 80% pass rate required

      return {
        passed,
        score,
        testCount: totalTests,
        recommendations: comprehensiveResults.recommendations
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        testCount: 0,
        recommendations: ['Fix AI integration system errors', 'Implement proper error handling']
      };
    }
  }

  // Run performance tests
  private async runPerformanceTests(): Promise<Phase1_3TestResults['performance']> {
    try {
      // Run performance optimization
      performanceOptimizer.optimizeCache();
      
      const metrics = performanceOptimizer.getMetrics();
      
      // Performance criteria
      const cacheHitRateOK = metrics.cacheHitRate >= 60;
      const avgResponseTimeOK = metrics.averageResponseTime <= 2000; // 2 seconds
      const errorRateOK = metrics.errorRate <= 0.1; // 10%
      const p95ResponseTimeOK = metrics.p95ResponseTime <= 5000; // 5 seconds

      const passed = cacheHitRateOK && avgResponseTimeOK && errorRateOK && p95ResponseTimeOK;

      const recommendations: string[] = [];
      if (!cacheHitRateOK) recommendations.push('Improve cache hit rate (target: >60%)');
      if (!avgResponseTimeOK) recommendations.push('Reduce average response time (target: <2s)');
      if (!errorRateOK) recommendations.push('Reduce error rate (target: <10%)');
      if (!p95ResponseTimeOK) recommendations.push('Optimize 95th percentile response time (target: <5s)');

      if (recommendations.length === 0) {
        recommendations.push('Performance is optimal - continue monitoring');
      }

      return {
        passed,
        metrics,
        recommendations
      };
    } catch (error) {
      return {
        passed: false,
        metrics: {},
        recommendations: ['Fix performance monitoring system', 'Implement proper metrics collection']
      };
    }
  }

  // Run error recovery tests
  private async runErrorRecoveryTests(): Promise<Phase1_3TestResults['errorRecovery']> {
    try {
      const recoveryResults = await errorRecoveryValidator.runAllErrorRecoveryTests();
      
      const passedTests = recoveryResults.filter(r => r.passed).length;
      const totalTests = recoveryResults.length;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      
      const criticalIssues = recoveryResults.filter(r => 
        r.dataLoss || r.userExperienceImpact === 'severe'
      ).length;
      
      const passed = successRate >= 70 && criticalIssues === 0; // 70% success rate, no critical issues

      const recommendations = [
        ...new Set(recoveryResults.flatMap(r => r.recommendations))
      ].slice(0, 5); // Top 5 unique recommendations

      return {
        passed,
        successRate,
        criticalIssues,
        recommendations
      };
    } catch (error) {
      return {
        passed: false,
        successRate: 0,
        criticalIssues: 1,
        recommendations: ['Fix error recovery validation system', 'Implement proper error handling']
      };
    }
  }

  // Run legal compliance tests
  private async runLegalComplianceTests(): Promise<Phase1_3TestResults['legalCompliance']> {
    try {
      // Create test wizard state with sample data
      const testState = {
        selectedDocument: 'grant_deed',
        propertyData: {
          address: '123 Main St, Los Angeles, CA 90210',
          apn: '123-456-789',
          county: 'Los Angeles',
          legalDescription: 'Lot 1, Block 2, Tract 12345',
          currentOwners: [{ name: 'Test Owner' }]
        },
        stepData: {
          recording: {
            requestedBy: 'Test Title Company',
            mailTo: 'Test Address'
          },
          tax: {
            dttAmount: '1000',
            dttBasis: 'full_consideration'
          },
          parties: {
            grantors: [{ name: 'Test Grantor' }],
            grantees: [{ name: 'Test Grantee', vesting: 'sole and separate' }]
          }
        },
        currentStep: 1,
        isComplete: false,
        lastSaved: new Date()
      };

      const complianceReports = await legalComplianceValidator.validateAllDocumentTypes(testState);
      
      let totalMandatory = 0;
      let totalMandatoryPassed = 0;
      let mandatoryFailures = 0;

      for (const report of complianceReports.values()) {
        totalMandatory += report.mandatoryTotal;
        totalMandatoryPassed += report.mandatoryPassed;
        mandatoryFailures += (report.mandatoryTotal - report.mandatoryPassed);
      }

      const complianceRate = totalMandatory > 0 ? (totalMandatoryPassed / totalMandatory) * 100 : 100;
      const passed = complianceRate >= 90 && mandatoryFailures === 0; // 90% compliance, no mandatory failures

      const recommendations = Array.from(complianceReports.values())
        .flatMap(r => r.recommendations)
        .filter((rec, index, arr) => arr.indexOf(rec) === index) // Remove duplicates
        .slice(0, 5); // Top 5 recommendations

      return {
        passed,
        complianceRate,
        mandatoryFailures,
        recommendations
      };
    } catch (error) {
      return {
        passed: false,
        complianceRate: 0,
        mandatoryFailures: 1,
        recommendations: ['Fix legal compliance validation system', 'Implement proper legal requirement checks']
      };
    }
  }

  // Run user experience tests
  private async runUserExperienceTests(): Promise<Phase1_3TestResults['userExperience']> {
    try {
      const uxResults = await userExperienceValidator.runAllUXTests();
      
      const allResults = Array.from(uxResults.values());
      const passedJourneys = allResults.filter(r => r.passed).length;
      const totalJourneys = allResults.length;
      
      const avgUsabilityScore = totalJourneys > 0 ? 
        allResults.reduce((sum, r) => sum + r.usabilityScore, 0) / totalJourneys : 0;
      
      const avgCompletionRate = totalJourneys > 0 ?
        allResults.reduce((sum, r) => sum + r.completionRate, 0) / totalJourneys : 0;

      const passed = (passedJourneys / totalJourneys) >= 0.8 && avgUsabilityScore >= 3.5; // 80% journey success, 3.5+ usability

      const recommendations = allResults
        .flatMap(r => r.recommendations)
        .filter((rec, index, arr) => arr.indexOf(rec) === index) // Remove duplicates
        .slice(0, 5); // Top 5 recommendations

      return {
        passed,
        usabilityScore: avgUsabilityScore,
        completionRate: avgCompletionRate * 100,
        recommendations
      };
    } catch (error) {
      return {
        passed: false,
        usabilityScore: 0,
        completionRate: 0,
        recommendations: ['Fix user experience validation system', 'Implement proper UX testing']
      };
    }
  }

  // Calculate overall results
  private calculateOverallResults(results: {
    aiResults: Phase1_3TestResults['aiIntegration'];
    performanceResults: Phase1_3TestResults['performance'];
    errorRecoveryResults: Phase1_3TestResults['errorRecovery'];
    legalComplianceResults: Phase1_3TestResults['legalCompliance'];
    uxResults: Phase1_3TestResults['userExperience'];
  }): Phase1_3TestResults['overall'] {
    
    const { aiResults, performanceResults, errorRecoveryResults, legalComplianceResults, uxResults } = results;
    
    // Calculate weighted overall score
    const weights = {
      ai: 0.2,           // 20% - AI functionality
      performance: 0.15,  // 15% - Performance
      errorRecovery: 0.25, // 25% - Error recovery (critical)
      legalCompliance: 0.3, // 30% - Legal compliance (most critical)
      ux: 0.1            // 10% - User experience
    };

    const scores = {
      ai: aiResults.score,
      performance: performanceResults.passed ? 100 : 50,
      errorRecovery: errorRecoveryResults.successRate,
      legalCompliance: legalComplianceResults.complianceRate,
      ux: uxResults.usabilityScore * 20 // Convert 5-point scale to 100-point scale
    };

    const overallScore = 
      scores.ai * weights.ai +
      scores.performance * weights.performance +
      scores.errorRecovery * weights.errorRecovery +
      scores.legalCompliance * weights.legalCompliance +
      scores.ux * weights.ux;

    // Determine if all critical systems pass
    const allCriticalPass = 
      legalComplianceResults.passed && // Legal compliance is mandatory
      errorRecoveryResults.criticalIssues === 0 && // No critical error recovery issues
      aiResults.score >= 70; // Minimum AI functionality

    const passed = allCriticalPass && overallScore >= 80;

    // Identify critical issues
    const criticalIssues: string[] = [];
    
    if (!legalComplianceResults.passed) {
      criticalIssues.push('Legal compliance failures - system not legally compliant');
    }
    
    if (errorRecoveryResults.criticalIssues > 0) {
      criticalIssues.push('Critical error recovery issues - data loss risk');
    }
    
    if (aiResults.score < 50) {
      criticalIssues.push('AI integration severely compromised');
    }
    
    if (!performanceResults.passed) {
      criticalIssues.push('Performance issues affecting user experience');
    }

    // Determine production readiness
    const readyForProduction = passed && criticalIssues.length === 0 && overallScore >= 85;

    // Generate next steps
    const nextSteps: string[] = [];
    
    if (readyForProduction) {
      nextSteps.push('✅ Phase 1.3 Complete - Ready for Phase 2: Advanced AI Services');
      nextSteps.push('Begin Phase 2.1: Natural Language Interface Implementation');
      nextSteps.push('Continue monitoring all systems in production');
    } else {
      if (criticalIssues.length > 0) {
        nextSteps.push('🚨 Address critical issues before proceeding');
        nextSteps.push('Re-run Phase 1.3 validation after fixes');
      }
      
      if (!aiResults.passed) {
        nextSteps.push('Fix AI integration issues');
      }
      
      if (!performanceResults.passed) {
        nextSteps.push('Optimize system performance');
      }
      
      if (!legalComplianceResults.passed) {
        nextSteps.push('Address legal compliance failures (MANDATORY)');
      }
      
      if (!uxResults.passed) {
        nextSteps.push('Improve user experience based on test results');
      }
    }

    return {
      passed,
      overallScore,
      readyForProduction,
      criticalIssues,
      nextSteps
    };
  }

  // Generate comprehensive Phase 1.3 report
  generateComprehensiveReport(): string {
    if (!this.testResults) {
      return 'No test results available. Run comprehensive validation first.';
    }

    const results = this.testResults;
    
    return `
# 🚀 Phase 1.3 Foundation Validation Report

## 📊 Executive Summary

### Overall Status: ${results.overall.passed ? '✅ PASSED' : '❌ FAILED'}
- **Overall Score**: ${results.overall.overallScore.toFixed(1)}/100
- **Production Ready**: ${results.overall.readyForProduction ? '✅ YES' : '❌ NO'}
- **Critical Issues**: ${results.overall.criticalIssues.length}

---

## 🎯 Component Results

### 🧪 AI Integration Testing
- **Status**: ${results.aiIntegration.passed ? '✅ PASSED' : '❌ FAILED'}
- **Score**: ${results.aiIntegration.score.toFixed(1)}%
- **Tests Run**: ${results.aiIntegration.testCount}
- **Top Recommendations**:
${results.aiIntegration.recommendations.slice(0, 3).map(r => `  - ${r}`).join('\n')}

### 📈 Performance Optimization
- **Status**: ${results.performance.passed ? '✅ PASSED' : '❌ FAILED'}
- **Cache Hit Rate**: ${results.performance.metrics.cacheHitRate?.toFixed(1) || 'N/A'}%
- **Avg Response Time**: ${results.performance.metrics.averageResponseTime?.toFixed(0) || 'N/A'}ms
- **Error Rate**: ${((results.performance.metrics.errorRate || 0) * 100).toFixed(2)}%
- **Top Recommendations**:
${results.performance.recommendations.slice(0, 3).map(r => `  - ${r}`).join('\n')}

### 🛡️ Error Recovery Validation
- **Status**: ${results.errorRecovery.passed ? '✅ PASSED' : '❌ FAILED'}
- **Success Rate**: ${results.errorRecovery.successRate.toFixed(1)}%
- **Critical Issues**: ${results.errorRecovery.criticalIssues}
- **Top Recommendations**:
${results.errorRecovery.recommendations.slice(0, 3).map(r => `  - ${r}`).join('\n')}

### ⚖️ Legal Compliance Validation
- **Status**: ${results.legalCompliance.passed ? '✅ PASSED' : '❌ FAILED'}
- **Compliance Rate**: ${results.legalCompliance.complianceRate.toFixed(1)}%
- **Mandatory Failures**: ${results.legalCompliance.mandatoryFailures}
- **Top Recommendations**:
${results.legalCompliance.recommendations.slice(0, 3).map(r => `  - ${r}`).join('\n')}

### 🎯 User Experience Testing
- **Status**: ${results.userExperience.passed ? '✅ PASSED' : '❌ FAILED'}
- **Usability Score**: ${results.userExperience.usabilityScore.toFixed(1)}/5.0
- **Completion Rate**: ${results.userExperience.completionRate.toFixed(1)}%
- **Top Recommendations**:
${results.userExperience.recommendations.slice(0, 3).map(r => `  - ${r}`).join('\n')}

---

## 🚨 Critical Issues

${results.overall.criticalIssues.length > 0 ? 
  results.overall.criticalIssues.map(issue => `- 🔴 ${issue}`).join('\n') :
  '🟢 No critical issues identified'
}

---

## 📋 Next Steps

${results.overall.nextSteps.map(step => `${step.startsWith('✅') || step.startsWith('🚨') ? step : `- ${step}`}`).join('\n')}

---

## 📈 Success Metrics Achieved

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| AI Integration Score | ≥80% | ${results.aiIntegration.score.toFixed(1)}% | ${results.aiIntegration.score >= 80 ? '✅' : '❌'} |
| Performance (Avg Response) | ≤2000ms | ${results.performance.metrics.averageResponseTime?.toFixed(0) || 'N/A'}ms | ${(results.performance.metrics.averageResponseTime || 3000) <= 2000 ? '✅' : '❌'} |
| Error Recovery Rate | ≥70% | ${results.errorRecovery.successRate.toFixed(1)}% | ${results.errorRecovery.successRate >= 70 ? '✅' : '❌'} |
| Legal Compliance | ≥90% | ${results.legalCompliance.complianceRate.toFixed(1)}% | ${results.legalCompliance.complianceRate >= 90 ? '✅' : '❌'} |
| User Experience | ≥3.5/5 | ${results.userExperience.usabilityScore.toFixed(1)}/5 | ${results.userExperience.usabilityScore >= 3.5 ? '✅' : '❌'} |
| Overall Score | ≥80 | ${results.overall.overallScore.toFixed(1)} | ${results.overall.overallScore >= 80 ? '✅' : '❌'} |

---

## 🎉 Phase 1 Foundation Status

${results.overall.readyForProduction ? `
### ✅ FOUNDATION COMPLETE!

The Phase 1 foundation is **COMPLETE** and **PRODUCTION READY**:

- ✅ Dynamic document registry implemented
- ✅ Unified state management operational  
- ✅ AI integration functional across all document types
- ✅ Performance optimized with caching
- ✅ Error recovery mechanisms validated
- ✅ Legal compliance verified
- ✅ User experience meets standards

**🚀 Ready to proceed to Phase 2: Advanced AI Services**

` : `
### ⚠️ FOUNDATION NEEDS ATTENTION

The Phase 1 foundation requires additional work before proceeding to Phase 2:

${results.overall.criticalIssues.map(issue => `- 🔴 ${issue}`).join('\n')}

**📋 Complete these items before Phase 2:**
${results.overall.nextSteps.filter(step => step.includes('Fix') || step.includes('Address')).map(step => `- ${step}`).join('\n')}
`}

---

*Report generated on ${new Date().toLocaleString()}*
*Phase 1.3 Foundation Validation Complete*
`;
  }

  // Get test results
  getTestResults(): Phase1_3TestResults | null {
    return this.testResults;
  }

  // Clear test results
  clearTestResults(): void {
    this.testResults = null;
    aiIntegrationTester.clearTestResults();
    errorRecoveryValidator.clearTestResults();
    userExperienceValidator.clearTestResults();
    performanceOptimizer.clearCache();
  }
}

// Export singleton instance
export const phase1_3TestRunner = new Phase1_3TestRunner();


