#!/usr/bin/env node

/**
 * Phase 1.3 Foundation Validation Script
 * 
 * This script runs comprehensive validation of the Phase 1 foundation
 * including AI integration, performance, error recovery, legal compliance,
 * and user experience testing.
 * 
 * Usage:
 *   npm run validate:phase1-3
 *   or
 *   node frontend/src/scripts/runPhase1-3Validation.js
 */

import { phase1_3TestRunner } from '../lib/phase1-3-testRunner';

async function main() {
  console.log('🚀 Starting Phase 1.3 Foundation Validation');
  console.log('==========================================\n');

  try {
    // Run comprehensive validation
    const results = await phase1_3TestRunner.runComprehensiveValidation();
    
    // Generate and display report
    console.log('\n📊 VALIDATION COMPLETE - GENERATING REPORT...\n');
    const report = phase1_3TestRunner.generateComprehensiveReport();
    console.log(report);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 PHASE 1.3 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Overall Status: ${results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Overall Score: ${results.overall.overallScore.toFixed(1)}/100`);
    console.log(`Production Ready: ${results.overall.readyForProduction ? '✅ YES' : '❌ NO'}`);
    console.log(`Critical Issues: ${results.overall.criticalIssues.length}`);
    
    console.log('\nComponent Results:');
    console.log(`  🧪 AI Integration: ${results.aiIntegration.passed ? '✅' : '❌'} (${results.aiIntegration.score.toFixed(1)}%)`);
    console.log(`  📈 Performance: ${results.performance.passed ? '✅' : '❌'}`);
    console.log(`  🛡️ Error Recovery: ${results.errorRecovery.passed ? '✅' : '❌'} (${results.errorRecovery.successRate.toFixed(1)}%)`);
    console.log(`  ⚖️ Legal Compliance: ${results.legalCompliance.passed ? '✅' : '❌'} (${results.legalCompliance.complianceRate.toFixed(1)}%)`);
    console.log(`  🎯 User Experience: ${results.userExperience.passed ? '✅' : '❌'} (${results.userExperience.usabilityScore.toFixed(1)}/5)`);
    
    if (results.overall.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      results.overall.criticalIssues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    results.overall.nextSteps.forEach(step => {
      console.log(`  ${step}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (results.overall.readyForProduction) {
      console.log('🎉 PHASE 1 FOUNDATION COMPLETE!');
      console.log('Ready to proceed to Phase 2: Advanced AI Services');
      process.exit(0);
    } else {
      console.log('⚠️ PHASE 1 FOUNDATION NEEDS ATTENTION');
      console.log('Address critical issues before proceeding to Phase 2');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Phase 1.3 Validation Failed:', error);
    console.error('\nPlease fix the errors and try again.');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runPhase1_3Validation };


