import React, { useState, useEffect } from 'react';
import { AICapability } from '../lib/documentRegistry';
import { AISuggestion, WizardContext } from '../lib/wizardState';
import { AdvancedAIService, AIAction } from '../services/advancedAIService';
import { NaturalLanguageInterface } from './NaturalLanguageInterface';

interface AIAssistancePanelProps {
  suggestions: AISuggestion[];
  onApply: (suggestion: AISuggestion) => void;
  capabilities: AICapability[];
  stepId: string;
  onRequestCapability: (capability: AICapability) => void;
  onToggle: () => void;
  isExpanded: boolean;
  className?: string;
  context: WizardContext;
  onFieldUpdate: (field: string, value: any) => void;
  onActionExecute?: (action: AIAction) => void;
}

export function AIAssistancePanel({
  suggestions,
  onApply,
  capabilities,
  stepId,
  onRequestCapability,
  onToggle,
  isExpanded,
  className = '',
  context,
  onFieldUpdate,
  onActionExecute
}: AIAssistancePanelProps) {
  // Enhanced AI assistance with natural language processing
  const handleAIAction = (action: AIAction) => {
    if (onActionExecute) {
      onActionExecute(action);
    }
  };

  const handleCapabilityRequest = (capability: AICapability) => {
    onRequestCapability(capability);
  };

  const getCapabilityInfo = (capability: AICapability) => {
    const capabilityMap: Record<AICapability, { icon: string; label: string; description: string }> = {
      propertySearch: {
        icon: '🔍',
        label: 'Property Search',
        description: 'Search and verify property information'
      },
      titlePointIntegration: {
        icon: '🏢',
        label: 'Pull Title Data',
        description: 'Get current ownership and title information'
      },
      chainOfTitle: {
        icon: '🔗',
        label: 'Chain of Title',
        description: 'Get property ownership history and analysis'
      },
      taxCalculation: {
        icon: '💰',
        label: 'Calculate Tax',
        description: 'Automatically calculate documentary transfer tax'
      },
      riskAnalysis: {
        icon: '⚠️',
        label: 'Risk Analysis',
        description: 'Identify potential title and legal issues'
      },
      currentOwnerPrefill: {
        icon: '👤',
        label: 'Fill Owner Names',
        description: 'Auto-fill current owner information'
      },
      vestingAdvice: {
        icon: '🏠',
        label: 'Vesting Advice',
        description: 'Suggest how new owners should hold title'
      },
      legalValidation: {
        icon: '⚖️',
        label: 'Legal Check',
        description: 'Validate document for legal compliance'
      },
      exemptionCheck: {
        icon: '💸',
        label: 'Check Exemptions',
        description: 'Identify available tax exemptions'
      },
      marriageValidation: {
        icon: '💑',
        label: 'Verify Marriage',
        description: 'Validate marriage status for interspousal transfers'
      },
      riskWarnings: {
        icon: '🚨',
        label: 'Risk Warnings',
        description: 'Highlight potential risks and issues'
      },
      // Add more capability mappings as needed
      legalDescriptionValidation: {
        icon: '📋',
        label: 'Validate Legal Description',
        description: 'Check legal description completeness'
      },
      autoFillFromProperty: {
        icon: '✨',
        label: 'Auto-Fill',
        description: 'Fill fields from property data'
      },
      titleCompanyLookup: {
        icon: '🏢',
        label: 'Title Company',
        description: 'Look up title company information'
      },
      jurisdictionLookup: {
        icon: '🗺️',
        label: 'Jurisdiction',
        description: 'Determine tax jurisdiction'
      },
      nameValidation: {
        icon: '✅',
        label: 'Validate Names',
        description: 'Check name formatting and accuracy'
      },
      completenessCheck: {
        icon: '📝',
        label: 'Completeness Check',
        description: 'Verify all required information is present'
      },
      complianceVerification: {
        icon: '🛡️',
        label: 'Compliance Check',
        description: 'Ensure legal and regulatory compliance'
      },
      relationshipAnalysis: {
        icon: '👥',
        label: 'Relationship Analysis',
        description: 'Analyze relationships between parties'
      },
      riskValidation: {
        icon: '🔍',
        label: 'Risk Validation',
        description: 'Validate and assess risks'
      },
      communityPropertyAnalysis: {
        icon: '🏡',
        label: 'Community Property',
        description: 'Analyze community property implications'
      },
      exemptionValidation: {
        icon: '✅',
        label: 'Exemption Validation',
        description: 'Validate tax exemption claims'
      }
    };

    return capabilityMap[capability] || {
      icon: '🤖',
      label: capability,
      description: 'AI capability'
    };
  };



  return (
    <div className={`ai-assistance-panel ${className} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header" onClick={onToggle}>
        <div className="header-content">
          <h3 className="panel-title">
            <span className="ai-icon">🧠</span>
            AI Assistance
          </h3>
          <div className="panel-status">
            {suggestions.length > 0 && (
              <span className="suggestions-count">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="panel-content">
          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4 className="section-title">💡 Smart Suggestions</h4>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    suggestion={suggestion}
                    onApply={() => onApply(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* AI Capabilities */}
          {capabilities.length > 0 && (
            <div className="capabilities-section">
              <h4 className="section-title">🚀 AI Features Available</h4>
              <div className="capability-buttons">
                {capabilities.map((capability) => {
                  const info = getCapabilityInfo(capability);
                  return (
                    <AICapabilityButton
                      key={capability}
                      icon={info.icon}
                      label={info.label}
                      description={info.description}
                      onClick={() => handleCapabilityRequest(capability)}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Enhanced Natural Language Interface */}
          <div className="natural-language-section">
            <NaturalLanguageInterface
              context={context}
              onActionExecute={onActionExecute || (() => {})}
              onFieldUpdate={onFieldUpdate}
              className="integrated-nl-interface"
              placeholder="Ask me anything about this step or tell me what you'd like to do..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Supporting Components

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
}

function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  };

  const getSourceIcon = (source: AISuggestion['source']): string => {
    const sourceIcons = {
      titlepoint: '🏢',
      property_records: '📋',
      ai_inference: '🧠',
      user_input: '👤'
    };
    return sourceIcons[source] || '🤖';
  };

  return (
    <div className="suggestion-card">
      <div className="suggestion-header">
        <div className="field-info">
          <span className="field-name">{suggestion.field}</span>
          <span className="source-info">
            {getSourceIcon(suggestion.source)} {suggestion.source.replace('_', ' ')}
          </span>
        </div>
        <span className={`confidence confidence-${getConfidenceLevel(suggestion.confidence)}`}>
          {Math.round(suggestion.confidence * 100)}% confident
        </span>
      </div>
      
      <div className="suggestion-value">
        <strong>Suggested value:</strong>
        <div className="value-display">{suggestion.value}</div>
      </div>
      
      <div className="suggestion-reasoning">
        <strong>Why:</strong> {suggestion.reasoning}
      </div>
      
      {suggestion.legalImplications && (
        <div className="legal-implications">
          <strong>⚖️ Legal note:</strong> {suggestion.legalImplications}
        </div>
      )}
      
      <div className="suggestion-actions">
        <button 
          className="apply-button"
          onClick={onApply}
        >
          Apply Suggestion
        </button>
        
        {suggestion.requiresVerification && (
          <span className="verification-note">
            ⚠️ Please verify this information
          </span>
        )}
      </div>
    </div>
  );
}

interface AICapabilityButtonProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

function AICapabilityButton({ icon, label, description, onClick }: AICapabilityButtonProps) {
  return (
    <button className="ai-capability-button" onClick={onClick}>
      <div className="capability-icon">{icon}</div>
      <div className="capability-content">
        <div className="capability-label">{label}</div>
        <div className="capability-description">{description}</div>
      </div>
    </button>
  );
}

export type { AIAssistancePanelProps };
