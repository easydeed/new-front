import { DocumentConfig, getDocumentConfig, validateDocumentData } from './documentRegistry';
import { z } from 'zod';
import { useState, useEffect } from 'react';

// Core state interfaces
export interface PropertyData {
  address: string;
  apn: string;
  county: string;
  legalDescription: string;
  currentOwners: Owner[];
  titlePointData?: TitlePointData;
  propertyType?: string;
  transactionContext?: string;
}

export interface Owner {
  name: string;
  vestingType?: string;
  percentage?: number;
}

export interface TitlePointData {
  liens?: Lien[];
  encumbrances?: Encumbrance[];
  taxInfo?: TaxInfo;
  chainOfTitle?: ChainOfTitleEntry[];
  lastUpdated: Date;
}

export interface Lien {
  type: string;
  amount: string;
  creditor: string;
  recordingDate: Date;
  documentNumber: string;
}

export interface Encumbrance {
  type: string;
  description: string;
  recordingDate: Date;
  documentNumber: string;
}

export interface TaxInfo {
  assessedValue: string;
  taxYear: string;
  taxAmount: string;
  delinquent: boolean;
}

export interface ChainOfTitleEntry {
  date: Date;
  grantor: string;
  grantee: string;
  documentType: string;
  consideration?: string;
  recordingInfo: string;
  riskFactors?: string[];
}

export interface AISuggestion {
  field: string;
  value: any;
  confidence: number;
  reasoning: string;
  source: 'titlepoint' | 'property_records' | 'ai_inference' | 'user_input';
  requiresVerification: boolean;
  legalImplications?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  legalBasis?: string;
  suggestion?: string;
}

export interface WizardState {
  // Document selection
  selectedDocument: DocumentConfig | null;
  
  // Universal property data
  propertyData: PropertyData;
  
  // Dynamic step data based on document type
  stepData: Record<string, Record<string, any>>;
  
  // Progress tracking
  currentStep: number;
  completedSteps: Set<number>;
  validationErrors: Record<string, ValidationError[]>;
  
  // AI assistance
  aiSuggestions: Record<string, AISuggestion[]>;
  autoFilledFields: Set<string>;
  
  // User interaction
  userPreferences: {
    autoSave: boolean;
    showAIHelp: boolean;
    skipOptionalSteps: boolean;
  };
  
  // Persistence
  lastSaved: Date;
  isDirty: boolean;
  sessionId: string;
  
  // Performance tracking
  startTime: Date;
  stepTimes: Record<number, { start: Date; end?: Date }>;
}

export interface WizardContext {
  documentType: string;
  currentStep: number;
  propertyData: PropertyData;
  stepData: Record<string, Record<string, any>>;
}

// State change events
export type StateChangeEvent = 
  | { type: 'DOCUMENT_SELECTED'; payload: { documentType: string } }
  | { type: 'STEP_CHANGED'; payload: { step: number } }
  | { type: 'FIELD_UPDATED'; payload: { stepId: string; field: string; value: any } }
  | { type: 'AI_SUGGESTION_APPLIED'; payload: { stepId: string; suggestion: AISuggestion } }
  | { type: 'VALIDATION_ERROR'; payload: { stepId: string; errors: ValidationError[] } }
  | { type: 'STATE_RESTORED'; payload: { state: Partial<WizardState> } };

export class WizardStateManager {
  private state: WizardState;
  private listeners: Set<(state: WizardState, event?: StateChangeEvent) => void> = new Set();
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private performanceMonitor: Map<string, number> = new Map();

  constructor(initialState?: Partial<WizardState>) {
    this.state = {
      ...this.getInitialState(),
      ...initialState
    };
    
    // Try to restore from storage
    const restored = this.loadFromStorage();
    if (restored) {
      this.state = { ...this.state, ...restored };
      this.notifyListeners({ type: 'STATE_RESTORED', payload: { state: restored } });
    }
    
    this.setupAutoSave();
    this.startPerformanceTracking();
  }

  // Public API methods
  getState(): WizardState {
    return { ...this.state };
  }

  subscribe(listener: (state: WizardState, event?: StateChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Document selection
  selectDocument(documentType: string): void {
    const config = getDocumentConfig(documentType);
    if (!config) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const event: StateChangeEvent = { type: 'DOCUMENT_SELECTED', payload: { documentType } };
    
    this.updateState({
      selectedDocument: config,
      currentStep: 1,
      stepData: {},
      completedSteps: new Set(),
      validationErrors: {},
      aiSuggestions: {},
      autoFilledFields: new Set(),
      startTime: new Date(),
      stepTimes: { 1: { start: new Date() } }
    });

    this.notifyListeners(event);
  }

  // Step navigation with validation
  async goToStep(stepNumber: number): Promise<boolean> {
    if (!this.state.selectedDocument) {
      throw new Error('No document selected');
    }

    const totalSteps = this.state.selectedDocument.requiredSteps.length;
    if (stepNumber < 1 || stepNumber > totalSteps) {
      throw new Error(`Invalid step number: ${stepNumber}. Must be between 1 and ${totalSteps}`);
    }

    // Validate current step before proceeding forward
    if (stepNumber > this.state.currentStep) {
      const isValid = await this.validateCurrentStep();
      if (!isValid) {
        return false;
      }
    }

    // End timing for current step
    if (this.state.stepTimes[this.state.currentStep]) {
      this.state.stepTimes[this.state.currentStep].end = new Date();
    }

    // Start timing for new step
    const stepTimes = {
      ...this.state.stepTimes,
      [stepNumber]: { start: new Date() }
    };

    const event: StateChangeEvent = { type: 'STEP_CHANGED', payload: { step: stepNumber } };
    
    this.updateState({
      currentStep: stepNumber,
      stepTimes
    });

    this.notifyListeners(event);
    return true;
  }

  // Dynamic field updates with validation
  updateField(stepId: string, fieldName: string, value: any): void {
    const newStepData = {
      ...this.state.stepData,
      [stepId]: {
        ...this.state.stepData[stepId],
        [fieldName]: value
      }
    };

    const event: StateChangeEvent = { 
      type: 'FIELD_UPDATED', 
      payload: { stepId, field: fieldName, value } 
    };
    
    this.updateState({
      stepData: newStepData,
      isDirty: true
    });

    // Trigger real-time validation
    this.validateField(stepId, fieldName, value);
    this.notifyListeners(event);
  }

  // Batch field updates
  updateFields(stepId: string, fields: Record<string, any>): void {
    const newStepData = {
      ...this.state.stepData,
      [stepId]: {
        ...this.state.stepData[stepId],
        ...fields
      }
    };
    
    this.updateState({
      stepData: newStepData,
      isDirty: true
    });

    // Validate all updated fields
    Object.entries(fields).forEach(([field, value]) => {
      this.validateField(stepId, field, value);
    });

    this.notifyListeners();
  }

  // AI assistance integration
  async applyAISuggestion(stepId: string, suggestion: AISuggestion): Promise<void> {
    // Apply the suggestion
    this.updateField(stepId, suggestion.field, suggestion.value);
    
    // Mark as auto-filled
    const autoFilledFields = new Set(this.state.autoFilledFields);
    autoFilledFields.add(`${stepId}.${suggestion.field}`);
    
    const event: StateChangeEvent = { 
      type: 'AI_SUGGESTION_APPLIED', 
      payload: { stepId, suggestion } 
    };
    
    this.updateState({
      autoFilledFields
    });

    this.notifyListeners(event);
  }

  // Add AI suggestions
  addAISuggestions(stepId: string, suggestions: AISuggestion[]): void {
    const aiSuggestions = {
      ...this.state.aiSuggestions,
      [stepId]: suggestions
    };
    
    this.updateState({
      aiSuggestions
    });

    this.notifyListeners();
  }

  // Property data management
  updatePropertyData(propertyData: Partial<PropertyData>): void {
    this.updateState({
      propertyData: {
        ...this.state.propertyData,
        ...propertyData
      },
      isDirty: true
    });

    this.notifyListeners();
  }

  // Validation methods
  private async validateCurrentStep(): Promise<boolean> {
    if (!this.state.selectedDocument) return false;
    
    const currentStepConfig = this.state.selectedDocument.requiredSteps[this.state.currentStep - 1];
    const stepData = this.state.stepData[currentStepConfig.id] || {};
    
    try {
      // Use document-specific validation schema
      const schema = this.getStepValidationSchema(currentStepConfig.id);
      await schema.parseAsync(stepData);
      
      // Clear validation errors
      this.clearValidationErrors(currentStepConfig.id);
      
      // Mark step as completed
      const completedSteps = new Set(this.state.completedSteps);
      completedSteps.add(this.state.currentStep);
      
      this.updateState({
        completedSteps
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error' as const,
          suggestion: this.getValidationSuggestion(err)
        }));
        
        this.setValidationErrors(currentStepConfig.id, validationErrors);
      }
      return false;
    }
  }

  private validateField(stepId: string, fieldName: string, value: any): void {
    // Real-time field validation logic
    const errors: ValidationError[] = [];
    
    // Basic validation rules
    if (typeof value === 'string' && value.trim() === '') {
      errors.push({
        field: fieldName,
        message: 'This field is required',
        severity: 'error'
      });
    }
    
    // Set or clear errors
    if (errors.length > 0) {
      this.setValidationErrors(stepId, errors);
    } else {
      this.clearFieldValidationErrors(stepId, fieldName);
    }
  }

  private getStepValidationSchema(stepId: string): z.ZodSchema {
    // Return appropriate validation schema based on step
    // This would be expanded based on the document type and step
    return z.object({});
  }

  private getValidationSuggestion(error: z.ZodIssue): string {
    // Provide helpful suggestions based on validation errors
    switch (error.code) {
      case 'too_small':
        return 'Please provide more information';
      case 'invalid_type':
        return 'Please check the format of this field';
      default:
        return 'Please correct this field';
    }
  }

  // Error management
  private setValidationErrors(stepId: string, errors: ValidationError[]): void {
    const validationErrors = {
      ...this.state.validationErrors,
      [stepId]: errors
    };
    
    const event: StateChangeEvent = { 
      type: 'VALIDATION_ERROR', 
      payload: { stepId, errors } 
    };
    
    this.updateState({
      validationErrors
    });

    this.notifyListeners(event);
  }

  private clearValidationErrors(stepId: string): void {
    const validationErrors = { ...this.state.validationErrors };
    delete validationErrors[stepId];
    
    this.updateState({
      validationErrors
    });

    this.notifyListeners();
  }

  private clearFieldValidationErrors(stepId: string, fieldName: string): void {
    const stepErrors = this.state.validationErrors[stepId] || [];
    const filteredErrors = stepErrors.filter(error => error.field !== fieldName);
    
    if (filteredErrors.length !== stepErrors.length) {
      this.setValidationErrors(stepId, filteredErrors);
    }
  }

  // Utility methods
  getCurrentStepConfig() {
    if (!this.state.selectedDocument) return null;
    return this.state.selectedDocument.requiredSteps[this.state.currentStep - 1];
  }

  getStepProgress(): { current: number; total: number; percentage: number } {
    const total = this.state.selectedDocument?.requiredSteps.length || 0;
    const current = this.state.currentStep;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return { current, total, percentage };
  }

  getCompletedStepsCount(): number {
    return this.state.completedSteps.size;
  }

  hasValidationErrors(): boolean {
    return Object.values(this.state.validationErrors).some(errors => 
      errors.some(error => error.severity === 'error')
    );
  }

  getEstimatedTimeRemaining(): string {
    if (!this.state.selectedDocument) return 'Unknown';
    
    const totalSteps = this.state.selectedDocument.requiredSteps.length;
    const remainingSteps = totalSteps - this.state.currentStep + 1;
    const avgTimePerStep = 2; // minutes
    const estimatedMinutes = remainingSteps * avgTimePerStep;
    
    return `${estimatedMinutes}-${estimatedMinutes + 2} minutes`;
  }

  // Persistence methods
  private setupAutoSave(): void {
    if (this.state.userPreferences.autoSave) {
      this.autoSaveInterval = setInterval(() => {
        if (this.state.isDirty) {
          this.saveToStorage();
        }
      }, 5000); // Auto-save every 5 seconds
    }
  }

  private saveToStorage(): void {
    try {
      const serializedState = {
        ...this.state,
        lastSaved: new Date().toISOString(),
        completedSteps: Array.from(this.state.completedSteps),
        autoFilledFields: Array.from(this.state.autoFilledFields)
      };
      
      localStorage.setItem('wizardState', JSON.stringify(serializedState));
      
      this.updateState({ 
        isDirty: false, 
        lastSaved: new Date() 
      });
    } catch (error) {
      console.error('Failed to save wizard state:', error);
      // Continue without saving rather than breaking the app
    }
  }

  private loadFromStorage(): Partial<WizardState> | null {
    try {
      const stored = localStorage.getItem('wizardState');
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Validate and transform stored data
      if (this.isValidStoredState(parsed)) {
        return {
          ...parsed,
          lastSaved: new Date(parsed.lastSaved),
          completedSteps: new Set(parsed.completedSteps || []),
          autoFilledFields: new Set(parsed.autoFilledFields || []),
          startTime: new Date(parsed.startTime || Date.now())
        };
      }
    } catch (error) {
      console.error('Failed to load wizard state:', error);
    }
    
    return null;
  }

  private isValidStoredState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      typeof state.sessionId === 'string' &&
      typeof state.currentStep === 'number'
    );
  }

  // Performance tracking
  private startPerformanceTracking(): void {
    this.performanceMonitor.set('session_start', Date.now());
  }

  getPerformanceMetrics() {
    const sessionStart = this.performanceMonitor.get('session_start') || Date.now();
    const sessionDuration = Date.now() - sessionStart;
    
    return {
      sessionDuration,
      currentStep: this.state.currentStep,
      completedSteps: this.state.completedSteps.size,
      totalSteps: this.state.selectedDocument?.requiredSteps.length || 0,
      stepTimes: this.state.stepTimes,
      hasErrors: this.hasValidationErrors()
    };
  }

  // Cleanup
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Final save
    if (this.state.isDirty) {
      this.saveToStorage();
    }
    
    this.listeners.clear();
  }

  // Private helper methods
  private updateState(updates: Partial<WizardState>): void {
    this.state = { ...this.state, ...updates };
  }

  private notifyListeners(event?: StateChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, event);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  private getInitialState(): WizardState {
    return {
      selectedDocument: null,
      propertyData: {
        address: '',
        apn: '',
        county: '',
        legalDescription: '',
        currentOwners: []
      },
      stepData: {},
      currentStep: 1,
      completedSteps: new Set(),
      validationErrors: {},
      aiSuggestions: {},
      autoFilledFields: new Set(),
      userPreferences: {
        autoSave: true,
        showAIHelp: true,
        skipOptionalSteps: false
      },
      lastSaved: new Date(),
      isDirty: false,
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      stepTimes: {}
    };
  }

  private generateSessionId(): string {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// React hook for using wizard state
export function useWizardState(initialState?: Partial<WizardState>) {
  const [stateManager] = useState(() => new WizardStateManager(initialState));
  const [state, setState] = useState(stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      stateManager.destroy();
    };
  }, [stateManager]);

  return {
    state,
    stateManager,
    // Convenience methods
    selectDocument: (type: string) => stateManager.selectDocument(type),
    goToStep: (step: number) => stateManager.goToStep(step),
    updateField: (stepId: string, field: string, value: any) => 
      stateManager.updateField(stepId, field, value),
    updateFields: (stepId: string, fields: Record<string, any>) => 
      stateManager.updateFields(stepId, fields),
    applyAISuggestion: (stepId: string, suggestion: AISuggestion) => 
      stateManager.applyAISuggestion(stepId, suggestion),
    updatePropertyData: (data: Partial<PropertyData>) => 
      stateManager.updatePropertyData(data)
  };
}

// Export types
export type { ValidationError, AISuggestion, WizardContext, StateChangeEvent };
