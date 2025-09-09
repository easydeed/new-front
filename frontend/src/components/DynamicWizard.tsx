import React, { useEffect, useState } from 'react';
import { useWizardState } from '../lib/wizardState';
import { getDocumentConfig, getSupportedDocumentTypes } from '../lib/documentRegistry';
import { IntelligentAIService } from '../services/aiService';
import { DynamicStepRenderer } from './DynamicStepRenderer';
import { DocumentTypeSelector } from './DocumentTypeSelector';

interface DynamicWizardProps {
  initialDocumentType?: string;
  onComplete?: (documentData: any) => void;
  onCancel?: () => void;
  className?: string;
}

export default function DynamicWizard({
  initialDocumentType,
  onComplete,
  onCancel,
  className = ''
}: DynamicWizardProps) {
  const {
    state,
    stateManager,
    selectDocument,
    goToStep,
    updateField,
    updateFields,
    applyAISuggestion,
    updatePropertyData
  } = useWizardState();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize with document type if provided
  useEffect(() => {
    if (initialDocumentType && !state.selectedDocument) {
      selectDocument(initialDocumentType);
    }
  }, [initialDocumentType, state.selectedDocument, selectDocument]);

  // Handle document type selection
  const handleDocumentSelection = async (documentType: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      selectDocument(documentType);
      
      // If we have property data, get AI suggestions for document type
      if (state.propertyData.address) {
        try {
          const suggestion = await IntelligentAIService.suggestDocumentType(state.propertyData);
          if (suggestion.recommendedType !== documentType) {
            // Show alternative suggestion but don't override user choice
            console.log('AI suggests:', suggestion.recommendedType, 'but user chose:', documentType);
          }
        } catch (error) {
          console.warn('AI document suggestion failed:', error);
        }
      }
    } catch (error) {
      setError(`Failed to select document type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step completion
  const handleStepComplete = async () => {
    if (!state.selectedDocument) return;

    try {
      setIsLoading(true);
      setError('');

      const nextStep = state.currentStep + 1;
      const totalSteps = state.selectedDocument.requiredSteps.length;

      if (nextStep > totalSteps) {
        // Final step - generate document
        await handleDocumentGeneration();
      } else {
        // Move to next step
        const success = await goToStep(nextStep);
        if (!success) {
          setError('Please complete all required fields before continuing');
        }
      }
    } catch (error) {
      setError(`Failed to proceed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step back
  const handleStepBack = async () => {
    if (state.currentStep > 1) {
      try {
        await goToStep(state.currentStep - 1);
      } catch (error) {
        setError(`Failed to go back: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Handle AI capability requests
  const handleAICapabilityRequest = async (capability: any, context: any) => {
    try {
      setIsLoading(true);
      
      const suggestions = await IntelligentAIService.executeCapability(capability, {
        stepId: context.stepId,
        currentData: context.currentData,
        documentType: context.documentType,
        propertyData: state.propertyData
      });

      // Add suggestions to the current step
      stateManager.addAISuggestions(context.stepId, suggestions);
    } catch (error) {
      console.error('AI capability request failed:', error);
      setError(`AI assistance failed: ${error instanceof Error ? error.message : 'Service unavailable'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document generation
  const handleDocumentGeneration = async () => {
    if (!state.selectedDocument) return;

    try {
      setIsLoading(true);
      setError('');

      // Validate the complete document
      const validation = await IntelligentAIService.validateDocument(
        state.selectedDocument.id,
        state.stepData
      );

      if (!validation.isValid) {
        const errorMessages = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join(', ');
        setError(`Document validation failed: ${errorMessages}`);
        return;
      }

      // Generate the document
      const response = await fetch(state.selectedDocument.backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(IntelligentAIService.getAuthToken() && {
            'Authorization': `Bearer ${IntelligentAIService.getAuthToken()}`
          })
        },
        body: JSON.stringify({
          ...state.stepData,
          propertyData: state.propertyData,
          documentType: state.selectedDocument.id
        })
      });

      if (!response.ok) {
        throw new Error(`Document generation failed: ${response.status} ${response.statusText}`);
      }

      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.selectedDocument.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Call completion callback
      if (onComplete) {
        onComplete({
          documentType: state.selectedDocument.id,
          stepData: state.stepData,
          propertyData: state.propertyData,
          generatedAt: new Date()
        });
      }
    } catch (error) {
      setError(`Document generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle property data updates (from property search)
  const handlePropertyDataUpdate = (propertyData: any) => {
    updatePropertyData(propertyData);
    
    // Get AI suggestions for document type based on property
    IntelligentAIService.suggestDocumentType(propertyData)
      .then(suggestion => {
        if (!state.selectedDocument && suggestion.confidence > 0.7) {
          // Auto-suggest document type if none selected and confidence is high
          console.log('AI suggests document type:', suggestion.recommendedType);
        }
      })
      .catch(error => {
        console.warn('AI document suggestion failed:', error);
      });
  };

  // Render document type selection if no document selected
  if (!state.selectedDocument) {
    return (
      <div className={`dynamic-wizard ${className}`}>
        <div className="wizard-header">
          <h1>Create Legal Document</h1>
          <p>Select the type of document you want to create</p>
        </div>
        
        <DocumentTypeSelector
          onSelect={handleDocumentSelection}
          propertyData={state.propertyData}
          onPropertyDataUpdate={handlePropertyDataUpdate}
          isLoading={isLoading}
        />
        
        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Get current step AI suggestions
  const currentStepConfig = state.selectedDocument.requiredSteps[state.currentStep - 1];
  const currentStepSuggestions = state.aiSuggestions[currentStepConfig.id] || [];

  return (
    <div className={`dynamic-wizard ${className}`}>
      {/* Wizard Header */}
      <div className="wizard-header">
        <div className="document-info">
          <h1>{state.selectedDocument.name}</h1>
          <p>{state.selectedDocument.description}</p>
        </div>
        
        <div className="wizard-actions">
          {onCancel && (
            <button 
              className="cancel-button"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          
          <button 
            className="change-document-button"
            onClick={() => selectDocument('')}
            disabled={isLoading}
          >
            Change Document Type
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button 
            className="error-dismiss"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Dynamic Step Renderer */}
      <DynamicStepRenderer
        documentConfig={state.selectedDocument}
        currentStep={state.currentStep}
        stepData={state.stepData}
        validationErrors={state.validationErrors}
        onFieldChange={updateField}
        onFieldsChange={updateFields}
        onStepComplete={handleStepComplete}
        onStepBack={handleStepBack}
        aiSuggestions={currentStepSuggestions}
        onApplyAI={applyAISuggestion}
        onRequestAI={handleAICapabilityRequest}
        isLoading={isLoading}
      />

      {/* Wizard Footer */}
      <div className="wizard-footer">
        <div className="performance-info">
          Session time: {Math.round((Date.now() - state.startTime.getTime()) / 1000 / 60)} minutes
        </div>
        
        <div className="legal-notice">
          <span className="legal-icon">⚖️</span>
          This document will be legally binding. Review carefully before generation.
        </div>
      </div>
    </div>
  );
}

// Export the component
export { DynamicWizard };
export type { DynamicWizardProps };

