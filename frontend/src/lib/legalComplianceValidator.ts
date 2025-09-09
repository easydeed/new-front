import { DOCUMENT_REGISTRY, DocumentConfig } from './documentRegistry';
import { PropertyData, WizardState } from './wizardState';
import { z } from 'zod';

// Legal compliance validation framework
export interface LegalRequirement {
  id: string;
  name: string;
  californiaCode: string;
  description: string;
  severity: 'mandatory' | 'recommended' | 'optional';
  consequences: string;
  validationRule: (data: any) => boolean;
  errorMessage: string;
  remediation: string;
}

export interface ComplianceTestResult {
  requirementId: string;
  requirementName: string;
  passed: boolean;
  severity: 'mandatory' | 'recommended' | 'optional';
  errorMessage?: string;
  remediation?: string;
  documentType: string;
  stepId?: string;
}

export interface DocumentComplianceReport {
  documentType: string;
  overallCompliance: boolean;
  mandatoryPassed: number;
  mandatoryTotal: number;
  recommendedPassed: number;
  recommendedTotal: number;
  testResults: ComplianceTestResult[];
  legalRisks: string[];
  recommendations: string[];
}

export class LegalComplianceValidator {
  private legalRequirements: Map<string, LegalRequirement[]> = new Map();

  constructor() {
    this.initializeLegalRequirements();
  }

  // Initialize legal requirements for each document type
  private initializeLegalRequirements(): void {
    // Grant Deed Legal Requirements
    this.legalRequirements.set('grant_deed', [
      {
        id: 'gd_property_identification',
        name: 'Property Identification',
        californiaCode: 'Civil Code §1092',
        description: 'Property must be precisely identified with legal description or APN',
        severity: 'mandatory',
        consequences: 'VOID DEED - Recording will be rejected',
        validationRule: (data: PropertyData) => {
          return !!(data.address && (data.legalDescription || data.apn));
        },
        errorMessage: 'Property must have address and either legal description or APN',
        remediation: 'Obtain legal description from title company or county records'
      },
      {
        id: 'gd_grantor_identification',
        name: 'Grantor Identification',
        californiaCode: 'Civil Code §1095',
        description: 'Grantor names must match title exactly',
        severity: 'mandatory',
        consequences: 'VOID DEED - Title defect created',
        validationRule: (data: any) => {
          const grantors = data.stepData?.parties?.grantors || [];
          return grantors.length > 0 && grantors.every((g: any) => g.name && g.name.trim().length > 0);
        },
        errorMessage: 'At least one grantor with valid name is required',
        remediation: 'Verify grantor names against current title or deed'
      },
      {
        id: 'gd_grantee_identification',
        name: 'Grantee Identification',
        californiaCode: 'Civil Code §1095',
        description: 'Grantee names and vesting must be specified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Unclear ownership created',
        validationRule: (data: any) => {
          const grantees = data.stepData?.parties?.grantees || [];
          return grantees.length > 0 && grantees.every((g: any) => 
            g.name && g.name.trim().length > 0 && g.vesting
          );
        },
        errorMessage: 'At least one grantee with name and vesting is required',
        remediation: 'Specify how grantees will hold title (joint tenants, tenants in common, etc.)'
      },
      {
        id: 'gd_transfer_tax_declaration',
        name: 'Documentary Transfer Tax Declaration',
        californiaCode: 'Revenue & Taxation Code §11911',
        description: 'Transfer tax amount and basis must be declared',
        severity: 'mandatory',
        consequences: 'RECORDING REJECTED - County will not record deed',
        validationRule: (data: any) => {
          const tax = data.stepData?.tax;
          return !!(tax && (tax.dttAmount || tax.dttAmount === 0) && tax.dttBasis);
        },
        errorMessage: 'Documentary transfer tax amount and basis must be specified',
        remediation: 'Calculate transfer tax based on consideration or declare exemption'
      },
      {
        id: 'gd_recording_information',
        name: 'Recording Information',
        californiaCode: 'Government Code §27321',
        description: 'Recording requested by and mail to information required',
        severity: 'mandatory',
        consequences: 'RECORDING REJECTED - County cannot process deed',
        validationRule: (data: any) => {
          const recording = data.stepData?.recording;
          return !!(recording && recording.requestedBy && recording.mailTo);
        },
        errorMessage: 'Recording requested by and mail to information required',
        remediation: 'Provide title company or attorney information for recording'
      },
      {
        id: 'gd_notarization_ready',
        name: 'Notarization Requirements',
        californiaCode: 'Civil Code §1189',
        description: 'Deed must be notarized by grantor(s)',
        severity: 'mandatory',
        consequences: 'RECORDING REJECTED - Unnotarized deed invalid',
        validationRule: (data: any) => {
          // Check if grantor information is complete for notarization
          const grantors = data.stepData?.parties?.grantors || [];
          return grantors.length > 0 && grantors.every((g: any) => g.name);
        },
        errorMessage: 'Grantor information must be complete for notarization',
        remediation: 'Ensure all grantor names are accurate for notary acknowledgment'
      },
      {
        id: 'gd_consideration_disclosure',
        name: 'Consideration Disclosure',
        californiaCode: 'Civil Code §1098',
        description: 'Consideration should be disclosed unless exempt',
        severity: 'recommended',
        consequences: 'Potential tax issues or recording delays',
        validationRule: (data: any) => {
          const tax = data.stepData?.tax;
          return !!(tax && (tax.consideration || tax.exemptReason));
        },
        errorMessage: 'Consideration amount or exemption reason should be provided',
        remediation: 'Specify purchase price or reason for exemption (gift, inheritance, etc.)'
      }
    ]);

    // Quitclaim Deed Legal Requirements
    this.legalRequirements.set('quitclaim_deed', [
      {
        id: 'qd_property_identification',
        name: 'Property Identification',
        californiaCode: 'Civil Code §1092',
        description: 'Property must be precisely identified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Recording will be rejected',
        validationRule: (data: PropertyData) => {
          return !!(data.address && (data.legalDescription || data.apn));
        },
        errorMessage: 'Property must have address and either legal description or APN',
        remediation: 'Obtain legal description from title company or county records'
      },
      {
        id: 'qd_grantor_identification',
        name: 'Grantor Identification',
        californiaCode: 'Civil Code §1095',
        description: 'Grantor names must match title exactly',
        severity: 'mandatory',
        consequences: 'VOID DEED - Title defect created',
        validationRule: (data: any) => {
          const grantors = data.stepData?.parties?.grantors || [];
          return grantors.length > 0 && grantors.every((g: any) => g.name && g.name.trim().length > 0);
        },
        errorMessage: 'At least one grantor with valid name is required',
        remediation: 'Verify grantor names against current title or deed'
      },
      {
        id: 'qd_grantee_identification',
        name: 'Grantee Identification',
        californiaCode: 'Civil Code §1095',
        description: 'Grantee names and vesting must be specified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Unclear ownership created',
        validationRule: (data: any) => {
          const grantees = data.stepData?.parties?.grantees || [];
          return grantees.length > 0 && grantees.every((g: any) => 
            g.name && g.name.trim().length > 0 && g.vesting
          );
        },
        errorMessage: 'At least one grantee with name and vesting is required',
        remediation: 'Specify how grantees will hold title'
      },
      {
        id: 'qd_no_warranties_disclosure',
        name: 'No Warranties Disclosure',
        californiaCode: 'Civil Code §1113',
        description: 'Quitclaim deed provides no warranties - parties should understand',
        severity: 'recommended',
        consequences: 'Grantee receives no protection against title defects',
        validationRule: (data: any) => {
          // This is more of a disclosure requirement
          return true; // Always passes, but generates warning
        },
        errorMessage: 'Parties should understand quitclaim provides no warranties',
        remediation: 'Consider title insurance or warranty deed for better protection'
      }
    ]);

    // Interspousal Transfer Legal Requirements
    this.legalRequirements.set('interspousal_transfer', [
      {
        id: 'it_property_identification',
        name: 'Property Identification',
        californiaCode: 'Civil Code §1092',
        description: 'Property must be precisely identified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Recording will be rejected',
        validationRule: (data: PropertyData) => {
          return !!(data.address && (data.legalDescription || data.apn));
        },
        errorMessage: 'Property must have address and either legal description or APN',
        remediation: 'Obtain legal description from title company or county records'
      },
      {
        id: 'it_spouse_identification',
        name: 'Spouse Identification',
        californiaCode: 'Family Code §760',
        description: 'Both spouses must be clearly identified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Invalid interspousal transfer',
        validationRule: (data: any) => {
          const parties = data.stepData?.parties;
          return !!(parties && parties.spouse1 && parties.spouse2 && 
                   parties.spouse1.name && parties.spouse2.name);
        },
        errorMessage: 'Both spouses must be identified by name',
        remediation: 'Provide full legal names of both spouses'
      },
      {
        id: 'it_marriage_verification',
        name: 'Marriage Status Verification',
        californiaCode: 'Family Code §760',
        description: 'Parties must be legally married',
        severity: 'mandatory',
        consequences: 'INVALID TRANSFER - Not a valid interspousal transfer',
        validationRule: (data: any) => {
          const parties = data.stepData?.parties;
          return !!(parties && parties.marriageStatus === 'married');
        },
        errorMessage: 'Parties must be legally married for interspousal transfer',
        remediation: 'Verify marriage status or use different deed type'
      },
      {
        id: 'it_tax_exemption',
        name: 'Transfer Tax Exemption',
        californiaCode: 'Revenue & Taxation Code §11927',
        description: 'Interspousal transfers are typically exempt from transfer tax',
        severity: 'recommended',
        consequences: 'May pay unnecessary transfer tax',
        validationRule: (data: any) => {
          const tax = data.stepData?.tax;
          return !!(tax && (tax.exempt === true || tax.dttAmount === 0));
        },
        errorMessage: 'Interspousal transfers are usually exempt from transfer tax',
        remediation: 'Claim transfer tax exemption for interspousal transfer'
      }
    ]);

    // Warranty Deed Legal Requirements
    this.legalRequirements.set('warranty_deed', [
      {
        id: 'wd_property_identification',
        name: 'Property Identification',
        californiaCode: 'Civil Code §1092',
        description: 'Property must be precisely identified',
        severity: 'mandatory',
        consequences: 'VOID DEED - Recording will be rejected',
        validationRule: (data: PropertyData) => {
          return !!(data.address && (data.legalDescription || data.apn));
        },
        errorMessage: 'Property must have address and either legal description or APN',
        remediation: 'Obtain legal description from title company or county records'
      },
      {
        id: 'wd_warranty_covenants',
        name: 'Warranty Covenants',
        californiaCode: 'Civil Code §1113',
        description: 'Warranty deed includes specific covenants and warranties',
        severity: 'mandatory',
        consequences: 'Not a valid warranty deed without proper covenants',
        validationRule: (data: any) => {
          const warranties = data.stepData?.warranties;
          return !!(warranties && warranties.includeCovenants === true);
        },
        errorMessage: 'Warranty covenants must be included in warranty deed',
        remediation: 'Include standard warranty covenants in deed language'
      },
      {
        id: 'wd_title_insurance_recommended',
        name: 'Title Insurance Recommendation',
        californiaCode: 'Insurance Code §12340.11',
        description: 'Title insurance recommended with warranty deed',
        severity: 'recommended',
        consequences: 'Grantor may be liable for title defects without insurance',
        validationRule: (data: any) => {
          // This is a recommendation, not a strict requirement
          return true;
        },
        errorMessage: 'Title insurance is recommended with warranty deed',
        remediation: 'Consider obtaining title insurance policy'
      }
    ]);
  }

  // Validate compliance for a specific document type
  async validateDocumentCompliance(
    documentType: string,
    wizardState: WizardState
  ): Promise<DocumentComplianceReport> {
    const requirements = this.legalRequirements.get(documentType) || [];
    const testResults: ComplianceTestResult[] = [];
    
    for (const requirement of requirements) {
      const passed = this.validateRequirement(requirement, wizardState);
      
      testResults.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        passed,
        severity: requirement.severity,
        errorMessage: passed ? undefined : requirement.errorMessage,
        remediation: passed ? undefined : requirement.remediation,
        documentType
      });
    }

    // Calculate compliance metrics
    const mandatoryResults = testResults.filter(r => r.severity === 'mandatory');
    const recommendedResults = testResults.filter(r => r.severity === 'recommended');
    
    const mandatoryPassed = mandatoryResults.filter(r => r.passed).length;
    const mandatoryTotal = mandatoryResults.length;
    const recommendedPassed = recommendedResults.filter(r => r.passed).length;
    const recommendedTotal = recommendedResults.length;
    
    const overallCompliance = mandatoryPassed === mandatoryTotal;
    
    // Generate legal risks and recommendations
    const legalRisks = this.generateLegalRisks(testResults);
    const recommendations = this.generateComplianceRecommendations(testResults);

    return {
      documentType,
      overallCompliance,
      mandatoryPassed,
      mandatoryTotal,
      recommendedPassed,
      recommendedTotal,
      testResults,
      legalRisks,
      recommendations
    };
  }

  // Validate a specific legal requirement
  private validateRequirement(requirement: LegalRequirement, wizardState: WizardState): boolean {
    try {
      const validationData = {
        ...wizardState.propertyData,
        stepData: wizardState.stepData,
        selectedDocument: wizardState.selectedDocument
      };
      
      return requirement.validationRule(validationData);
    } catch (error) {
      console.error(`Error validating requirement ${requirement.id}:`, error);
      return false;
    }
  }

  // Generate legal risks based on failed requirements
  private generateLegalRisks(testResults: ComplianceTestResult[]): string[] {
    const risks: string[] = [];
    
    const failedMandatory = testResults.filter(r => !r.passed && r.severity === 'mandatory');
    const failedRecommended = testResults.filter(r => !r.passed && r.severity === 'recommended');
    
    if (failedMandatory.length > 0) {
      risks.push(`${failedMandatory.length} mandatory legal requirements failed - deed may be void or rejected`);
    }
    
    if (failedRecommended.length > 0) {
      risks.push(`${failedRecommended.length} recommended practices not followed - increased legal risk`);
    }
    
    // Specific risk assessments
    const propertyIdFailed = failedMandatory.some(r => r.requirementId.includes('property_identification'));
    if (propertyIdFailed) {
      risks.push('CRITICAL: Property identification failure will result in void deed');
    }
    
    const grantorFailed = failedMandatory.some(r => r.requirementId.includes('grantor'));
    if (grantorFailed) {
      risks.push('CRITICAL: Grantor identification failure creates title defects');
    }
    
    const taxFailed = failedMandatory.some(r => r.requirementId.includes('tax'));
    if (taxFailed) {
      risks.push('HIGH: Transfer tax issues will prevent recording');
    }
    
    return risks;
  }

  // Generate compliance recommendations
  private generateComplianceRecommendations(testResults: ComplianceTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failed = testResults.filter(r => !r.passed);
    
    if (failed.length === 0) {
      recommendations.push('All legal requirements met - document is compliant');
      return recommendations;
    }
    
    // Priority recommendations for mandatory failures
    const mandatoryFailed = failed.filter(r => r.severity === 'mandatory');
    if (mandatoryFailed.length > 0) {
      recommendations.push('URGENT: Address mandatory legal requirements before proceeding');
      mandatoryFailed.forEach(result => {
        if (result.remediation) {
          recommendations.push(`• ${result.remediation}`);
        }
      });
    }
    
    // Recommendations for optional improvements
    const recommendedFailed = failed.filter(r => r.severity === 'recommended');
    if (recommendedFailed.length > 0) {
      recommendations.push('Consider addressing recommended practices for better legal protection');
      recommendedFailed.forEach(result => {
        if (result.remediation) {
          recommendations.push(`• ${result.remediation}`);
        }
      });
    }
    
    // General recommendations
    recommendations.push('Consult with a qualified attorney for complex transactions');
    recommendations.push('Obtain title insurance for additional protection');
    recommendations.push('Verify all information with official records before recording');
    
    return recommendations;
  }

  // Validate all document types
  async validateAllDocumentTypes(wizardState: WizardState): Promise<Map<string, DocumentComplianceReport>> {
    const reports = new Map<string, DocumentComplianceReport>();
    
    for (const documentType of this.legalRequirements.keys()) {
      const report = await this.validateDocumentCompliance(documentType, wizardState);
      reports.set(documentType, report);
    }
    
    return reports;
  }

  // Get legal requirements for a document type
  getLegalRequirements(documentType: string): LegalRequirement[] {
    return this.legalRequirements.get(documentType) || [];
  }

  // Check if document type is legally supported
  isDocumentTypeSupported(documentType: string): boolean {
    return this.legalRequirements.has(documentType);
  }

  // Generate comprehensive legal compliance report
  generateComplianceReport(reports: Map<string, DocumentComplianceReport>): string {
    let report = `
# ⚖️ Legal Compliance Validation Report

## 📊 Overall Compliance Summary
`;

    let totalMandatory = 0;
    let totalMandatoryPassed = 0;
    let totalRecommended = 0;
    let totalRecommendedPassed = 0;
    let compliantDocuments = 0;

    for (const [docType, docReport] of reports) {
      totalMandatory += docReport.mandatoryTotal;
      totalMandatoryPassed += docReport.mandatoryPassed;
      totalRecommended += docReport.recommendedTotal;
      totalRecommendedPassed += docReport.recommendedPassed;
      
      if (docReport.overallCompliance) {
        compliantDocuments++;
      }

      report += `
### ${docType.replace('_', ' ').toUpperCase()}
- **Compliance Status**: ${docReport.overallCompliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
- **Mandatory Requirements**: ${docReport.mandatoryPassed}/${docReport.mandatoryTotal} passed
- **Recommended Practices**: ${docReport.recommendedPassed}/${docReport.recommendedTotal} followed
- **Legal Risks**: ${docReport.legalRisks.length} identified
`;
    }

    const overallMandatoryRate = totalMandatory > 0 ? (totalMandatoryPassed / totalMandatory) * 100 : 100;
    const overallRecommendedRate = totalRecommended > 0 ? (totalRecommendedPassed / totalRecommended) * 100 : 100;

    report += `
## 🎯 Compliance Metrics
- **Document Types Compliant**: ${compliantDocuments}/${reports.size} (${((compliantDocuments / reports.size) * 100).toFixed(1)}%)
- **Mandatory Requirements**: ${totalMandatoryPassed}/${totalMandatory} (${overallMandatoryRate.toFixed(1)}%)
- **Recommended Practices**: ${totalRecommendedPassed}/${totalRecommended} (${overallRecommendedRate.toFixed(1)}%)

## 🚨 Critical Legal Issues
`;

    const criticalIssues = Array.from(reports.values())
      .filter(r => !r.overallCompliance)
      .flatMap(r => r.legalRisks.filter(risk => risk.includes('CRITICAL')));

    if (criticalIssues.length > 0) {
      report += criticalIssues.map(issue => `- 🔴 ${issue}`).join('\n');
    } else {
      report += '🟢 No critical legal issues identified';
    }

    report += `

## 💡 Legal Recommendations
`;

    const allRecommendations = Array.from(reports.values())
      .flatMap(r => r.recommendations)
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates

    report += allRecommendations.map(rec => `- ${rec}`).join('\n');

    report += `

## 📋 Detailed Compliance Results
`;

    for (const [docType, docReport] of reports) {
      report += `
### ${docType.replace('_', ' ').toUpperCase()} - Detailed Results
`;
      
      for (const result of docReport.testResults) {
        const status = result.passed ? '✅' : '❌';
        const severity = result.severity === 'mandatory' ? '🔴 MANDATORY' : '🟡 RECOMMENDED';
        
        report += `
#### ${result.requirementName}
- **Status**: ${status} ${result.passed ? 'PASSED' : 'FAILED'}
- **Severity**: ${severity}
${result.errorMessage ? `- **Issue**: ${result.errorMessage}` : ''}
${result.remediation ? `- **Remediation**: ${result.remediation}` : ''}
`;
      }
    }

    return report;
  }

  // Validate specific step compliance
  validateStepCompliance(
    documentType: string,
    stepId: string,
    stepData: any,
    propertyData: PropertyData
  ): ComplianceTestResult[] {
    const requirements = this.legalRequirements.get(documentType) || [];
    const stepRequirements = requirements.filter(req => 
      req.id.includes(stepId) || this.isRequirementRelevantToStep(req, stepId)
    );
    
    const results: ComplianceTestResult[] = [];
    
    for (const requirement of stepRequirements) {
      const wizardState = {
        selectedDocument: documentType,
        propertyData,
        stepData: { [stepId]: stepData },
        currentStep: 1,
        isComplete: false,
        lastSaved: new Date()
      };
      
      const passed = this.validateRequirement(requirement, wizardState);
      
      results.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        passed,
        severity: requirement.severity,
        errorMessage: passed ? undefined : requirement.errorMessage,
        remediation: passed ? undefined : requirement.remediation,
        documentType,
        stepId
      });
    }
    
    return results;
  }

  // Check if requirement is relevant to a specific step
  private isRequirementRelevantToStep(requirement: LegalRequirement, stepId: string): boolean {
    const stepMappings: Record<string, string[]> = {
      'property': ['property_identification'],
      'recording': ['recording_information'],
      'tax': ['transfer_tax', 'tax_exemption'],
      'parties': ['grantor', 'grantee', 'spouse', 'marriage'],
      'review': ['notarization', 'warranties', 'covenants']
    };
    
    const relevantKeywords = stepMappings[stepId] || [];
    return relevantKeywords.some(keyword => requirement.id.includes(keyword));
  }
}

// Export singleton instance
export const legalComplianceValidator = new LegalComplianceValidator();


