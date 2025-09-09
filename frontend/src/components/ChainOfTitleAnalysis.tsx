import React, { useState, useEffect } from 'react';
import { ChainOfTitleService, ChainOfTitleAnalysis, TitleTransfer, TitleIssue, RiskAssessment } from '../services/chainOfTitleService';
import { PropertyData } from '../lib/wizardState';

interface ChainOfTitleAnalysisProps {
  propertyData: PropertyData;
  onAnalysisComplete?: (analysis: ChainOfTitleAnalysis) => void;
  onError?: (error: string) => void;
  className?: string;
  autoLoad?: boolean;
  searchDepth?: 'basic' | 'comprehensive' | 'full_history';
}

interface TimelineViewProps {
  transfers: TitleTransfer[];
  currentOwner: ChainOfTitleAnalysis['currentOwner'];
  onTransferClick: (transfer: TitleTransfer) => void;
}

interface RiskAnalysisProps {
  riskAssessment: RiskAssessment;
  titleIssues: TitleIssue[];
  onIssueClick: (issue: TitleIssue) => void;
}

interface TransferDetailsProps {
  transfer: TitleTransfer | null;
  onClose: () => void;
}

export function ChainOfTitleAnalysis({
  propertyData,
  onAnalysisComplete,
  onError,
  className = '',
  autoLoad = false,
  searchDepth = 'comprehensive'
}: ChainOfTitleAnalysisProps) {
  const [analysis, setAnalysis] = useState<ChainOfTitleAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedTransfer, setSelectedTransfer] = useState<TitleTransfer | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<TitleIssue | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'summary'>('timeline');
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  // Auto-load analysis if requested
  useEffect(() => {
    if (autoLoad && propertyData.address) {
      handleAnalyzeChainOfTitle();
    }
  }, [autoLoad, propertyData.address]);

  // Check for cached analysis
  useEffect(() => {
    const cached = ChainOfTitleService.getCachedAnalysis(propertyData);
    if (cached) {
      setAnalysis(cached);
      onAnalysisComplete?.(cached);
    }
  }, [propertyData]);

  const handleAnalyzeChainOfTitle = async () => {
    if (!propertyData.address && !propertyData.apn) {
      const errorMsg = 'Property address or APN is required for chain of title analysis';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await ChainOfTitleService.getChainOfTitle({
        propertyData,
        searchDepth,
        includeRiskAnalysis: true,
        includeLegalValidation: true
      });

      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Chain of title analysis failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferClick = (transfer: TitleTransfer) => {
    setSelectedTransfer(transfer);
  };

  const handleIssueClick = (issue: TitleIssue) => {
    setSelectedIssue(issue);
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className={`chain-of-title-analysis ${className}`}>
      {/* Header */}
      <div className="cot-header">
        <div className="header-content">
          <h2 className="cot-title">
            <span className="cot-icon">🔗</span>
            Chain of Title Analysis
          </h2>
          <div className="header-actions">
            {!analysis && (
              <button
                className="analyze-button"
                onClick={handleAnalyzeChainOfTitle}
                disabled={isLoading}
              >
                {isLoading ? '🔄 Analyzing...' : '🔍 Analyze Chain of Title'}
              </button>
            )}
            {analysis && (
              <div className="analysis-info">
                <span className="confidence-indicator" style={{ color: getConfidenceColor(analysis.confidence) }}>
                  {Math.round(analysis.confidence * 100)}% Confidence
                </span>
                <span className="data-source">
                  📊 Source: {analysis.dataSource}
                </span>
                <span className="last-updated">
                  🕒 {analysis.lastUpdated.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="cot-loading">
          <div className="loading-spinner">🔄</div>
          <div className="loading-text">
            <h3>Analyzing Chain of Title...</h3>
            <p>Retrieving property ownership history and risk assessment</p>
            <div className="loading-steps">
              <div className="step">✅ Connecting to TitlePoint</div>
              <div className="step">🔄 Retrieving legal/vesting data</div>
              <div className="step">⏳ Analyzing ownership history</div>
              <div className="step">⏳ Performing risk assessment</div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="cot-error">
          <div className="error-header">
            <span className="error-icon">❌</span>
            <h3>Analysis Failed</h3>
          </div>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="retry-button" onClick={handleAnalyzeChainOfTitle}>
              🔄 Retry Analysis
            </button>
            <button className="help-button" onClick={() => setError('')}>
              ❓ Get Help
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isLoading && (
        <div className="cot-results">
          {/* Property Summary */}
          <div className="property-summary">
            <h3>📍 Property Information</h3>
            <div className="property-details">
              <div className="detail-item">
                <strong>Address:</strong> {analysis.propertyInfo.address}
              </div>
              <div className="detail-item">
                <strong>APN:</strong> {analysis.propertyInfo.apn}
              </div>
              <div className="detail-item">
                <strong>County:</strong> {analysis.propertyInfo.county}
              </div>
              <div className="detail-item">
                <strong>Legal Description:</strong> {analysis.propertyInfo.legalDescription}
              </div>
            </div>
          </div>

          {/* Current Owner */}
          <div className="current-owner">
            <h3>👤 Current Owner</h3>
            <div className="owner-details">
              <div className="owner-name">{analysis.currentOwner.name}</div>
              <div className="owner-info">
                <span className="vesting-type">{analysis.currentOwner.vestingType}</span>
                <span className="ownership-duration">{analysis.currentOwner.ownershipDuration}</span>
                <span className="acquisition-method">via {analysis.currentOwner.acquisitionMethod}</span>
              </div>
              <div className="acquisition-date">
                Acquired: {analysis.currentOwner.acquisitionDate.toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="risk-assessment">
            <div className="risk-header" onClick={() => setShowRiskDetails(!showRiskDetails)}>
              <h3>⚠️ Risk Assessment</h3>
              <div className="risk-summary">
                <span 
                  className="risk-level"
                  style={{ color: getRiskColor(analysis.riskAssessment.overallRisk) }}
                >
                  {analysis.riskAssessment.overallRisk.toUpperCase()} RISK
                </span>
                <span className="risk-score">
                  Score: {analysis.riskAssessment.riskScore}/100
                </span>
                <span className="insurability">
                  {analysis.riskAssessment.insurabilityRating}
                </span>
              </div>
              <span className="expand-icon">{showRiskDetails ? '▼' : '▶'}</span>
            </div>
            
            {showRiskDetails && (
              <RiskAnalysisPanel
                riskAssessment={analysis.riskAssessment}
                titleIssues={analysis.titleIssues}
                onIssueClick={handleIssueClick}
              />
            )}
          </div>

          {/* View Mode Selector */}
          <div className="view-mode-selector">
            <button
              className={`mode-button ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              📅 Timeline View
            </button>
            <button
              className={`mode-button ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📊 Table View
            </button>
            <button
              className={`mode-button ${viewMode === 'summary' ? 'active' : ''}`}
              onClick={() => setViewMode('summary')}
            >
              📋 Summary View
            </button>
          </div>

          {/* Ownership History */}
          <div className="ownership-history">
            <h3>📜 Ownership History ({analysis.transfers.length} transfers)</h3>
            
            {viewMode === 'timeline' && (
              <TimelineView
                transfers={analysis.transfers}
                currentOwner={analysis.currentOwner}
                onTransferClick={handleTransferClick}
              />
            )}

            {viewMode === 'table' && (
              <TableView
                transfers={analysis.transfers}
                onTransferClick={handleTransferClick}
              />
            )}

            {viewMode === 'summary' && (
              <SummaryView
                ownershipHistory={analysis.ownershipHistory}
                transfers={analysis.transfers}
              />
            )}
          </div>

          {/* Recommendations */}
          <div className="recommendations">
            <h3>💡 Recommendations</h3>
            <div className="recommendation-grid">
              <div className="recommendation-item">
                <strong>Recommended Document:</strong>
                <span>{analysis.recommendations.documentType.replace('_', ' ')}</span>
              </div>
              <div className="recommendation-item">
                <strong>Title Insurance:</strong>
                <span className={analysis.recommendations.titleInsurance ? 'required' : 'optional'}>
                  {analysis.recommendations.titleInsurance ? '✅ Required' : '⚪ Optional'}
                </span>
              </div>
              <div className="recommendation-item">
                <strong>Legal Review:</strong>
                <span className={analysis.recommendations.legalReview ? 'required' : 'optional'}>
                  {analysis.recommendations.legalReview ? '✅ Required' : '⚪ Optional'}
                </span>
              </div>
              <div className="recommendation-item">
                <strong>Estimated Cost:</strong>
                <span>{analysis.recommendations.estimatedCost}</span>
              </div>
              <div className="recommendation-item">
                <strong>Timeframe:</strong>
                <span>{analysis.recommendations.timeframe}</span>
              </div>
            </div>
            
            {analysis.recommendations.additionalDueDiligence.length > 0 && (
              <div className="due-diligence">
                <h4>📋 Additional Due Diligence Required:</h4>
                <ul>
                  {analysis.recommendations.additionalDueDiligence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}

      {/* Issue Details Modal */}
      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

// Timeline View Component
function TimelineView({ transfers, currentOwner, onTransferClick }: TimelineViewProps) {
  return (
    <div className="timeline-view">
      <div className="timeline">
        {/* Current Owner */}
        <div className="timeline-item current-owner">
          <div className="timeline-marker current"></div>
          <div className="timeline-content">
            <div className="transfer-header">
              <h4>Current Owner</h4>
              <span className="transfer-date">Present</span>
            </div>
            <div className="transfer-details">
              <div className="parties">
                <strong>{currentOwner.name}</strong>
              </div>
              <div className="vesting">{currentOwner.vestingType}</div>
            </div>
          </div>
        </div>

        {/* Historical Transfers */}
        {transfers.map((transfer, index) => (
          <div key={transfer.id} className="timeline-item" onClick={() => onTransferClick(transfer)}>
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="transfer-header">
                <h4>{transfer.documentType}</h4>
                <span className="transfer-date">{transfer.date.toLocaleDateString()}</span>
              </div>
              <div className="transfer-details">
                <div className="parties">
                  <div className="grantor">From: {transfer.grantor}</div>
                  <div className="grantee">To: {transfer.grantee}</div>
                </div>
                <div className="consideration">
                  Consideration: {transfer.consideration}
                </div>
                {transfer.riskFactors.length > 0 && (
                  <div className="risk-indicators">
                    {transfer.riskFactors.map((risk, idx) => (
                      <span key={idx} className="risk-tag">⚠️ {risk}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table View Component
function TableView({ transfers, onTransferClick }: { transfers: TitleTransfer[]; onTransferClick: (transfer: TitleTransfer) => void }) {
  return (
    <div className="table-view">
      <table className="transfers-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Document Type</th>
            <th>Grantor</th>
            <th>Grantee</th>
            <th>Consideration</th>
            <th>Recording</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id} onClick={() => onTransferClick(transfer)} className="clickable-row">
              <td>{transfer.date.toLocaleDateString()}</td>
              <td>{transfer.documentType}</td>
              <td>{transfer.grantor}</td>
              <td>{transfer.grantee}</td>
              <td>{transfer.consideration}</td>
              <td>{transfer.bookPage}</td>
              <td>
                {transfer.riskFactors.length > 0 ? (
                  <span className="has-issues">⚠️ {transfer.riskFactors.length}</span>
                ) : (
                  <span className="no-issues">✅</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Summary View Component
function SummaryView({ ownershipHistory, transfers }: { ownershipHistory: any[]; transfers: TitleTransfer[] }) {
  return (
    <div className="summary-view">
      <div className="summary-stats">
        <div className="stat-item">
          <h4>Total Transfers</h4>
          <span className="stat-value">{transfers.length}</span>
        </div>
        <div className="stat-item">
          <h4>Ownership Periods</h4>
          <span className="stat-value">{ownershipHistory.length}</span>
        </div>
        <div className="stat-item">
          <h4>Average Ownership</h4>
          <span className="stat-value">
            {ownershipHistory.length > 0 ? 
              Math.round(ownershipHistory.reduce((acc, period) => {
                const duration = period.endDate ? 
                  (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365) :
                  (Date.now() - period.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                return acc + duration;
              }, 0) / ownershipHistory.length) : 0
            } years
          </span>
        </div>
      </div>
      
      <div className="ownership-periods">
        <h4>Ownership Periods</h4>
        {ownershipHistory.map((period, index) => (
          <div key={index} className="period-item">
            <div className="period-owner">{period.owner}</div>
            <div className="period-duration">{period.duration}</div>
            <div className="period-dates">
              {period.startDate.toLocaleDateString()} - {period.endDate?.toLocaleDateString() || 'Present'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Risk Analysis Panel Component
function RiskAnalysisPanel({ riskAssessment, titleIssues, onIssueClick }: RiskAnalysisProps) {
  return (
    <div className="risk-analysis-panel">
      {/* Risk Factors */}
      {riskAssessment.riskFactors.length > 0 && (
        <div className="risk-factors">
          <h4>🎯 Risk Factors</h4>
          {riskAssessment.riskFactors.map((factor, index) => (
            <div key={index} className={`risk-factor risk-${factor.severity}`}>
              <div className="factor-header">
                <span className="factor-type">{factor.type}</span>
                <span className="factor-severity">{factor.severity}</span>
              </div>
              <div className="factor-description">{factor.description}</div>
              <div className="factor-mitigation">
                <strong>Mitigation:</strong> {factor.mitigation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Title Issues */}
      {titleIssues.length > 0 && (
        <div className="title-issues">
          <h4>🚨 Title Issues ({titleIssues.length})</h4>
          {titleIssues.map((issue) => (
            <div key={issue.id} className={`title-issue issue-${issue.severity}`} onClick={() => onIssueClick(issue)}>
              <div className="issue-header">
                <span className="issue-type">{issue.type.replace('_', ' ')}</span>
                <span className="issue-severity">{issue.severity}</span>
                <span className="issue-status">{issue.status}</span>
              </div>
              <div className="issue-description">{issue.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {riskAssessment.recommendations.length > 0 && (
        <div className="risk-recommendations">
          <h4>💡 Risk Mitigation Recommendations</h4>
          <ul>
            {riskAssessment.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Actions */}
      {riskAssessment.requiredActions.length > 0 && (
        <div className="required-actions">
          <h4>✅ Required Actions</h4>
          {riskAssessment.requiredActions.map((action) => (
            <div key={action.id} className={`required-action priority-${action.priority}`}>
              <div className="action-header">
                <span className="action-title">{action.action}</span>
                <span className="action-priority">{action.priority}</span>
              </div>
              <div className="action-description">{action.description}</div>
              {action.deadline && (
                <div className="action-deadline">
                  Deadline: {action.deadline.toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Transfer Details Modal
function TransferDetailsModal({ transfer, onClose }: TransferDetailsProps) {
  if (!transfer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📄 Transfer Details</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="transfer-detail-grid">
            <div className="detail-row">
              <strong>Date:</strong>
              <span>{transfer.date.toLocaleDateString()}</span>
            </div>
            <div className="detail-row">
              <strong>Document Type:</strong>
              <span>{transfer.documentType}</span>
            </div>
            <div className="detail-row">
              <strong>Grantor:</strong>
              <span>{transfer.grantor}</span>
            </div>
            <div className="detail-row">
              <strong>Grantee:</strong>
              <span>{transfer.grantee}</span>
            </div>
            <div className="detail-row">
              <strong>Consideration:</strong>
              <span>{transfer.consideration}</span>
            </div>
            <div className="detail-row">
              <strong>Instrument Number:</strong>
              <span>{transfer.instrumentNumber}</span>
            </div>
            <div className="detail-row">
              <strong>Book/Page:</strong>
              <span>{transfer.bookPage}</span>
            </div>
            <div className="detail-row">
              <strong>Recording Info:</strong>
              <span>
                {transfer.recordingInfo.county} County, 
                Recorded: {transfer.recordingInfo.recordingDate.toLocaleDateString()}
              </span>
            </div>
            <div className="detail-row">
              <strong>Confidence:</strong>
              <span>{Math.round(transfer.confidence * 100)}%</span>
            </div>
          </div>

          {transfer.riskFactors.length > 0 && (
            <div className="risk-factors-section">
              <h4>⚠️ Risk Factors</h4>
              <ul>
                {transfer.riskFactors.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {transfer.legalIssues.length > 0 && (
            <div className="legal-issues-section">
              <h4>⚖️ Legal Issues</h4>
              <ul>
                {transfer.legalIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Issue Details Modal
function IssueDetailsModal({ issue, onClose }: { issue: TitleIssue | null; onClose: () => void }) {
  if (!issue) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🚨 Title Issue Details</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="issue-detail-grid">
            <div className="detail-row">
              <strong>Type:</strong>
              <span>{issue.type.replace('_', ' ')}</span>
            </div>
            <div className="detail-row">
              <strong>Severity:</strong>
              <span className={`severity-${issue.severity}`}>{issue.severity}</span>
            </div>
            <div className="detail-row">
              <strong>Status:</strong>
              <span className={`status-${issue.status.replace('_', '-')}`}>{issue.status.replace('_', ' ')}</span>
            </div>
            <div className="detail-row">
              <strong>Discovered:</strong>
              <span>{issue.discoveredDate.toLocaleDateString()}</span>
            </div>
          </div>

          <div className="issue-description">
            <h4>Description</h4>
            <p>{issue.description}</p>
          </div>

          <div className="legal-basis">
            <h4>Legal Basis</h4>
            <p>{issue.legalBasis}</p>
          </div>

          <div className="resolution">
            <h4>Resolution</h4>
            <p>{issue.resolution}</p>
          </div>

          <div className="impact">
            <h4>Impact</h4>
            <p>{issue.impact}</p>
          </div>

          {issue.affectedParties.length > 0 && (
            <div className="affected-parties">
              <h4>Affected Parties</h4>
              <ul>
                {issue.affectedParties.map((party, index) => (
                  <li key={index}>{party}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChainOfTitleAnalysis;
export type { ChainOfTitleAnalysisProps };


