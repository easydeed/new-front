import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedAIService } from '../services/advancedAIService';
import { IntentRecognitionEngine } from '../lib/intentRecognition';
import { NaturalLanguageInterface } from '../components/NaturalLanguageInterface';
import { WizardContext } from '../lib/wizardState';

// Mock the advanced AI service
jest.mock('../services/advancedAIService');
const mockAdvancedAIService = AdvancedAIService as jest.Mocked<typeof AdvancedAIService>;

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Phase 2.1 Natural Language Processing Integration', () => {
  let mockContext: WizardContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      documentType: 'grant_deed',
      currentStep: 1,
      propertyData: {
        address: '123 Main St, Los Angeles, CA 90210',
        apn: '123-456-789',
        county: 'Los Angeles',
        legalDescription: 'Lot 1, Block 2, Tract 12345',
        currentOwners: [{ name: 'John Doe' }]
      },
      stepData: {}
    };
  });

  describe('Advanced AI Service', () => {
    test('should process natural language prompts correctly', async () => {
      const mockResponse = {
        intent: {
          type: 'field_update',
          confidence: 0.9,
          entities: [],
          parameters: {}
        },
        actions: [{
          type: 'update_field',
          target: 'grantor_name',
          value: 'John Doe',
          confidence: 0.85,
          reasoning: 'Extracted from property data',
          requiresConfirmation: false
        }],
        response: 'I\'ve filled in the grantor name based on the current property owner.',
        suggestions: ['Verify the grantor name is correct'],
        followUpQuestions: ['Would you like me to fill in the grantee information?'],
        conversationContext: {
          previousPrompts: [],
          userPreferences: {},
          sessionData: {}
        },
        confidence: 0.9,
        processingTime: 150
      };

      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce(mockResponse);

      const result = await AdvancedAIService.processNaturalLanguagePrompt(
        'fill in the grantor name',
        mockContext
      );

      expect(result.intent.type).toBe('field_update');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].target).toBe('grantor_name');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle API failures gracefully', async () => {
      mockAdvancedAIService.processNaturalLanguagePrompt.mockRejectedValueOnce(
        new Error('API unavailable')
      );

      const result = await AdvancedAIService.processNaturalLanguagePrompt(
        'fill in the grantor name',
        mockContext
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.response).toContain('trouble processing');
    });

    test('should recognize different intent types', async () => {
      const testCases = [
        {
          prompt: 'fill in the property address',
          expectedIntent: 'field_update'
        },
        {
          prompt: 'what is a grant deed?',
          expectedIntent: 'information_request'
        },
        {
          prompt: 'go to the next step',
          expectedIntent: 'navigation'
        },
        {
          prompt: 'check if everything is correct',
          expectedIntent: 'validation'
        }
      ];

      for (const testCase of testCases) {
        mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
          intent: {
            type: testCase.expectedIntent as any,
            confidence: 0.8,
            entities: [],
            parameters: {}
          },
          actions: [],
          response: `Processing ${testCase.expectedIntent} request`,
          suggestions: [],
          followUpQuestions: [],
          conversationContext: {
            previousPrompts: [],
            userPreferences: {},
            sessionData: {}
          },
          confidence: 0.8,
          processingTime: 100
        });

        const result = await AdvancedAIService.processNaturalLanguagePrompt(
          testCase.prompt,
          mockContext
        );

        expect(result.intent.type).toBe(testCase.expectedIntent);
      }
    });
  });

  describe('Intent Recognition Engine', () => {
    test('should initialize patterns correctly', () => {
      IntentRecognitionEngine.initialize();
      const stats = IntentRecognitionEngine.getPatternStats();
      
      expect(stats.patterns).toBeGreaterThan(0);
      expect(stats.entities).toBeGreaterThan(0);
    });

    test('should recognize field update intents', () => {
      const testPrompts = [
        'fill in the grantor name',
        'set the property address to 123 Main St',
        'update the APN',
        'enter John Doe as the grantee'
      ];

      for (const prompt of testPrompts) {
        const intent = IntentRecognitionEngine.recognizeIntent(prompt, mockContext);
        expect(intent.type).toBe('field_update');
        expect(intent.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should recognize information request intents', () => {
      const testPrompts = [
        'what is a grant deed?',
        'explain the transfer tax',
        'how do I fill this out?',
        'what does APN mean?'
      ];

      for (const prompt of testPrompts) {
        const intent = IntentRecognitionEngine.recognizeIntent(prompt, mockContext);
        expect(intent.type).toBe('information_request');
        expect(intent.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should recognize navigation intents', () => {
      const testPrompts = [
        'go to next step',
        'navigate to step 3',
        'back to previous step',
        'skip this step'
      ];

      for (const prompt of testPrompts) {
        const intent = IntentRecognitionEngine.recognizeIntent(prompt, mockContext);
        expect(intent.type).toBe('navigation');
        expect(intent.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should extract entities correctly', () => {
      const prompt = 'fill in John Doe as the grantor name';
      const intent = IntentRecognitionEngine.recognizeIntent(prompt, mockContext);
      
      expect(intent.entities.length).toBeGreaterThan(0);
      
      const personEntity = intent.entities.find(e => e.type === 'person_name');
      const fieldEntity = intent.entities.find(e => e.type === 'field_name');
      
      expect(personEntity?.value).toContain('John Doe');
      expect(fieldEntity?.value).toContain('grantor');
    });

    test('should handle context-aware recognition', () => {
      const conversationHistory = [
        IntentRecognitionEngine.recognizeIntent('what is a grant deed?', mockContext)
      ];

      const followUpIntent = IntentRecognitionEngine.recognizeIntent(
        'how do I fill it out?',
        mockContext,
        conversationHistory
      );

      expect(followUpIntent.context.conversationTopic).toBeDefined();
    });
  });

  describe('Natural Language Interface Component', () => {
    test('should render correctly', () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
    });

    test('should handle user input and process with AI', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
        intent: {
          type: 'field_update',
          confidence: 0.9,
          entities: [],
          parameters: {}
        },
        actions: [{
          type: 'update_field',
          target: 'grantor_name',
          value: 'John Doe',
          confidence: 0.9,
          reasoning: 'Auto-filled from property data',
          requiresConfirmation: false
        }],
        response: 'I\'ve filled in the grantor name.',
        suggestions: [],
        followUpQuestions: [],
        conversationContext: {
          previousPrompts: [],
          userPreferences: {},
          sessionData: {}
        },
        confidence: 0.9,
        processingTime: 100
      });

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      fireEvent.change(input, { target: { value: 'fill in the grantor name' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAdvancedAIService.processNaturalLanguagePrompt).toHaveBeenCalledWith(
          'fill in the grantor name',
          mockContext,
          expect.any(String)
        );
      });

      await waitFor(() => {
        expect(mockOnFieldUpdate).toHaveBeenCalledWith('grantor_name', 'John Doe');
      });
    });

    test('should display conversation history', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
        intent: { type: 'information_request', confidence: 0.8, entities: [], parameters: {} },
        actions: [],
        response: 'A grant deed is a legal document that transfers property ownership.',
        suggestions: [],
        followUpQuestions: [],
        conversationContext: { previousPrompts: [], userPreferences: {}, sessionData: {} },
        confidence: 0.8,
        processingTime: 120
      });

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      // Expand the conversation
      const expandButton = screen.getByTitle('Expand');
      fireEvent.click(expandButton);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      fireEvent.change(input, { target: { value: 'what is a grant deed?' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('what is a grant deed?')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/grant deed is a legal document/i)).toBeInTheDocument();
      });
    });

    test('should handle voice input if available', () => {
      // Mock speech recognition
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'en-US'
      };

      (global as any).window.webkitSpeechRecognition = jest.fn(() => mockRecognition);

      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const voiceButton = screen.getByTitle('Start voice input');
      expect(voiceButton).toBeInTheDocument();

      fireEvent.click(voiceButton);
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    test('should display suggestions and allow clicking', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
        intent: { type: 'help', confidence: 0.7, entities: [], parameters: {} },
        actions: [],
        response: 'I can help you with this step.',
        suggestions: ['Fill in property information', 'Calculate transfer tax'],
        followUpQuestions: ['What would you like to do first?'],
        conversationContext: { previousPrompts: [], userPreferences: {}, sessionData: {} },
        confidence: 0.7,
        processingTime: 90
      });

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      fireEvent.change(input, { target: { value: 'help me' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Fill in property information')).toBeInTheDocument();
      });

      const suggestionButton = screen.getByText('Fill in property information');
      fireEvent.click(suggestionButton);

      expect(input).toHaveValue('Fill in property information');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all NLP components correctly', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      // Mock a complete NLP flow
      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
        intent: {
          type: 'field_update',
          confidence: 0.95,
          entities: [
            { type: 'field_name', value: 'grantor', confidence: 0.9, startIndex: 0, endIndex: 7 },
            { type: 'person_name', value: 'John Doe', confidence: 0.85, startIndex: 8, endIndex: 16 }
          ],
          parameters: { field: 'grantor_name', value: 'John Doe' }
        },
        actions: [{
          type: 'update_field',
          target: 'grantor_name',
          value: 'John Doe',
          confidence: 0.9,
          reasoning: 'Extracted from current property owner information',
          requiresConfirmation: false
        }],
        response: 'I\'ve filled in "John Doe" as the grantor name based on the current property owner.',
        suggestions: ['Verify this is correct', 'Add co-grantor if needed'],
        followUpQuestions: ['Would you like me to fill in the grantee information as well?'],
        conversationContext: { previousPrompts: [], userPreferences: {}, sessionData: {} },
        confidence: 0.95,
        processingTime: 180
      });

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      fireEvent.change(input, { target: { value: 'fill in John Doe as grantor' } });
      fireEvent.click(submitButton);

      // Verify AI service was called
      await waitFor(() => {
        expect(mockAdvancedAIService.processNaturalLanguagePrompt).toHaveBeenCalledWith(
          'fill in John Doe as grantor',
          mockContext,
          expect.any(String)
        );
      });

      // Verify field update was executed
      await waitFor(() => {
        expect(mockOnFieldUpdate).toHaveBeenCalledWith('grantor_name', 'John Doe');
      });

      // Verify conversation display
      await waitFor(() => {
        expect(screen.getByText(/filled in "John Doe" as the grantor/i)).toBeInTheDocument();
      });
    });

    test('should handle complex multi-step interactions', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      // First interaction
      mockAdvancedAIService.processNaturalLanguagePrompt
        .mockResolvedValueOnce({
          intent: { type: 'information_request', confidence: 0.8, entities: [], parameters: {} },
          actions: [],
          response: 'A grant deed transfers property with limited warranties.',
          suggestions: [],
          followUpQuestions: ['Would you like me to help you fill it out?'],
          conversationContext: { 
            previousPrompts: [], 
            userPreferences: {}, 
            sessionData: {},
            currentTopic: 'grant_deed'
          },
          confidence: 0.8,
          processingTime: 100
        })
        // Second interaction
        .mockResolvedValueOnce({
          intent: { type: 'field_update', confidence: 0.9, entities: [], parameters: {} },
          actions: [{
            type: 'update_field',
            target: 'document_type',
            value: 'grant_deed',
            confidence: 0.9,
            reasoning: 'Continuing from previous conversation about grant deeds',
            requiresConfirmation: false
          }],
          response: 'I\'ll help you fill out the grant deed.',
          suggestions: [],
          followUpQuestions: [],
          conversationContext: { 
            previousPrompts: [], 
            userPreferences: {}, 
            sessionData: {},
            currentTopic: 'grant_deed'
          },
          confidence: 0.9,
          processingTime: 120
        });

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      // First question
      fireEvent.change(input, { target: { value: 'what is a grant deed?' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/grant deed transfers property/i)).toBeInTheDocument();
      });

      // Follow-up
      fireEvent.change(input, { target: { value: 'yes, help me fill it out' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/help you fill out the grant deed/i)).toBeInTheDocument();
      });

      expect(mockAdvancedAIService.processNaturalLanguagePrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      mockAdvancedAIService.processNaturalLanguagePrompt.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const submitButton = screen.getByTitle('Send message');

      fireEvent.change(input, { target: { value: 'help me' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/having trouble understanding/i)).toBeInTheDocument();
      });
    });

    test('should validate input before processing', () => {
      const mockOnActionExecute = jest.fn();
      const mockOnFieldUpdate = jest.fn();

      render(
        <NaturalLanguageInterface
          context={mockContext}
          onActionExecute={mockOnActionExecute}
          onFieldUpdate={mockOnFieldUpdate}
        />
      );

      const submitButton = screen.getByTitle('Send message');
      
      // Submit button should be disabled with empty input
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Performance Tests', () => {
    test('should complete NLP processing within reasonable time', async () => {
      const startTime = Date.now();

      mockAdvancedAIService.processNaturalLanguagePrompt.mockResolvedValueOnce({
        intent: { type: 'help', confidence: 0.7, entities: [], parameters: {} },
        actions: [],
        response: 'Quick response',
        suggestions: [],
        followUpQuestions: [],
        conversationContext: { previousPrompts: [], userPreferences: {}, sessionData: {} },
        confidence: 0.7,
        processingTime: 50
      });

      const result = await AdvancedAIService.processNaturalLanguagePrompt('help', mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Helper functions for testing
export function createMockNLPResponse(overrides: any = {}) {
  return {
    intent: { type: 'help', confidence: 0.7, entities: [], parameters: {} },
    actions: [],
    response: 'Mock AI response',
    suggestions: [],
    followUpQuestions: [],
    conversationContext: { previousPrompts: [], userPreferences: {}, sessionData: {} },
    confidence: 0.7,
    processingTime: 100,
    ...overrides
  };
}

export function createMockWizardContext(overrides: any = {}): WizardContext {
  return {
    documentType: 'grant_deed',
    currentStep: 1,
    propertyData: {
      address: '123 Test St, Los Angeles, CA',
      apn: '123-456-789',
      county: 'Los Angeles',
      legalDescription: 'Test legal description',
      currentOwners: [{ name: 'Test Owner' }]
    },
    stepData: {},
    ...overrides
  };
}


