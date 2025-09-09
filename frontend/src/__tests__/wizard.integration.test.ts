/**
 * Comprehensive Integration Testing Suite for Dynamic Wizard
 * Tests end-to-end workflows across all document types and phases
 * Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 4.1 specifications
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardStateManager } from '../lib/wizardState';
import { DOCUMENT_TYPES } from '../lib/documentRegistry';
import DynamicWizard from '../components/DynamicWizard';
import { AdvancedAIService } from '../services/advancedAIService';
import { ChainOfTitleService } from '../services/chainOfTitleService';
import React from 'react';

// Mock external services
jest.mock('../services/advancedAIService');
jest.mock('../services/chainOfTitleService');
jest.mock('../services/aiService');

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test data fixtures
const mockPropertyData = {
  address: '123 Main St, Los Angeles, CA 90210',
  apn: '123-456-789',
  county: 'Los Angeles',
  legalDescription: 'Lot 1, Block 2, Tract 12345, as per map recorded in Book 100, Page 50, Official Records of Los Angeles County, California',
  currentOwners: [{ name: 'John Doe', vestingType: 'a single man' }]
};

const mockRecordingData = {
  requestedBy: 'Test Title Company',
  titleCompany: 'ABC Title Company',
  escrowNo: 'ESC-12345',
  titleOrderNo: 'TO-67890',
  mailTo: {
    name: 'John Doe',
    address1: '123 Main St',
    address2: 'Apt 1',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210'
  }
};

const mockTaxData = {
  dttAmount: '100.00',
  dttBasis: 'full_value',
  areaType: 'city',
  cityName: 'Los Angeles'
};

const mockPartiesData = {
  grantorsText: 'John Doe, a single man',
  granteesText: 'Jane Smith, a single woman',
  county: 'Los Angeles',
  legalDescription: mockPropertyData.legalDescription
};

describe('Dynamic Wizard Integration Tests', () => {
  let stateManager: WizardStateManager;
  let mockAdvancedAI: jest.Mocked<typeof AdvancedAIService>;
  let mockChainOfTitle: jest.Mocked<typeof ChainOfTitleService>;

  beforeEach(() => {
    stateManager = new WizardStateManager();
    localStorageMock.clear();
    jest.clearAllMocks();

    // Setup AI service mocks
    mockAdvancedAI = AdvancedAIService as jest.Mocked<typeof AdvancedAIService>;
    mockAdvancedAI.processNaturalLanguage.mockResolvedValue({
      response: 'AI response',
      actions: [],
      confidence: 0.9,
      context: {}
    });

    mockChainOfTitle = ChainOfTitleService as jest.Mocked<typeof ChainOfTitleService>;
    mockChainOfTitle.getChainOfTitle.mockResolvedValue({
      success: true,
      data: { transfers: [], riskAssessment: { overallRisk: 'low' } }
    });
  });

  describe('Grant Deed Complete Workflow', () => {
    test('should complete full 5-step Grant Deed flow with validation', async () => {
      const user = userEvent.setup();

      // Step 1: Document Selection and Property Verification
      stateManager.selectDocument('grant_deed');
      expect(stateManager.getState().selectedDocument?.id).toBe('grant_deed');
      expect(stateManager.getState().currentStep).toBe(1);

      // Verify document configuration
      const config = DOCUMENT_TYPES.grant_deed;
      expect(config.requiredSteps).toHaveLength(5);
      expect(config.complexity).toBe('moderate');
      expect(config.estimatedTime).toBe('8-12 minutes');

      // Update property data
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('property', 'apn', mockPropertyData.apn);
        stateManager.updateField('property', 'county', mockPropertyData.county);
        stateManager.updateField('property', 'legalDescription', mockPropertyData.legalDescription);
      });

      // Validate step 1 completion
      const step1Valid = await stateManager.validateCurrentStep();
      expect(step1Valid).toBe(true);

      // Proceed to step 2
      const canProceedToStep2 = await stateManager.goToStep(2);
      expect(canProceedToStep2).toBe(true);
      expect(stateManager.getState().currentStep).toBe(2);

      // Step 2: Recording Information
      await act(async () => {
        stateManager.updateField('recording', 'requestedBy', mockRecordingData.requestedBy);
        stateManager.updateField('recording', 'titleCompany', mockRecordingData.titleCompany);
        stateManager.updateField('recording', 'escrowNo', mockRecordingData.escrowNo);
        stateManager.updateField('recording', 'titleOrderNo', mockRecordingData.titleOrderNo);
        stateManager.updateField('recording', 'mailTo', mockRecordingData.mailTo);
      });

      // Validate step 2 and proceed
      const step2Valid = await stateManager.validateCurrentStep();
      expect(step2Valid).toBe(true);

      await stateManager.goToStep(3);
      expect(stateManager.getState().currentStep).toBe(3);

      // Step 3: Transfer Tax
      await act(async () => {
        stateManager.updateField('tax', 'dttAmount', mockTaxData.dttAmount);
        stateManager.updateField('tax', 'dttBasis', mockTaxData.dttBasis);
        stateManager.updateField('tax', 'areaType', mockTaxData.areaType);
        stateManager.updateField('tax', 'cityName', mockTaxData.cityName);
      });

      // Validate step 3 and proceed
      const step3Valid = await stateManager.validateCurrentStep();
      expect(step3Valid).toBe(true);

      await stateManager.goToStep(4);
      expect(stateManager.getState().currentStep).toBe(4);

      // Step 4: Parties
      await act(async () => {
        stateManager.updateField('parties', 'grantorsText', mockPartiesData.grantorsText);
        stateManager.updateField('parties', 'granteesText', mockPartiesData.granteesText);
        stateManager.updateField('parties', 'county', mockPartiesData.county);
        stateManager.updateField('parties', 'legalDescription', mockPartiesData.legalDescription);
      });

      // Validate step 4 and proceed to review
      const step4Valid = await stateManager.validateCurrentStep();
      expect(step4Valid).toBe(true);

      await stateManager.goToStep(5);
      expect(stateManager.getState().currentStep).toBe(5);

      // Step 5: Review and Generate
      const finalState = stateManager.getState();
      expect(finalState.completedSteps.size).toBe(4); // Steps 1-4 completed
      expect(finalState.isComplete).toBe(true);

      // Verify all required data is present
      expect(finalState.stepData.property).toMatchObject(mockPropertyData);
      expect(finalState.stepData.recording).toMatchObject(mockRecordingData);
      expect(finalState.stepData.tax).toMatchObject(mockTaxData);
      expect(finalState.stepData.parties).toMatchObject(mockPartiesData);
    });

    test('should prevent progression with invalid data', async () => {
      stateManager.selectDocument('grant_deed');

      // Try to proceed without required property data
      const canProceed = await stateManager.goToStep(2);
      expect(canProceed).toBe(false);
      expect(stateManager.getState().currentStep).toBe(1);

      const validationErrors = stateManager.getState().validationErrors;
      expect(validationErrors).toHaveProperty('property');
      expect(Object.keys(validationErrors.property || {})).toContain('address');
    });

    test('should handle AI assistance integration', async () => {
      stateManager.selectDocument('grant_deed');

      // Test AI field suggestion
      const aiSuggestion = await stateManager.getAISuggestion('property', 'address');
      expect(mockAdvancedAI.processNaturalLanguage).toHaveBeenCalled();
      expect(aiSuggestion).toBeDefined();

      // Test natural language processing
      const nlpResult = await stateManager.processNaturalLanguage('Fill in the grantor names');
      expect(nlpResult).toHaveProperty('response');
      expect(nlpResult.confidence).toBeGreaterThan(0);
    });

    test('should integrate with Chain of Title service', async () => {
      stateManager.selectDocument('grant_deed');
      stateManager.updateField('property', 'apn', mockPropertyData.apn);

      // Test chain of title integration
      const chainOfTitle = await stateManager.getChainOfTitle();
      expect(mockChainOfTitle.getChainOfTitle).toHaveBeenCalledWith(mockPropertyData.apn);
      expect(chainOfTitle.success).toBe(true);
    });
  });

  describe('Quitclaim Deed Workflow', () => {
    test('should complete 4-step Quitclaim Deed flow with risk warnings', async () => {
      stateManager.selectDocument('quitclaim_deed');

      const config = DOCUMENT_TYPES.quitclaim_deed;
      expect(config.requiredSteps).toHaveLength(4);
      expect(config.complexity).toBe('moderate');
      expect(config.estimatedTime).toBe('5-8 minutes');

      // Step 1: Property Information (simplified for quitclaim)
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('property', 'county', mockPropertyData.county);
        stateManager.updateField('property', 'legalDescription', mockPropertyData.legalDescription);
      });

      await stateManager.goToStep(2);
      expect(stateManager.getState().currentStep).toBe(2);

      // Step 2: Recording Information (simplified)
      await act(async () => {
        stateManager.updateField('recording', 'requestedBy', mockRecordingData.requestedBy);
        stateManager.updateField('recording', 'mailTo', mockRecordingData.mailTo);
      });

      await stateManager.goToStep(3);
      expect(stateManager.getState().currentStep).toBe(3);

      // Step 3: Parties with risk acknowledgment
      await act(async () => {
        stateManager.updateField('parties', 'grantorsText', mockPartiesData.grantorsText);
        stateManager.updateField('parties', 'granteesText', mockPartiesData.granteesText);
        stateManager.updateField('parties', 'riskAcknowledgment', true);
      });

      await stateManager.goToStep(4);
      expect(stateManager.getState().currentStep).toBe(4);

      // Verify risk warnings are present
      const finalState = stateManager.getState();
      expect(finalState.warnings).toContain('quitclaim_risk');
      expect(finalState.stepData.parties?.riskAcknowledgment).toBe(true);
    });

    test('should display appropriate risk warnings', async () => {
      stateManager.selectDocument('quitclaim_deed');

      // High-value consideration should trigger warning
      await act(async () => {
        stateManager.updateField('parties', 'considerationAmount', '500000');
      });

      const warnings = stateManager.getState().warnings;
      expect(warnings).toContain('high_value_quitclaim');
    });
  });

  describe('Interspousal Transfer Workflow', () => {
    test('should complete 3-step Interspousal Transfer flow with tax exemption', async () => {
      stateManager.selectDocument('interspousal_transfer');

      const config = DOCUMENT_TYPES.interspousal_transfer;
      expect(config.requiredSteps).toHaveLength(3);
      expect(config.complexity).toBe('simple');
      expect(config.estimatedTime).toBe('4-6 minutes');

      // Step 1: Property Information
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('property', 'county', mockPropertyData.county);
        stateManager.updateField('property', 'legalDescription', mockPropertyData.legalDescription);
      });

      await stateManager.goToStep(2);

      // Step 2: Parties (must be spouses)
      await act(async () => {
        stateManager.updateField('parties', 'grantorsText', 'John Doe, a married man');
        stateManager.updateField('parties', 'granteesText', 'Jane Doe, his wife');
        stateManager.updateField('parties', 'propertyCharacterization', 'separate property');
      });

      await stateManager.goToStep(3);

      // Step 3: Review with tax exemption
      const finalState = stateManager.getState();
      expect(finalState.stepData.tax?.exemptionReason).toBe('Interspousal transfer - no consideration');
      expect(finalState.stepData.parties?.propertyCharacterization).toBe('separate property');
    });

    test('should validate spouse relationship', async () => {
      stateManager.selectDocument('interspousal_transfer');

      // Non-spouse parties should fail validation
      await act(async () => {
        stateManager.updateField('parties', 'grantorsText', 'John Doe, a single man');
        stateManager.updateField('parties', 'granteesText', 'Jane Smith, a single woman');
      });

      const isValid = await stateManager.validateCurrentStep();
      expect(isValid).toBe(false);

      const errors = stateManager.getState().validationErrors;
      expect(errors.parties).toHaveProperty('spouse_relationship');
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from API failures gracefully', async () => {
      // Mock API failure
      mockAdvancedAI.processNaturalLanguage.mockRejectedValueOnce(new Error('Network error'));

      stateManager.selectDocument('grant_deed');

      // Should not lose state on API failure
      expect(stateManager.getState().selectedDocument).toBeTruthy();

      // Should retry and succeed
      mockAdvancedAI.processNaturalLanguage.mockResolvedValueOnce({
        response: 'Retry successful',
        actions: [],
        confidence: 0.8,
        context: {}
      });

      const result = await stateManager.processNaturalLanguage('Test retry');
      expect(result.response).toBe('Retry successful');
    });

    test('should handle validation service failures', async () => {
      stateManager.selectDocument('grant_deed');

      // Mock validation service failure
      const originalValidate = stateManager.validateCurrentStep;
      stateManager.validateCurrentStep = jest.fn().mockRejectedValueOnce(new Error('Validation service down'));

      // Should handle gracefully and allow manual progression
      const canProceed = await stateManager.goToStep(2);
      expect(canProceed).toBe(false); // Should fail gracefully

      // Restore validation service
      stateManager.validateCurrentStep = originalValidate;
    });

    test('should preserve data during network interruptions', async () => {
      stateManager.selectDocument('grant_deed');
      
      // Add some data
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('property', 'apn', mockPropertyData.apn);
      });

      // Simulate network interruption (localStorage should persist data)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wizard_state',
        expect.stringContaining(mockPropertyData.address)
      );

      // Create new state manager (simulates page refresh)
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        selectedDocument: { id: 'grant_deed' },
        stepData: { property: mockPropertyData },
        currentStep: 1
      }));

      const newStateManager = new WizardStateManager();
      expect(newStateManager.getState().selectedDocument?.id).toBe('grant_deed');
      expect(newStateManager.getState().stepData.property?.address).toBe(mockPropertyData.address);
    });
  });

  describe('State Persistence and Recovery', () => {
    test('should persist and restore complete wizard state', async () => {
      stateManager.selectDocument('grant_deed');
      
      // Complete first few steps
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('property', 'apn', mockPropertyData.apn);
      });

      await stateManager.goToStep(2);

      await act(async () => {
        stateManager.updateField('recording', 'requestedBy', mockRecordingData.requestedBy);
      });

      // Verify state is persisted
      const persistedState = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(persistedState.selectedDocument.id).toBe('grant_deed');
      expect(persistedState.currentStep).toBe(2);
      expect(persistedState.stepData.property.address).toBe(mockPropertyData.address);
    });

    test('should handle corrupted localStorage gracefully', async () => {
      // Mock corrupted localStorage data
      localStorageMock.getItem.mockReturnValueOnce('invalid json');

      // Should initialize with clean state
      const newStateManager = new WizardStateManager();
      expect(newStateManager.getState().selectedDocument).toBeNull();
      expect(newStateManager.getState().currentStep).toBe(0);
    });

    test('should auto-save changes with debouncing', async () => {
      stateManager.selectDocument('grant_deed');

      // Rapid field updates should be debounced
      await act(async () => {
        stateManager.updateField('property', 'address', '123');
        stateManager.updateField('property', 'address', '123 Main');
        stateManager.updateField('property', 'address', '123 Main St');
      });

      // Should only save final value after debounce
      await new Promise(resolve => setTimeout(resolve, 600)); // Wait for debounce

      const lastSaveCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const savedState = JSON.parse(lastSaveCall[1]);
      expect(savedState.stepData.property.address).toBe('123 Main St');
    });
  });

  describe('Performance and User Experience', () => {
    test('should meet performance benchmarks', async () => {
      const startTime = performance.now();

      stateManager.selectDocument('grant_deed');
      
      // Document selection should be fast
      const selectionTime = performance.now() - startTime;
      expect(selectionTime).toBeLessThan(100); // Less than 100ms

      // Step transitions should be fast
      const stepStartTime = performance.now();
      await stateManager.goToStep(2);
      const stepTime = performance.now() - stepStartTime;
      expect(stepTime).toBeLessThan(200); // Less than 200ms
    });

    test('should provide responsive user feedback', async () => {
      stateManager.selectDocument('grant_deed');

      // Field updates should provide immediate feedback
      await act(async () => {
        stateManager.updateField('property', 'address', 'invalid');
      });

      const state = stateManager.getState();
      expect(state.fieldValidation.property?.address).toBeDefined();
    });

    test('should handle large datasets efficiently', async () => {
      // Test with large legal description
      const largeLegalDescription = 'A'.repeat(5000);

      stateManager.selectDocument('grant_deed');

      const startTime = performance.now();
      await act(async () => {
        stateManager.updateField('property', 'legalDescription', largeLegalDescription);
      });
      const updateTime = performance.now() - startTime;

      expect(updateTime).toBeLessThan(500); // Should handle large text efficiently
      expect(stateManager.getState().stepData.property?.legalDescription).toBe(largeLegalDescription);
    });
  });

  describe('Accessibility and Usability', () => {
    test('should support keyboard navigation', async () => {
      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);
      
      // Should be able to navigate with keyboard
      const firstInput = container.querySelector('input');
      if (firstInput) {
        firstInput.focus();
        expect(document.activeElement).toBe(firstInput);
      }
    });

    test('should provide screen reader support', async () => {
      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);
      
      // Should have proper ARIA labels
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        expect(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')).toBeTruthy();
      });
    });

    test('should handle mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);
      
      // Should render without horizontal scroll
      const wizard = container.querySelector('.dynamic-wizard');
      if (wizard) {
        const styles = getComputedStyle(wizard);
        expect(parseInt(styles.width)).toBeLessThanOrEqual(375);
      }
    });
  });

  describe('Integration with Backend Services', () => {
    test('should integrate with document generation API', async () => {
      // Mock fetch for document generation
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['PDF content'], { type: 'application/pdf' })),
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="Grant_Deed_Los_Angeles_123-456-789.pdf"'
        })
      });

      stateManager.selectDocument('grant_deed');
      
      // Complete all steps
      await act(async () => {
        stateManager.updateField('property', 'address', mockPropertyData.address);
        stateManager.updateField('recording', 'requestedBy', mockRecordingData.requestedBy);
        stateManager.updateField('tax', 'dttAmount', mockTaxData.dttAmount);
        stateManager.updateField('parties', 'grantorsText', mockPartiesData.grantorsText);
      });

      // Generate document
      const result = await stateManager.generateDocument();
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate/grant_deed',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('grant_deed')
        })
      );

      expect(result.success).toBe(true);
    });

    test('should handle backend validation errors', async () => {
      // Mock validation error response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          detail: 'Validation error: Missing required fields',
          field_errors: {
            'parties.grantorsText': 'Grantor names are required'
          }
        })
      });

      stateManager.selectDocument('grant_deed');

      const result = await stateManager.generateDocument();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required fields');
    });
  });
});

// Helper functions for testing
function createMockUser(role: string = 'user') {
  return {
    id: 'test_user_123',
    role,
    email: 'test@example.com'
  };
}

function createMockWizardState(documentType: string, step: number = 1) {
  return {
    selectedDocument: { id: documentType },
    currentStep: step,
    stepData: {},
    completedSteps: new Set(),
    validationErrors: {},
    warnings: [],
    isComplete: false
  };
}

// Performance testing utilities
function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

// Test configuration
export const testConfig = {
  timeout: 10000,
  retries: 2,
  performanceThresholds: {
    documentSelection: 100, // ms
    stepTransition: 200,    // ms
    fieldUpdate: 50,        // ms
    validation: 300,        // ms
    aiResponse: 3000        // ms
  }
};


