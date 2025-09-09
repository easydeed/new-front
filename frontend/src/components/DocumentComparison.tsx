import React, { useState, useEffect, useMemo } from 'react';
import { DocumentData, PropertyData } from '../lib/wizardState';
import { LegalValidationEngine, ValidationResult } from '../lib/legalValidationEngine';
import { DOCUMENT_REGISTRY } from '../lib/documentRegistry';

interface DocumentComparisonProps {
  documents: DocumentData[];
  onSelectDocument?: (document: DocumentData) => void;
  onExport?: (comparisonData: ComparisonResult) => void;
  className?: string;
}

interface ComparisonResult {
  documents: DocumentData[];
  differences: DocumentDifference[];
  legalAnalysis: LegalAnalysis;
  recommendations: ComparisonRecommendation[];
  riskAssessment: ComparisonRiskAssessment;
  exportedAt: Date;
}

interface DocumentDifference {
  field: string;
  fieldName: string;
  values: Array<{ documentId: string; value: any; displayValue: string }>;
  differenceType: 'value' | 'missing' | 'format' | 'legal_significance';
  significance: 'critical' | 'high' | 'medium' | 'low';
  legalImplications?: string;
  recommendation?: string;
}

interface LegalAnalysis {
  complianceComparison: Array<{ documentId: string; complianceScore: number; issues: string[] }>;
  legalRisks: Array<{ risk: string; affectedDocuments: string[]; severity: 'high' | 'medium' | 'low' }>;
  bestPractices: string[];
}

interface ComparisonRecommendation {
  type: 'use_document' | 'merge_fields' | 'legal_review' | 'additional_info';
  title: string;
  description: string;
  affectedDocuments: string[];
  confidence: number;
  reasoning: string;
}

interface ComparisonRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{ factor: string; impact: string; mitigation: string }>;
  recommendedAction: string;
}

interface FieldComparisonProps {
  field: string;
  fieldName: string;
  values: Array<{ documentId: string; value: any; displayValue: string; documentName: string }>;
  difference: DocumentDifference;
  onSelectValue: (documentId: string, field: string, value: any) => void;
}

interface DocumentSummaryProps {
  document: DocumentData;
  complianceScore: number;
  issues: string[];
  isSelected: boolean;
  onSelect: () => void;
}

export function DocumentComparison({
  documents,
  onSelectDocument,
  onExport,
  className = ''
}: DocumentComparisonProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'differences' | 'analysis'>('side-by-side');
  const [filterSignificance, setFilterSignificance] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  // Auto-select first two documents if available
  useEffect(() => {
    if (documents.length >= 2 && selectedDocuments.length === 0) {
      setSelectedDocuments([documents[0].id, documents[1].id]);
    }
  }, [documents]);

  // Perform comparison when selected documents change
  useEffect(() => {
    if (selectedDocuments.length >= 2) {
      performComparison();
    }
  }, [selectedDocuments]);

  const selectedDocumentData = useMemo(() => {
    return documents.filter(doc => selectedDocuments.includes(doc.id));
  }, [documents, selectedDocuments]);

  const performComparison = async () => {
    if (selectedDocuments.length < 2) return;

    setIsAnalyzing(true);
    try {
      const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
      const result = await analyzeDocuments(selectedDocs);
      setComparisonResult(result);
    } catch (error) {
      console.error('Document comparison failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeDocuments = async (docs: DocumentData[]): Promise<ComparisonResult> => {
    // Find all differences between documents
    const differences = findDocumentDifferences(docs);
    
    // Perform legal analysis
    const legalAnalysis = await performLegalAnalysis(docs);
    
    // Generate recommendations
    const recommendations = generateRecommendations(docs, differences, legalAnalysis);
    
    // Assess risks
    const riskAssessment = assessComparisonRisks(differences, legalAnalysis);

    return {
      documents: docs,
      differences,
      legalAnalysis,
      recommendations,
      riskAssessment,
      exportedAt: new Date()
    };
  };

  const findDocumentDifferences = (docs: DocumentData[]): DocumentDifference[] => {
    const differences: DocumentDifference[] = [];
    const allFields = new Set<string>();

    // Collect all fields from all documents
    docs.forEach(doc => {
      collectFields(doc.stepData, '', allFields);
    });

    // Compare each field across documents
    for (const field of allFields) {
      const values = docs.map(doc => ({
        documentId: doc.id,
        value: getNestedValue(doc.stepData, field),
        displayValue: formatValueForDisplay(getNestedValue(doc.stepData, field))
      }));

      // Check if values are different
      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)));
      if (uniqueValues.size > 1) {
        const difference = analyzeDifference(field, values);
        if (difference) {
          differences.push(difference);
        }
      }
    }

    return differences.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.significance] - severityOrder[a.significance];
    });
  };

  const analyzeDifference = (field: string, values: Array<{ documentId: string; value: any; displayValue: string }>): DocumentDifference | null => {
    const fieldName = formatFieldName(field);
    
    // Determine difference type and significance
    let differenceType: DocumentDifference['differenceType'] = 'value';
    let significance: DocumentDifference['significance'] = 'low';
    let legalImplications: string | undefined;
    let recommendation: string | undefined;

    // Check for missing values
    const missingValues = values.filter(v => !v.value || v.value === '');
    if (missingValues.length > 0) {
      differenceType = 'missing';
      significance = 'medium';
    }

    // Assess legal significance
    const legalCriticalFields = [
      'parties.grantorsText',
      'parties.granteesText',
      'parties.legalDescription',
      'recording.apn',
      'tax.dttAmount'
    ];

    if (legalCriticalFields.includes(field)) {
      significance = 'critical';
      differenceType = 'legal_significance';
      legalImplications = 'This field has legal significance and differences may affect document validity';
      recommendation = 'Verify which value is correct and ensure consistency';
    }

    // Check for format differences
    const formats = values.map(v => typeof v.value);
    if (new Set(formats).size > 1) {
      differenceType = 'format';
      significance = 'medium';
      recommendation = 'Standardize format across documents';
    }

    return {
      field,
      fieldName,
      values,
      differenceType,
      significance,
      legalImplications,
      recommendation
    };
  };

  const performLegalAnalysis = async (docs: DocumentData[]): Promise<LegalAnalysis> => {
    const complianceComparison: LegalAnalysis['complianceComparison'] = [];
    const legalRisks: LegalAnalysis['legalRisks'] = [];
    const bestPractices: string[] = [];

    // Analyze each document for legal compliance
    for (const doc of docs) {
      try {
        const validationResult = await LegalValidationEngine.validateDocument({
          documentType: doc.documentType,
          stepData: doc.stepData,
          propertyData: doc.propertyData,
          currentStep: 5, // Assume complete document
          allStepsData: doc.stepData
        });

        complianceComparison.push({
          documentId: doc.id,
          complianceScore: validationResult.complianceScore,
          issues: validationResult.errors.map(e => e.message)
        });

        // Collect legal risks
        validationResult.errors.forEach(error => {
          if (error.severity === 'critical' || error.severity === 'high') {
            const existingRisk = legalRisks.find(r => r.risk === error.message);
            if (existingRisk) {
              existingRisk.affectedDocuments.push(doc.id);
            } else {
              legalRisks.push({
                risk: error.message,
                affectedDocuments: [doc.id],
                severity: error.severity === 'critical' ? 'high' : 'medium'
              });
            }
          }
        });

      } catch (error) {
        console.error(`Legal analysis failed for document ${doc.id}:`, error);
        complianceComparison.push({
          documentId: doc.id,
          complianceScore: 0,
          issues: ['Legal analysis failed']
        });
      }
    }

    // Generate best practices
    bestPractices.push(
      'Ensure all legal descriptions are identical across related documents',
      'Verify grantor names match exactly with title records',
      'Confirm all required fields are completed',
      'Review transfer tax calculations for accuracy',
      'Validate recording information completeness'
    );

    return {
      complianceComparison,
      legalRisks,
      bestPractices
    };
  };

  const generateRecommendations = (
    docs: DocumentData[],
    differences: DocumentDifference[],
    legalAnalysis: LegalAnalysis
  ): ComparisonRecommendation[] => {
    const recommendations: ComparisonRecommendation[] = [];

    // Find the document with highest compliance score
    const bestCompliance = legalAnalysis.complianceComparison.reduce((best, current) => 
      current.complianceScore > best.complianceScore ? current : best
    );

    if (bestCompliance.complianceScore > 80) {
      recommendations.push({
        type: 'use_document',
        title: 'Use Highest Compliance Document',
        description: `Document ${bestCompliance.documentId} has the highest legal compliance score (${bestCompliance.complianceScore}%)`,
        affectedDocuments: [bestCompliance.documentId],
        confidence: 0.9,
        reasoning: 'Higher compliance reduces legal risks and recording issues'
      });
    }

    // Recommend merging fields for critical differences
    const criticalDifferences = differences.filter(d => d.significance === 'critical');
    if (criticalDifferences.length > 0) {
      recommendations.push({
        type: 'merge_fields',
        title: 'Resolve Critical Field Differences',
        description: `${criticalDifferences.length} critical field differences need resolution`,
        affectedDocuments: docs.map(d => d.id),
        confidence: 0.95,
        reasoning: 'Critical differences may cause document invalidity or recording rejection'
      });
    }

    // Recommend legal review if high-risk issues found
    const highRiskIssues = legalAnalysis.legalRisks.filter(r => r.severity === 'high');
    if (highRiskIssues.length > 0) {
      recommendations.push({
        type: 'legal_review',
        title: 'Legal Review Recommended',
        description: `${highRiskIssues.length} high-risk legal issues identified`,
        affectedDocuments: docs.map(d => d.id),
        confidence: 0.85,
        reasoning: 'High-risk issues may require professional legal guidance'
      });
    }

    return recommendations;
  };

  const assessComparisonRisks = (
    differences: DocumentDifference[],
    legalAnalysis: LegalAnalysis
  ): ComparisonRiskAssessment => {
    const criticalDiffs = differences.filter(d => d.significance === 'critical').length;
    const highRisks = legalAnalysis.legalRisks.filter(r => r.severity === 'high').length;
    
    let overallRisk: ComparisonRiskAssessment['overallRisk'] = 'low';
    let recommendedAction = 'Proceed with caution and verify all differences';

    if (criticalDiffs > 0 || highRisks > 0) {
      overallRisk = 'high';
      recommendedAction = 'Resolve critical differences before proceeding';
    } else if (differences.filter(d => d.significance === 'high').length > 2) {
      overallRisk = 'medium';
      recommendedAction = 'Review and resolve significant differences';
    }

    const riskFactors = [
      {
        factor: 'Critical field differences',
        impact: 'May cause document invalidity',
        mitigation: 'Verify correct values and ensure consistency'
      },
      {
        factor: 'Legal compliance variations',
        impact: 'Recording rejection or legal issues',
        mitigation: 'Use document with highest compliance score'
      },
      {
        factor: 'Missing required information',
        impact: 'Incomplete or invalid documents',
        mitigation: 'Complete all required fields before finalizing'
      }
    ];

    return {
      overallRisk,
      riskFactors,
      recommendedAction
    };
  };

  const handleDocumentSelection = (documentId: string, selected: boolean) => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleExport = () => {
    if (comparisonResult && onExport) {
      onExport(comparisonResult);
    }
  };

  const filteredDifferences = useMemo(() => {
    if (!comparisonResult) return [];
    
    if (filterSignificance === 'all') {
      return comparisonResult.differences;
    }
    
    return comparisonResult.differences.filter(d => d.significance === filterSignificance);
  }, [comparisonResult, filterSignificance]);

  return (
    <div className={`document-comparison ${className}`}>
      {/* Header */}
      <div className="comparison-header">
        <div className="header-content">
          <h2 className="comparison-title">
            <span className="comparison-icon">📊</span>
            Document Comparison
          </h2>
          <div className="header-actions">
            <button
              className="export-button"
              onClick={handleExport}
              disabled={!comparisonResult}
            >
              📤 Export Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Document Selection */}
      <div className="document-selection">
        <h3>Select Documents to Compare</h3>
        <div className="document-list">
          {documents.map(doc => (
            <DocumentSummary
              key={doc.id}
              document={doc}
              complianceScore={
                comparisonResult?.legalAnalysis.complianceComparison
                  .find(c => c.documentId === doc.id)?.complianceScore || 0
              }
              issues={
                comparisonResult?.legalAnalysis.complianceComparison
                  .find(c => c.documentId === doc.id)?.issues || []
              }
              isSelected={selectedDocuments.includes(doc.id)}
              onSelect={() => handleDocumentSelection(doc.id, !selectedDocuments.includes(doc.id))}
            />
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="comparison-loading">
          <div className="loading-spinner">🔄</div>
          <div className="loading-text">
            <h3>Analyzing Documents...</h3>
            <p>Comparing fields, validating legal compliance, and assessing risks</p>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && !isAnalyzing && (
        <div className="comparison-results">
          {/* View Mode Selector */}
          <div className="view-mode-selector">
            <button
              className={`mode-button ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              📋 Side-by-Side
            </button>
            <button
              className={`mode-button ${viewMode === 'differences' ? 'active' : ''}`}
              onClick={() => setViewMode('differences')}
            >
              🔍 Differences Only
            </button>
            <button
              className={`mode-button ${viewMode === 'analysis' ? 'active' : ''}`}
              onClick={() => setViewMode('analysis')}
            >
              ⚖️ Legal Analysis
            </button>
          </div>

          {/* Risk Assessment Summary */}
          <div className="risk-assessment-summary">
            <div className={`risk-indicator risk-${comparisonResult.riskAssessment.overallRisk}`}>
              <span className="risk-level">
                {comparisonResult.riskAssessment.overallRisk.toUpperCase()} RISK
              </span>
              <span className="risk-action">
                {comparisonResult.riskAssessment.recommendedAction}
              </span>
            </div>
          </div>

          {/* Side-by-Side View */}
          {viewMode === 'side-by-side' && (
            <SideBySideView
              documents={selectedDocumentData}
              differences={comparisonResult.differences}
              onSelectValue={(docId, field, value) => {
                // Handle value selection for merging
                console.log('Selected value:', { docId, field, value });
              }}
            />
          )}

          {/* Differences View */}
          {viewMode === 'differences' && (
            <DifferencesView
              differences={filteredDifferences}
              documents={selectedDocumentData}
              filterSignificance={filterSignificance}
              onFilterChange={setFilterSignificance}
              onSelectValue={(docId, field, value) => {
                console.log('Selected value:', { docId, field, value });
              }}
            />
          )}

          {/* Legal Analysis View */}
          {viewMode === 'analysis' && (
            <LegalAnalysisView
              legalAnalysis={comparisonResult.legalAnalysis}
              recommendations={comparisonResult.recommendations}
              riskAssessment={comparisonResult.riskAssessment}
              documents={selectedDocumentData}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Supporting Components

function DocumentSummary({ document, complianceScore, issues, isSelected, onSelect }: DocumentSummaryProps) {
  const documentConfig = DOCUMENT_REGISTRY[document.documentType];
  
  return (
    <div className={`document-summary ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="document-header">
        <div className="document-info">
          <h4>{documentConfig?.name || document.documentType}</h4>
          <span className="document-id">ID: {document.id.slice(-8)}</span>
          <span className="document-date">
            {document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Unknown date'}
          </span>
        </div>
        <div className="compliance-score">
          <span className={`score score-${complianceScore > 80 ? 'high' : complianceScore > 60 ? 'medium' : 'low'}`}>
            {complianceScore}%
          </span>
        </div>
      </div>
      
      <div className="document-details">
        <div className="property-info">
          <strong>Property:</strong> {document.propertyData?.address || 'Not specified'}
        </div>
        {issues.length > 0 && (
          <div className="issues-summary">
            <strong>Issues:</strong> {issues.length} found
          </div>
        )}
      </div>
      
      <div className="selection-indicator">
        {isSelected ? '✅ Selected' : '⚪ Click to select'}
      </div>
    </div>
  );
}

function SideBySideView({ 
  documents, 
  differences, 
  onSelectValue 
}: { 
  documents: DocumentData[]; 
  differences: DocumentDifference[]; 
  onSelectValue: (docId: string, field: string, value: any) => void;
}) {
  return (
    <div className="side-by-side-view">
      <div className="documents-grid">
        {documents.map(doc => (
          <div key={doc.id} className="document-column">
            <div className="document-header">
              <h4>{DOCUMENT_REGISTRY[doc.documentType]?.name || doc.documentType}</h4>
              <span className="document-id">{doc.id.slice(-8)}</span>
            </div>
            
            <div className="document-fields">
              {differences.map(diff => (
                <div key={diff.field} className={`field-row significance-${diff.significance}`}>
                  <div className="field-label">{diff.fieldName}</div>
                  <div className="field-value">
                    {diff.values.find(v => v.documentId === doc.id)?.displayValue || 'Not set'}
                  </div>
                  {diff.significance === 'critical' && (
                    <div className="field-warning">⚠️ Critical difference</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DifferencesView({ 
  differences, 
  documents,
  filterSignificance,
  onFilterChange,
  onSelectValue 
}: { 
  differences: DocumentDifference[];
  documents: DocumentData[];
  filterSignificance: string;
  onFilterChange: (filter: any) => void;
  onSelectValue: (docId: string, field: string, value: any) => void;
}) {
  return (
    <div className="differences-view">
      {/* Filter Controls */}
      <div className="filter-controls">
        <label>Filter by significance:</label>
        <select value={filterSignificance} onChange={(e) => onFilterChange(e.target.value)}>
          <option value="all">All Differences</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
        </select>
      </div>

      {/* Differences List */}
      <div className="differences-list">
        {differences.map(diff => (
          <FieldComparison
            key={diff.field}
            field={diff.field}
            fieldName={diff.fieldName}
            values={diff.values.map(v => ({
              ...v,
              documentName: documents.find(d => d.id === v.documentId)?.documentType || 'Unknown'
            }))}
            difference={diff}
            onSelectValue={onSelectValue}
          />
        ))}
      </div>
    </div>
  );
}

function FieldComparison({ field, fieldName, values, difference, onSelectValue }: FieldComparisonProps) {
  return (
    <div className={`field-comparison significance-${difference.significance}`}>
      <div className="field-header">
        <h4>{fieldName}</h4>
        <div className="significance-badge">
          <span className={`badge badge-${difference.significance}`}>
            {difference.significance}
          </span>
          <span className="difference-type">{difference.differenceType}</span>
        </div>
      </div>

      <div className="field-values">
        {values.map(({ documentId, value, displayValue, documentName }) => (
          <div key={documentId} className="value-option">
            <div className="value-header">
              <span className="document-name">{documentName}</span>
              <span className="document-id">{documentId.slice(-8)}</span>
            </div>
            <div className="value-content">
              <span className="value-text">{displayValue || 'Not set'}</span>
              <button
                className="select-value-button"
                onClick={() => onSelectValue(documentId, field, value)}
              >
                Use This Value
              </button>
            </div>
          </div>
        ))}
      </div>

      {difference.legalImplications && (
        <div className="legal-implications">
          <strong>⚖️ Legal Implications:</strong> {difference.legalImplications}
        </div>
      )}

      {difference.recommendation && (
        <div className="recommendation">
          <strong>💡 Recommendation:</strong> {difference.recommendation}
        </div>
      )}
    </div>
  );
}

function LegalAnalysisView({ 
  legalAnalysis, 
  recommendations, 
  riskAssessment,
  documents 
}: { 
  legalAnalysis: LegalAnalysis;
  recommendations: ComparisonRecommendation[];
  riskAssessment: ComparisonRiskAssessment;
  documents: DocumentData[];
}) {
  return (
    <div className="legal-analysis-view">
      {/* Compliance Comparison */}
      <div className="compliance-comparison">
        <h3>📊 Legal Compliance Comparison</h3>
        <div className="compliance-grid">
          {legalAnalysis.complianceComparison.map(comp => {
            const doc = documents.find(d => d.id === comp.documentId);
            return (
              <div key={comp.documentId} className="compliance-item">
                <div className="compliance-header">
                  <h4>{DOCUMENT_REGISTRY[doc?.documentType || '']?.name || 'Unknown'}</h4>
                  <span className={`compliance-score score-${comp.complianceScore > 80 ? 'high' : comp.complianceScore > 60 ? 'medium' : 'low'}`}>
                    {comp.complianceScore}%
                  </span>
                </div>
                {comp.issues.length > 0 && (
                  <div className="compliance-issues">
                    <strong>Issues:</strong>
                    <ul>
                      {comp.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legal Risks */}
      {legalAnalysis.legalRisks.length > 0 && (
        <div className="legal-risks">
          <h3>⚠️ Legal Risks Identified</h3>
          <div className="risks-list">
            {legalAnalysis.legalRisks.map((risk, idx) => (
              <div key={idx} className={`risk-item risk-${risk.severity}`}>
                <div className="risk-header">
                  <span className="risk-text">{risk.risk}</span>
                  <span className={`risk-severity severity-${risk.severity}`}>
                    {risk.severity}
                  </span>
                </div>
                <div className="affected-documents">
                  <strong>Affected documents:</strong> {risk.affectedDocuments.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations">
        <h3>💡 Recommendations</h3>
        <div className="recommendations-list">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`recommendation-item recommendation-${rec.type}`}>
              <div className="recommendation-header">
                <h4>{rec.title}</h4>
                <span className="confidence">
                  {Math.round(rec.confidence * 100)}% confidence
                </span>
              </div>
              <div className="recommendation-content">
                <p>{rec.description}</p>
                <div className="reasoning">
                  <strong>Reasoning:</strong> {rec.reasoning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Practices */}
      <div className="best-practices">
        <h3>✅ Best Practices</h3>
        <ul>
          {legalAnalysis.bestPractices.map((practice, idx) => (
            <li key={idx}>{practice}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Utility functions
function collectFields(obj: any, prefix: string, fields: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectFields(value, fieldPath, fields);
    } else {
      fields.add(fieldPath);
    }
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function formatValueForDisplay(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatFieldName(field: string): string {
  return field
    .split('.')
    .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
    .join(' → ');
}

export default DocumentComparison;
export type { DocumentComparisonProps, ComparisonResult, DocumentDifference };


