import React, { useState, useEffect } from 'react';
import { DocumentConfig, StepConfig, AICapability } from '../lib/documentRegistry';
import { AISuggestion, ValidationError } from '../lib/wizardState';
import { AIAssistancePanel } from './AIAssistancePanel';
import { DynamicFormFields } from './DynamicFormFields';
import { StepNavigation } from './StepNavigation';
import { ProgressIndicator } from './ProgressIndicator';

interface DynamicStepRendererProps {
  documentConfig: DocumentConfig;
  currentStep: number;
  stepData: Record<string, any>;
  validationErrors: Record<string, ValidationError[]>;
  onFieldChange: (stepId: string, field: string, value: any) => void;
  onFieldsChange: (stepId: string, fields: Record<string, any>) => void;
  onStepComplete: () => void;
  onStepBack: () => void;
  aiSuggestions: AISuggestion[];
  onApplyAI: (suggestion: AISuggestion) => void;
  onRequestAI: (capability: AICapability, context: any) => void;
  isLoading?: boolean;
  className?: string;
}

export default function DynamicStepRenderer({
  documentConfig,
  currentStep,
  stepData,
  validationErrors,
  onFieldChange,
  onFieldsChange,
  onStepComplete,
  onStepBack,
  aiSuggestions,
  onApplyAI,
  onRequestAI,
  isLoading = false,
  className = ''
}: DynamicStepRendererProps) {
  const [isStepValid, setIsStepValid] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  
  // Get current step configuration
  const stepConfig = documentConfig.requiredSteps[currentStep - 1];
  const currentStepData = stepData[stepConfig.id] || {};
  const currentErrors = validationErrors[stepConfig.id] || [];
  
  // Validate step whenever data changes
  useEffect(() => {
    const hasRequiredFields = stepConfig.fields.every(field => {
      const value = currentStepData[field];
      return value !== undefined && value !== null && value !== '';
    });
    
    const hasErrors = currentErrors.some(error => error.severity === 'error');
    
    setIsStepValid(hasRequiredFields && !hasErrors);
  }, [currentStepData, currentErrors, stepConfig.fields]);

  const handleFieldChange = (field: string, value: any) => {
    onFieldChange(stepConfig.id, field, value);
  };

  const handleFieldsChange = (fields: Record<string, any>) => {
    onFieldsChange(stepConfig.id, fields);
  };

  const handleAIRequest = (capability: AICapability) => {
    onRequestAI(capability, {
      stepId: stepConfig.id,
      currentData: currentStepData,
      documentType: documentConfig.id
    });
  };

  const getStepIcon = (stepNumber: number): string => {
    switch (stepConfig.id) {
      case 'property': return '🏠';
      case 'recording': return '📝';
      case 'tax': return '💰';
      case 'parties': return '👥';
      case 'spouses': return '💑';
      case 'analysis': return '📊';
      case 'review': return '✅';
      default: return '📋';
    }
  };

  const getStepDescription = (): string => {
    return stepConfig.description || `Complete ${stepConfig.name.toLowerCase()} information`;
  };

  return (
    <div className={`dynamic-step-renderer ${className}`}>
      {/* Step Header */}
      <div className="step-header">
        <div className="step-title-section">
          <div className="step-icon">{getStepIcon(currentStep)}</div>
          <div className="step-info">
            <h2 className="step-title">
              Step {currentStep}: {stepConfig.name}
            </h2>
            <p className="step-description">
              {getStepDescription()}
            </p>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <ProgressIndicator 
          current={currentStep} 
          total={documentConfig.requiredSteps.length}
          estimatedTime={stepConfig.estimatedTime || documentConfig.estimatedTime}
          documentType={documentConfig.name}
        />
      </div>

      {/* Legal Requirement Notice */}
      <div className="legal-requirement-notice">
        <div className="legal-icon">⚖️</div>
        <div className="legal-content">
          <strong>Legal Requirement:</strong> {stepConfig.legalReason}
        </div>
      </div>

      {/* Document Type Context */}
      <div className="document-context">
        <div className="document-badge">
          <span className="document-type">{documentConfig.name}</span>
          <span className={`complexity-badge complexity-${documentConfig.complexity}`}>
            {documentConfig.complexity}
          </span>
        </div>
        <div className="estimated-time">
          ⏱️ {stepConfig.estimatedTime || '2-3 minutes'}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="step-content">
        {/* AI Assistance Panel */}
        {showAIPanel && stepConfig.aiCapabilities.length > 0 && (
          <AIAssistancePanel
            suggestions={aiSuggestions}
            onApply={onApplyAI}
            capabilities={stepConfig.aiCapabilities}
            stepId={stepConfig.id}
            onRequestCapability={handleAIRequest}
            onToggle={() => setShowAIPanel(!showAIPanel)}
            isExpanded={showAIPanel}
          />
        )}

        {/* Dynamic Form Fields */}
        <div className="form-section">
          <DynamicFormFields
            stepConfig={stepConfig}
            data={currentStepData}
            errors={currentErrors}
            onChange={handleFieldChange}
            onBatchChange={handleFieldsChange}
            documentType={documentConfig.id}
            isLoading={isLoading}
          />
        </div>

        {/* Validation Errors Display */}
        {currentErrors.length > 0 && (
          <div className="validation-errors">
            <h4 className="errors-title">
              <span className="error-icon">⚠️</span>
              Please correct the following:
            </h4>
            <ul className="errors-list">
              {currentErrors.map((error, index) => (
                <li key={index} className={`error-item severity-${error.severity}`}>
                  <div className="error-message">{error.message}</div>
                  {error.suggestion && (
                    <div className="error-suggestion">
                      💡 {error.suggestion}
                    </div>
                  )}
                  {error.legalBasis && (
                    <div className="error-legal-basis">
                      ⚖️ {error.legalBasis}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Document Warnings */}
        {documentConfig.warnings && documentConfig.warnings.length > 0 && (
          <div className="document-warnings">
            <h4 className="warnings-title">
              <span className="warning-icon">⚠️</span>
              Important Notices for {documentConfig.name}
            </h4>
            <ul className="warnings-list">
              {documentConfig.warnings.map((warning, index) => (
                <li key={index} className="warning-item">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <StepNavigation
        currentStep={currentStep}
        totalSteps={documentConfig.requiredSteps.length}
        canProceed={isStepValid && !isLoading}
        canGoBack={currentStep > 1}
        onNext={onStepComplete}
        onBack={onStepBack}
        isLoading={isLoading}
        nextButtonText={currentStep === documentConfig.requiredSteps.length ? 'Generate Document' : 'Continue'}
        validationErrors={currentErrors.filter(e => e.severity === 'error').length}
      />

      {/* Step Progress Footer */}
      <div className="step-footer">
        <div className="progress-text">
          Step {currentStep} of {documentConfig.requiredSteps.length} • 
          {documentConfig.complexity} complexity • 
          Estimated time: {documentConfig.estimatedTime}
        </div>
        
        {/* AI Toggle */}
        {stepConfig.aiCapabilities.length > 0 && (
          <button 
            className="ai-toggle-button"
            onClick={() => setShowAIPanel(!showAIPanel)}
            type="button"
          >
            {showAIPanel ? '🤖 Hide AI Help' : '🤖 Show AI Help'}
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">Processing...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Supporting Components

interface ProgressIndicatorProps {
  current: number;
  total: number;
  estimatedTime: string;
  documentType: string;
}

function ProgressIndicator({ current, total, estimatedTime, documentType }: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <span className="progress-label">{documentType} Progress</span>
        <span className="progress-percentage">{percentage}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-details">
        <span className="step-counter">{current} of {total} steps</span>
        <span className="estimated-time">⏱️ {estimatedTime}</span>
      </div>
    </div>
  );
}

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  nextButtonText: string;
  validationErrors: number;
}

function StepNavigation({ 
  currentStep, 
  totalSteps, 
  canProceed, 
  canGoBack, 
  onNext, 
  onBack, 
  isLoading,
  nextButtonText,
  validationErrors
}: StepNavigationProps) {
  return (
    <div className="step-navigation">
      <div className="nav-buttons">
        <button
          type="button"
          className="nav-button back-button"
          onClick={onBack}
          disabled={!canGoBack || isLoading}
        >
          ← Back
        </button>
        
        <div className="nav-center">
          {validationErrors > 0 && (
            <div className="validation-summary">
              ⚠️ {validationErrors} error{validationErrors !== 1 ? 's' : ''} to fix
            </div>
          )}
        </div>
        
        <button
          type="button"
          className={`nav-button next-button ${canProceed ? 'enabled' : 'disabled'}`}
          onClick={onNext}
          disabled={!canProceed || isLoading}
        >
          {isLoading ? (
            <>
              <span className="button-spinner"></span>
              Processing...
            </>
          ) : (
            <>
              {nextButtonText}
              {currentStep < totalSteps && ' →'}
            </>
          )}
        </button>
      </div>
      
      <div className="nav-help-text">
        {!canProceed && validationErrors === 0 && (
          <div className="help-text">
            Please complete all required fields to continue
          </div>
        )}
        {canProceed && (
          <div className="help-text success">
            ✅ Ready to proceed to {currentStep === totalSteps ? 'document generation' : 'next step'}
          </div>
        )}
      </div>
    </div>
  );
}

// Export the main component and supporting types
export { DynamicStepRenderer };
export type { DynamicStepRendererProps };

