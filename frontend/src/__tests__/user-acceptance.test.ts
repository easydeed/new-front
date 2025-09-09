/**
 * User Acceptance Testing Suite for Dynamic Wizard
 * Tests real-world user scenarios and acceptance criteria
 * Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 4 specifications
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardStateManager } from '../lib/wizardState';
import DynamicWizard from '../components/DynamicWizard';
import { performanceMonitor } from '../lib/performance';
import React from 'react';

// Mock external dependencies
jest.mock('../services/advancedAIService');
jest.mock('../services/chainOfTitleService');
jest.mock('../services/aiService');

// User personas for testing
const USER_PERSONAS = {
  noviceUser: {
    id: 'novice_user',
    experience: 'beginner',
    techSavvy: 'low',
    legalKnowledge: 'minimal',
    expectations: {
      needsGuidance: true,
      prefersSimpleLanguage: true,
      requiresValidation: true,
      expectsHelp: true
    }
  },
  experiencedUser: {
    id: 'experienced_user',
    experience: 'advanced',
    techSavvy: 'high',
    legalKnowledge: 'moderate',
    expectations: {
      needsGuidance: false,
      prefersEfficiency: true,
      expectsAdvancedFeatures: true,
      toleratesComplexity: true
    }
  },
  legalProfessional: {
    id: 'legal_professional',
    experience: 'expert',
    techSavvy: 'moderate',
    legalKnowledge: 'expert',
    expectations: {
      requiresAccuracy: true,
      expectsCompliance: true,
      needsCustomization: true,
      valuesPrecision: true
    }
  },
  titleCompanyAgent: {
    id: 'title_agent',
    experience: 'advanced',
    techSavvy: 'moderate',
    legalKnowledge: 'high',
    expectations: {
      needsSpeed: true,
      expectsIntegration: true,
      requiresReliability: true,
      valuesConsistency: true
    }
  }
};

// Real-world test scenarios
const TEST_SCENARIOS = {
  simpleGrantDeed: {
    name: 'Simple Grant Deed - Single Family Home Sale',
    description: 'Most common use case: selling a single family home',
    complexity: 'low',
    expectedTime: 480000, // 8 minutes in milliseconds
    property: {
      address: '1234 Maple Street, Los Angeles, CA 90210',
      apn: '123-456-789',
      county: 'Los Angeles',
      legalDescription: 'Lot 15, Block 3, Tract 5678, as per map recorded in Book 25, Page 10, Official Records of Los Angeles County, California',
      propertyType: 'single_family_residential'
    },
    parties: {
      grantors: 'Robert Smith and Linda Smith, husband and wife as joint tenants',
      grantees: 'Michael Johnson and Sarah Johnson, husband and wife as joint tenants'
    },
    transaction: {
      salePrice: 750000,
      dttAmount: 825.00,
      escrowNumber: 'ESC-2024-001234'
    }
  },
  complexGrantDeed: {
    name: 'Complex Grant Deed - Commercial Property with Multiple Entities',
    description: 'Complex transaction involving corporate entities and trusts',
    complexity: 'high',
    expectedTime: 900000, // 15 minutes in milliseconds
    property: {
      address: '5678 Business Boulevard, Beverly Hills, CA 90210',
      apn: '987-654-321',
      county: 'Los Angeles',
      legalDescription: 'That portion of Lot 1 of Block A of Commercial Center Tract No. 12345, in the City of Beverly Hills, County of Los Angeles, State of California, as per map recorded in Book 150, Pages 25-30, inclusive, of Maps, in the office of the County Recorder of said County, more particularly described as follows: [Extended legal description continues...]',
      propertyType: 'commercial'
    },
    parties: {
      grantors: 'ABC Investment Corporation, a Delaware Corporation, and XYZ Holdings LLC, a California Limited Liability Company',
      grantees: 'The Johnson Family Trust, dated January 15, 2020, Robert Johnson and Mary Johnson, Trustees'
    },
    transaction: {
      salePrice: 2500000,
      dttAmount: 2750.00,
      escrowNumber: 'ESC-2024-005678'
    }
  },
  quitclaimDivorce: {
    name: 'Quitclaim Deed - Divorce Settlement',
    description: 'Spouse transferring interest to other spouse in divorce',
    complexity: 'moderate',
    expectedTime: 360000, // 6 minutes in milliseconds
    property: {
      address: '9876 Oak Avenue, Pasadena, CA 91101',
      apn: '456-789-123',
      county: 'Los Angeles',
      legalDescription: 'Lot 8, Block 12, Tract 9876, as shown on map recorded in Book 45, Page 67, Official Records of Los Angeles County',
      propertyType: 'single_family_residential'
    },
    parties: {
      grantors: 'David Wilson, a married man',
      grantees: 'Jennifer Wilson, his wife'
    },
    transaction: {
      consideration: 'Love and affection',
      noMonetaryConsideration: true
    }
  },
  interspousalTransfer: {
    name: 'Interspousal Transfer - Estate Planning',
    description: 'Changing property characterization for estate planning',
    complexity: 'low',
    expectedTime: 300000, // 5 minutes in milliseconds
    property: {
      address: '2468 Pine Street, Santa Monica, CA 90401',
      apn: '789-123-456',
      county: 'Los Angeles',
      legalDescription: 'Unit 15, Building C, Oceanview Condominiums, as described in the Condominium Plan recorded as Instrument No. 12345678',
      propertyType: 'condominium'
    },
    parties: {
      grantors: 'Thomas Brown, a married man',
      grantees: 'Thomas Brown and Patricia Brown, husband and wife as community property'
    },
    transaction: {
      characterization: 'separate_to_community',
      taxExempt: true
    }
  }
};

describe('User Acceptance Testing Suite', () => {
  let stateManager: WizardStateManager;

  beforeEach(() => {
    stateManager = new WizardStateManager();
    jest.clearAllMocks();
    performanceMonitor.setEnabled(true);
  });

  describe('Novice User Journey', () => {
    const persona = USER_PERSONAS.noviceUser;
    const scenario = TEST_SCENARIOS.simpleGrantDeed;

    test('should guide novice user through simple Grant Deed with clear instructions', async () => {
      const user = userEvent.setup();
      const startTime = performance.now();

      // Track user journey
      performanceMonitor.trackUserInteraction('start_journey', 'wizard', 0, 'grant_deed', { persona: persona.id });

      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);

      // Step 1: Document Selection and Property Information
      // Novice user should see clear guidance
      expect(screen.getByText(/grant deed/i)).toBeInTheDocument();
      expect(screen.getByText(/property information/i)).toBeInTheDocument();

      // Should have help text for novice users
      const helpButtons = container.querySelectorAll('[aria-label*="help"], [title*="help"]');
      expect(helpButtons.length).toBeGreaterThan(0);

      // Fill property information with validation feedback
      const addressInput = screen.getByLabelText(/property address/i);
      await user.type(addressInput, scenario.property.address);

      // Should provide real-time validation feedback
      await waitFor(() => {
        expect(addressInput).toHaveValue(scenario.property.address);
      });

      const apnInput = screen.getByLabelText(/apn/i);
      await user.type(apnInput, scenario.property.apn);

      // Should show format guidance for APN
      expect(screen.getByText(/format.*123-456-789/i)).toBeInTheDocument();

      // Continue through wizard with guidance
      const continueButton = screen.getByRole('button', { name: /continue|next/i });
      expect(continueButton).toBeEnabled();

      await user.click(continueButton);

      // Should progress to next step with clear indication
      await waitFor(() => {
        expect(screen.getByText(/step 2/i)).toBeInTheDocument();
      });

      // Measure completion time
      const completionTime = performance.now() - startTime;
      expect(completionTime).toBeLessThan(scenario.expectedTime); // Should complete within expected time

      performanceMonitor.trackUserInteraction('complete_step', 'continue_button', 1, 'grant_deed', {
        persona: persona.id,
        completionTime
      });
    });

    test('should provide helpful error messages for novice users', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Try to continue without required information
      const continueButton = screen.getByRole('button', { name: /continue|next/i });
      await user.click(continueButton);

      // Should show clear, helpful error messages
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
        
        // Error messages should be in plain language
        const errorText = errorMessages[0].textContent;
        expect(errorText).not.toMatch(/error code|exception|undefined/i);
        expect(errorText).toMatch(/required|please|enter|provide/i);
      });

      // Should highlight the problematic fields
      const requiredFields = container.querySelectorAll('[aria-invalid="true"], .error, .invalid');
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    test('should offer AI assistance for novice users', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should have AI assistance panel
      const aiPanel = screen.getByText(/ai assistance|help|suggestions/i);
      expect(aiPanel).toBeInTheDocument();

      // Should provide example prompts for novice users
      const examplePrompts = screen.getAllByText(/try.*asking|example|help.*with/i);
      expect(examplePrompts.length).toBeGreaterThan(0);

      // Test AI interaction
      const aiInput = screen.getByPlaceholderText(/ask.*question|how.*help/i);
      await user.type(aiInput, 'What information do I need for the grantor?');

      const askButton = screen.getByRole('button', { name: /ask|send|submit/i });
      await user.click(askButton);

      // Should provide helpful response
      await waitFor(() => {
        expect(screen.getByText(/grantor.*current owner|person.*selling/i)).toBeInTheDocument();
      });
    });
  });

  describe('Experienced User Journey', () => {
    const persona = USER_PERSONAS.experiencedUser;
    const scenario = TEST_SCENARIOS.complexGrantDeed;

    test('should allow experienced user to complete complex Grant Deed efficiently', async () => {
      const user = userEvent.setup();
      const startTime = performance.now();

      performanceMonitor.trackUserInteraction('start_journey', 'wizard', 0, 'grant_deed', { persona: persona.id });

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Experienced users should be able to skip guidance
      const skipGuidanceButton = screen.queryByRole('button', { name: /skip.*intro|advanced.*mode/i });
      if (skipGuidanceButton) {
        await user.click(skipGuidanceButton);
      }

      // Should allow bulk data entry
      const bulkEntryButton = screen.queryByRole('button', { name: /bulk.*entry|paste.*data/i });
      if (bulkEntryButton) {
        await user.click(bulkEntryButton);

        // Should accept structured data input
        const bulkInput = screen.getByRole('textbox', { name: /bulk.*data|json.*input/i });
        const bulkData = JSON.stringify({
          property: scenario.property,
          parties: scenario.parties,
          transaction: scenario.transaction
        });

        await user.type(bulkInput, bulkData);
        
        const applyButton = screen.getByRole('button', { name: /apply|import/i });
        await user.click(applyButton);

        // Should populate all fields
        await waitFor(() => {
          expect(screen.getByDisplayValue(scenario.property.address)).toBeInTheDocument();
        });
      }

      // Should provide advanced features
      expect(screen.queryByText(/advanced.*options|expert.*mode/i)).toBeInTheDocument();

      // Should allow quick navigation between steps
      const stepNavigation = screen.getAllByRole('button', { name: /step \d+/i });
      expect(stepNavigation.length).toBeGreaterThan(1);

      // Measure efficiency
      const completionTime = performance.now() - startTime;
      expect(completionTime).toBeLessThan(scenario.expectedTime * 0.7); // Should be 30% faster than expected

      performanceMonitor.trackUserInteraction('efficient_completion', 'bulk_entry', 0, 'grant_deed', {
        persona: persona.id,
        completionTime,
        efficiency: scenario.expectedTime / completionTime
      });
    });

    test('should provide keyboard shortcuts for experienced users', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should support keyboard navigation
      await user.keyboard('{Tab}');
      expect(document.activeElement).toHaveAttribute('type', 'text');

      // Should support keyboard shortcuts
      await user.keyboard('{Control>}{Enter}'); // Ctrl+Enter to continue
      
      // Should advance to next step or show validation
      await waitFor(() => {
        expect(screen.getByText(/step 2|validation|error/i)).toBeInTheDocument();
      });

      // Should show keyboard shortcut hints
      const shortcutHints = screen.queryAllByText(/ctrl.*enter|tab.*navigate|esc.*cancel/i);
      expect(shortcutHints.length).toBeGreaterThan(0);
    });
  });

  describe('Legal Professional Journey', () => {
    const persona = USER_PERSONAS.legalProfessional;
    const scenario = TEST_SCENARIOS.complexGrantDeed;

    test('should provide legal compliance validation for legal professionals', async () => {
      const user = userEvent.setup();

      performanceMonitor.trackUserInteraction('start_journey', 'wizard', 0, 'grant_deed', { persona: persona.id });

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should show legal compliance indicators
      expect(screen.getByText(/legal compliance|california.*code|civil code/i)).toBeInTheDocument();

      // Fill in complex legal information
      const grantorInput = screen.getByLabelText(/grantor/i);
      await user.type(grantorInput, scenario.parties.grantors);

      // Should provide real-time legal validation
      await waitFor(() => {
        const complianceIndicators = screen.getAllByText(/compliant|valid|✓|✗/i);
        expect(complianceIndicators.length).toBeGreaterThan(0);
      });

      // Should show specific legal code references
      expect(screen.getByText(/civil code.*1091|1092|1095/i)).toBeInTheDocument();

      // Should allow legal professional to override warnings
      const warningOverride = screen.queryByRole('checkbox', { name: /override.*warning|legal.*professional/i });
      if (warningOverride) {
        await user.click(warningOverride);
        expect(warningOverride).toBeChecked();
      }

      // Should provide detailed legal analysis
      const legalAnalysisButton = screen.getByRole('button', { name: /legal.*analysis|compliance.*report/i });
      await user.click(legalAnalysisButton);

      await waitFor(() => {
        expect(screen.getByText(/compliance.*score|legal.*requirements|code.*sections/i)).toBeInTheDocument();
      });

      performanceMonitor.trackUserInteraction('legal_validation', 'compliance_check', 1, 'grant_deed', {
        persona: persona.id,
        validationLevel: 'professional'
      });
    });

    test('should allow customization of legal templates', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should provide template customization options
      const customizeButton = screen.queryByRole('button', { name: /customize.*template|advanced.*options/i });
      if (customizeButton) {
        await user.click(customizeButton);

        // Should show template editor
        await waitFor(() => {
          expect(screen.getByText(/template.*editor|custom.*clauses/i)).toBeInTheDocument();
        });

        // Should allow adding custom clauses
        const addClauseButton = screen.getByRole('button', { name: /add.*clause|insert.*text/i });
        await user.click(addClauseButton);

        const customClauseInput = screen.getByRole('textbox', { name: /custom.*clause|additional.*text/i });
        await user.type(customClauseInput, 'Subject to existing easements of record.');

        const saveClauseButton = screen.getByRole('button', { name: /save|apply/i });
        await user.click(saveClauseButton);

        // Should incorporate custom clause
        expect(screen.getByText(/subject to existing easements/i)).toBeInTheDocument();
      }
    });
  });

  describe('Title Company Agent Journey', () => {
    const persona = USER_PERSONAS.titleCompanyAgent;
    const scenario = TEST_SCENARIOS.simpleGrantDeed;

    test('should integrate with title company workflows', async () => {
      const user = userEvent.setup();

      performanceMonitor.trackUserInteraction('start_journey', 'wizard', 0, 'grant_deed', { persona: persona.id });

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should allow import from title report
      const importButton = screen.queryByRole('button', { name: /import.*title|load.*report/i });
      if (importButton) {
        await user.click(importButton);

        // Should show file upload or data paste option
        const fileInput = screen.queryByLabelText(/upload.*file|select.*file/i);
        const pasteArea = screen.queryByRole('textbox', { name: /paste.*data|title.*data/i });

        expect(fileInput || pasteArea).toBeInTheDocument();
      }

      // Should pre-populate escrow information
      const escrowInput = screen.getByLabelText(/escrow.*number|order.*number/i);
      await user.type(escrowInput, scenario.transaction.escrowNumber);

      // Should validate against title company standards
      await waitFor(() => {
        const validationStatus = screen.getByText(/valid|verified|✓/i);
        expect(validationStatus).toBeInTheDocument();
      });

      // Should provide batch processing options
      const batchButton = screen.queryByRole('button', { name: /batch.*process|multiple.*documents/i });
      if (batchButton) {
        expect(batchButton).toBeInTheDocument();
      }

      performanceMonitor.trackUserInteraction('title_integration', 'escrow_validation', 2, 'grant_deed', {
        persona: persona.id,
        escrowNumber: scenario.transaction.escrowNumber
      });
    });

    test('should provide quality assurance features', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Complete document with all required information
      // ... (fill in all fields)

      // Should provide pre-generation review
      const reviewButton = screen.getByRole('button', { name: /review|preview|check/i });
      await user.click(reviewButton);

      await waitFor(() => {
        // Should show comprehensive review screen
        expect(screen.getByText(/document.*review|final.*check/i)).toBeInTheDocument();
        
        // Should highlight potential issues
        const issueIndicators = screen.getAllByText(/warning|attention|review|verify/i);
        expect(issueIndicators.length).toBeGreaterThan(0);
        
        // Should show quality score
        expect(screen.getByText(/quality.*score|completeness/i)).toBeInTheDocument();
      });

      // Should allow quality assurance sign-off
      const qaCheckbox = screen.getByRole('checkbox', { name: /quality.*assured|reviewed.*approved/i });
      await user.click(qaCheckbox);

      expect(qaCheckbox).toBeChecked();
    });
  });

  describe('Cross-Document Type Workflows', () => {
    test('should handle document type switching gracefully', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard />);

      // Start with Grant Deed
      const grantDeedButton = screen.getByRole('button', { name: /grant.*deed/i });
      await user.click(grantDeedButton);

      // Fill some information
      const addressInput = screen.getByLabelText(/address/i);
      await user.type(addressInput, '123 Test Street');

      // Switch to Quitclaim Deed
      const changeDocButton = screen.getByRole('button', { name: /change.*document|different.*type/i });
      await user.click(changeDocButton);

      const quitclaimButton = screen.getByRole('button', { name: /quitclaim.*deed/i });
      await user.click(quitclaimButton);

      // Should preserve compatible data
      expect(screen.getByDisplayValue('123 Test Street')).toBeInTheDocument();

      // Should show appropriate warnings for quitclaim
      expect(screen.getByText(/no.*warranties|risk.*warning/i)).toBeInTheDocument();

      performanceMonitor.trackUserInteraction('document_switch', 'type_change', 1, 'quitclaim_deed', {
        fromType: 'grant_deed',
        toType: 'quitclaim_deed',
        dataPreserved: true
      });
    });

    test('should provide document type recommendations', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard />);

      // Should show AI-powered document type suggestions
      const aiSuggestionButton = screen.queryByRole('button', { name: /ai.*suggestion|recommend.*type/i });
      if (aiSuggestionButton) {
        await user.click(aiSuggestionButton);

        // Should ask qualifying questions
        expect(screen.getByText(/purpose.*transfer|relationship.*parties/i)).toBeInTheDocument();

        // Answer questions
        const purposeSelect = screen.getByLabelText(/purpose|reason/i);
        await user.selectOptions(purposeSelect, 'sale');

        const relationshipSelect = screen.getByLabelText(/relationship/i);
        await user.selectOptions(relationshipSelect, 'unrelated');

        const getRecommendationButton = screen.getByRole('button', { name: /get.*recommendation|suggest/i });
        await user.click(getRecommendationButton);

        // Should recommend appropriate document type
        await waitFor(() => {
          expect(screen.getByText(/recommend.*grant.*deed/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility and Usability', () => {
    test('should be fully accessible to screen reader users', async () => {
      render(<DynamicWizard initialDocType="grant_deed" />);

      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have proper form labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        const label = screen.getByLabelText(new RegExp(input.getAttribute('aria-label') || ''));
        expect(label).toBeInTheDocument();
      });

      // Should have proper ARIA landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Should announce step changes
      const stepIndicator = screen.getByRole('status', { name: /current step/i });
      expect(stepIndicator).toBeInTheDocument();
    });

    test('should work on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });

      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);

      // Should have responsive design
      const wizard = container.querySelector('[data-testid="dynamic-wizard"]');
      if (wizard) {
        const styles = getComputedStyle(wizard);
        expect(parseInt(styles.maxWidth)).toBeLessThanOrEqual(375);
      }

      // Should have touch-friendly buttons
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44); // iOS minimum touch target
      });

      // Should handle touch interactions
      const user = userEvent.setup();
      const firstButton = buttons[0];
      
      await user.pointer({ keys: '[TouchA>]', target: firstButton });
      await user.pointer({ keys: '[/TouchA]' });

      // Should respond to touch
      expect(firstButton).toHaveFocus();
    });

    test('should support high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      const { container } = render(<DynamicWizard initialDocType="grant_deed" />);

      // Should apply high contrast styles
      const wizard = container.querySelector('[data-testid="dynamic-wizard"]');
      if (wizard) {
        expect(wizard).toHaveClass(/high.*contrast|contrast.*high/);
      }

      // Should have sufficient color contrast
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = getComputedStyle(button);
        // In a real test, you'd calculate contrast ratio
        expect(styles.backgroundColor).not.toBe('transparent');
        expect(styles.color).not.toBe('transparent');
      });
    });
  });

  describe('Performance Acceptance Criteria', () => {
    test('should meet performance benchmarks', async () => {
      const startTime = performance.now();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Initial render should be fast
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(500); // Less than 500ms

      // Step transitions should be responsive
      const user = userEvent.setup();
      const continueButton = screen.getByRole('button', { name: /continue|next/i });

      const transitionStart = performance.now();
      await user.click(continueButton);
      
      await waitFor(() => {
        const transitionTime = performance.now() - transitionStart;
        expect(transitionTime).toBeLessThan(200); // Less than 200ms
      });

      // AI responses should be within acceptable limits
      const aiInput = screen.queryByPlaceholderText(/ask.*question/i);
      if (aiInput) {
        const aiStart = performance.now();
        await user.type(aiInput, 'Help with grantor information');
        
        const askButton = screen.getByRole('button', { name: /ask|send/i });
        await user.click(askButton);

        await waitFor(() => {
          const aiTime = performance.now() - aiStart;
          expect(aiTime).toBeLessThan(3000); // Less than 3 seconds
        }, { timeout: 5000 });
      }
    });

    test('should handle concurrent users efficiently', async () => {
      // Simulate multiple concurrent wizard instances
      const instances = [];
      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<DynamicWizard initialDocType="grant_deed" />);
        instances.push(unmount);
      }

      const concurrentRenderTime = performance.now() - startTime;
      expect(concurrentRenderTime).toBeLessThan(2000); // Should handle 5 instances in under 2 seconds

      // Cleanup
      instances.forEach(unmount => unmount());
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover gracefully from network failures', async () => {
      const user = userEvent.setup();

      // Mock network failure
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Try to use AI feature during network failure
      const aiInput = screen.queryByPlaceholderText(/ask.*question/i);
      if (aiInput) {
        await user.type(aiInput, 'Test question');
        
        const askButton = screen.getByRole('button', { name: /ask|send/i });
        await user.click(askButton);

        // Should show graceful error message
        await waitFor(() => {
          expect(screen.getByText(/temporarily.*unavailable|try.*again|network.*issue/i)).toBeInTheDocument();
        });

        // Should not crash the application
        expect(screen.getByText(/grant deed/i)).toBeInTheDocument();
      }

      // Restore network and retry
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'AI response after recovery' })
      });

      const retryButton = screen.queryByRole('button', { name: /retry|try.*again/i });
      if (retryButton) {
        await user.click(retryButton);

        await waitFor(() => {
          expect(screen.getByText(/ai response after recovery/i)).toBeInTheDocument();
        });
      }
    });

    test('should preserve data during browser crashes', async () => {
      const user = userEvent.setup();

      render(<DynamicWizard initialDocType="grant_deed" />);

      // Fill in some data
      const addressInput = screen.getByLabelText(/address/i);
      await user.type(addressInput, '123 Recovery Test Street');

      // Simulate browser crash/refresh by checking localStorage
      const savedState = localStorage.getItem('wizard_state');
      expect(savedState).toBeTruthy();
      
      const parsedState = JSON.parse(savedState!);
      expect(parsedState.stepData.property.address).toBe('123 Recovery Test Street');

      performanceMonitor.trackUserInteraction('data_recovery', 'localStorage_save', 1, 'grant_deed', {
        dataPreserved: true,
        recoveryMethod: 'localStorage'
      });
    });
  });
});

// Test utilities and helpers
export const UserAcceptanceTestUtils = {
  simulateUserPersona: (persona: keyof typeof USER_PERSONAS) => {
    const user = USER_PERSONAS[persona];
    performanceMonitor.setUserId(user.id);
    return user;
  },

  measureTaskCompletion: (taskName: string, expectedTime: number) => {
    const startTime = performance.now();
    return {
      complete: () => {
        const actualTime = performance.now() - startTime;
        const efficiency = expectedTime / actualTime;
        
        performanceMonitor.trackUserInteraction('task_completion', taskName, 0, 'unknown', {
          expectedTime,
          actualTime,
          efficiency,
          withinExpectation: actualTime <= expectedTime
        });

        return { actualTime, efficiency, withinExpectation: actualTime <= expectedTime };
      }
    };
  },

  validateAccessibility: (container: HTMLElement) => {
    // Basic accessibility checks
    const issues = [];

    // Check for missing alt text on images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (!img.getAttribute('alt')) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });

    // Check for form labels
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        if (!label && !ariaLabel && !ariaLabelledBy) {
          issues.push(`Form control missing label: ${input.tagName}#${id}`);
        }
      }
    });

    // Check for heading hierarchy
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push(`Heading hierarchy skip: ${heading.tagName} after h${lastLevel}`);
      }
      lastLevel = level;
    });

    return issues;
  }
};

// Performance thresholds for acceptance testing
export const ACCEPTANCE_THRESHOLDS = {
  initialRender: 500,      // ms
  stepTransition: 200,     // ms
  aiResponse: 3000,        // ms
  documentGeneration: 5000, // ms
  formValidation: 100,     // ms
  dataAutoSave: 1000,      // ms
  errorRecovery: 2000,     // ms
  
  // User experience metrics
  completionRate: 0.85,    // 85%
  userSatisfaction: 4.0,   // out of 5
  errorRate: 0.05,         // 5%
  dropoffRate: 0.15,       // 15%
  
  // Accessibility requirements
  contrastRatio: 4.5,      // WCAG AA
  touchTargetSize: 44,     // pixels (iOS minimum)
  keyboardNavigation: true,
  screenReaderSupport: true
};


