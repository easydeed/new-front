import React, { useState, useEffect } from 'react';
import { DOCUMENT_REGISTRY, DocumentConfig } from '../lib/documentRegistry';
import { PropertyData } from '../lib/wizardState';
import { IntelligentAIService, DocumentSuggestion } from '../services/aiService';
import { EnhancedPropertySearch } from './EnhancedPropertySearch';

interface DocumentTypeSelectorProps {
  onSelect: (documentType: string) => void;
  propertyData: PropertyData;
  onPropertyDataUpdate: (propertyData: Partial<PropertyData>) => void;
  isLoading?: boolean;
  className?: string;
}

export function DocumentTypeSelector({
  onSelect,
  propertyData,
  onPropertyDataUpdate,
  isLoading = false,
  className = ''
}: DocumentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [aiSuggestion, setAISuggestion] = useState<DocumentSuggestion | null>(null);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Get AI suggestion when property data is available
  useEffect(() => {
    if (propertyData.address && propertyData.apn) {
      IntelligentAIService.suggestDocumentType(propertyData)
        .then(setAISuggestion)
        .catch(error => {
          console.warn('AI document suggestion failed:', error);
        });
    }
  }, [propertyData]);

  const handleDocumentSelect = (documentType: string) => {
    setSelectedType(documentType);
  };

  const handleConfirmSelection = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };



  const getDocumentsByComplexity = () => {
    const documents = Object.values(DOCUMENT_REGISTRY);
    return {
      simple: documents.filter(doc => doc.complexity === 'simple'),
      moderate: documents.filter(doc => doc.complexity === 'moderate'),
      complex: documents.filter(doc => doc.complexity === 'complex')
    };
  };

  const documentsByComplexity = getDocumentsByComplexity();

  return (
    <div className={`document-type-selector ${className}`}>
      {/* Enhanced Property Search Section */}
      <div className="property-search-section">
        <EnhancedPropertySearch
          onPropertyVerified={(data) => {
            onPropertyDataUpdate(data);
            setShowPropertySearch(false);
          }}
          onDocumentSuggestion={(suggestion) => {
            setAISuggestion(suggestion);
          }}
          onError={(error) => {
            console.error('Property search error:', error);
          }}
          showDocumentSuggestions={true}
          className="integrated-property-search"
        />
      </div>

      {/* AI Recommendation Section */}
      {aiSuggestion && (
        <div className="ai-recommendation-section">
          <h3>🤖 AI Recommendation</h3>
          <div className="ai-suggestion-card">
            <div className="suggestion-header">
              <div className="recommended-doc">
                <strong>Recommended: {DOCUMENT_REGISTRY[aiSuggestion.recommendedType]?.name}</strong>
                <span className="confidence-badge">
                  {Math.round(aiSuggestion.confidence * 100)}% confident
                </span>
              </div>
            </div>
            <div className="suggestion-reasoning">
              <strong>Why:</strong> {aiSuggestion.reasoning}
            </div>
            {aiSuggestion.riskFactors.length > 0 && (
              <div className="risk-factors">
                <strong>⚠️ Consider:</strong> {aiSuggestion.riskFactors.join(', ')}
              </div>
            )}
            <button
              className="accept-recommendation-button"
              onClick={() => handleDocumentSelect(aiSuggestion.recommendedType)}
            >
              Use AI Recommendation
            </button>
          </div>
          
          {aiSuggestion.alternatives.length > 0 && (
            <div className="alternatives-section">
              <h4>Alternative Options:</h4>
              <div className="alternatives-list">
                {aiSuggestion.alternatives.map((alt, index) => (
                  <div key={index} className="alternative-card">
                    <div className="alt-header">
                      <span className="alt-name">{DOCUMENT_REGISTRY[alt.type]?.name}</span>
                      <span className="alt-confidence">{Math.round(alt.confidence * 100)}%</span>
                    </div>
                    <div className="alt-reasoning">{alt.reasoning}</div>
                    <div className="alt-pros-cons">
                      <div className="pros">
                        <strong>Pros:</strong> {alt.pros.join(', ')}
                      </div>
                      <div className="cons">
                        <strong>Cons:</strong> {alt.cons.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Type Selection */}
      <div className="document-selection-section">
        <h3>Step 2: Choose Document Type</h3>
        
        {/* Simple Documents */}
        <div className="complexity-group">
          <h4 className="complexity-title">
            <span className="complexity-icon">🟢</span>
            Simple Documents (4-6 minutes)
          </h4>
          <div className="documents-grid">
            {documentsByComplexity.simple.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isSelected={selectedType === doc.id}
                isRecommended={aiSuggestion?.recommendedType === doc.id}
                onClick={() => handleDocumentSelect(doc.id)}
              />
            ))}
          </div>
        </div>

        {/* Moderate Documents */}
        <div className="complexity-group">
          <h4 className="complexity-title">
            <span className="complexity-icon">🟡</span>
            Moderate Documents (5-8 minutes)
          </h4>
          <div className="documents-grid">
            {documentsByComplexity.moderate.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isSelected={selectedType === doc.id}
                isRecommended={aiSuggestion?.recommendedType === doc.id}
                onClick={() => handleDocumentSelect(doc.id)}
              />
            ))}
          </div>
        </div>

        {/* Complex Documents */}
        <div className="complexity-group">
          <h4 className="complexity-title">
            <span className="complexity-icon">🔴</span>
            Complex Documents (8-12 minutes)
          </h4>
          <div className="documents-grid">
            {documentsByComplexity.complex.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isSelected={selectedType === doc.id}
                isRecommended={aiSuggestion?.recommendedType === doc.id}
                onClick={() => handleDocumentSelect(doc.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selection Confirmation */}
      {selectedType && (
        <div className="selection-confirmation">
          <div className="selected-document-info">
            <h4>Selected: {DOCUMENT_REGISTRY[selectedType].name}</h4>
            <p>{DOCUMENT_REGISTRY[selectedType].description}</p>
            <div className="document-details">
              <span className="estimated-time">
                ⏱️ {DOCUMENT_REGISTRY[selectedType].estimatedTime}
              </span>
              <span className="complexity">
                📊 {DOCUMENT_REGISTRY[selectedType].complexity} complexity
              </span>
              <span className="steps-count">
                📋 {DOCUMENT_REGISTRY[selectedType].requiredSteps.length} steps
              </span>
            </div>
            
            {DOCUMENT_REGISTRY[selectedType].warnings && (
              <div className="document-warnings">
                <h5>⚠️ Important Notes:</h5>
                <ul>
                  {DOCUMENT_REGISTRY[selectedType].warnings!.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            className="start-wizard-button"
            onClick={handleConfirmSelection}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : `Start ${DOCUMENT_REGISTRY[selectedType].name} Wizard`}
          </button>
        </div>
      )}
    </div>
  );
}

// Document Card Component
interface DocumentCardProps {
  document: DocumentConfig;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
}

function DocumentCard({ document, isSelected, isRecommended, onClick }: DocumentCardProps) {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '#22c55e';
      case 'moderate': return '#f59e0b';
      case 'complex': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div 
      className={`document-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
      onClick={onClick}
    >
      {isRecommended && (
        <div className="recommendation-badge">
          🤖 AI Recommended
        </div>
      )}
      
      <div className="document-header">
        <h5 className="document-name">{document.name}</h5>
        <div 
          className="complexity-indicator"
          style={{ backgroundColor: getComplexityColor(document.complexity) }}
        >
          {document.complexity}
        </div>
      </div>
      
      <p className="document-description">{document.description}</p>
      
      <div className="document-meta">
        <div className="meta-item">
          <span className="meta-icon">⏱️</span>
          <span className="meta-text">{document.estimatedTime}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">📋</span>
          <span className="meta-text">{document.requiredSteps.length} steps</span>
        </div>
      </div>
      
      <div className="document-features">
        <div className="features-title">AI Features:</div>
        <div className="features-list">
          {document.aiCapabilities.slice(0, 3).map((capability, index) => (
            <span key={index} className="feature-tag">
              {capability.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
          ))}
          {document.aiCapabilities.length > 3 && (
            <span className="feature-tag more">
              +{document.aiCapabilities.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export type { DocumentTypeSelectorProps };
