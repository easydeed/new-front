import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedPropertySearch } from '../components/EnhancedPropertySearch';
import { DocumentTypeSelector } from '../components/DocumentTypeSelector';
import { IntelligentAIService } from '../services/aiService';
import { validatePhase1_2Integration, validatePropertyData, validateDocumentSuggestion } from '../lib/phase1-2-validation';
import { PropertyData } from '../lib/wizardState';
import { DocumentSuggestion } from '../services/aiService';

// Mock the AI service
jest.mock('../services/aiService');
const mockAIService = IntelligentAIService as jest.Mocked<typeof IntelligentAIService>;

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    places: {
      AutocompleteService: jest.fn(() => ({
        getPlacePredictions: jest.fn()
      })),
      PlacesService: jest.fn(() => ({
        getDetails: jest.fn()
      })),
      PlacesServiceStatus: {
        OK: 'OK'
      }
    },
    Map: jest.fn()
  }
};

// @ts-ignore
global.window.google = mockGoogleMaps;

describe('Phase 1.2 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  describe('Enhanced Property Search', () => {
    test('should handle successful property search with TitlePoint data', async () => {
      const mockPropertyData: PropertyData = {
        address: '123 Main St, Los Angeles, CA 90210',
        apn: '123-456-789',
        county: 'Los Angeles',
        legalDescription: 'Lot 1, Block 2, Tract 12345',
        currentOwners: [
          { name: 'John Doe, a single man', vestingType: 'sole and separate' }
        ],
        titlePointData: {
          liens: [],
          encumbrances: [],
          taxInfo: {
            assessedValue: '500000',
            taxYear: '2024',
            taxAmount: '6250.00',
            delinquent: false
          },
          chainOfTitle: [],
          lastUpdated: new Date()
        }
      };

      const mockDocumentSuggestion: DocumentSuggestion = {
        recommendedType: 'grant_deed',
        confidence: 0.85,
        reasoning: 'Standard property transfer with good protection',
        alternatives: [],
        riskFactors: ['Verify clear title'],
        legalConsiderations: ['Transfer tax applies']
      };

      // Mock successful TitlePoint API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          address: mockPropertyData.address,
          apn: mockPropertyData.apn,
          county: mockPropertyData.county,
          legalDescription: mockPropertyData.legalDescription,
          owners: mockPropertyData.currentOwners,
          liens: [],
          taxInfo: mockPropertyData.titlePointData?.taxInfo,
          dataSource: 'titlepoint',
          lastUpdated: new Date().toISOString(),
          confidence: 0.95,
          warnings: []
        })
      });

      mockAIService.suggestDocumentType.mockResolvedValueOnce(mockDocumentSuggestion);

      const onPropertyVerified = jest.fn();
      const onDocumentSuggestion = jest.fn();

      render(
        <EnhancedPropertySearch
          onPropertyVerified={onPropertyVerified}
          onDocumentSuggestion={onDocumentSuggestion}
          showDocumentSuggestions={true}
        />
      );

      // Simulate address input
      const input = screen.getByPlaceholderText(/enter property address/i);
      fireEvent.change(input, { target: { value: '123 Main St, Los Angeles, CA' } });

      // Wait for property verification
      await waitFor(() => {
        expect(onPropertyVerified).toHaveBeenCalledWith(
          expect.objectContaining({
            address: expect.stringContaining('123 Main St'),
            apn: expect.any(String),
            county: expect.any(String)
          })
        );
      });

      // Wait for document suggestion
      await waitFor(() => {
        expect(onDocumentSuggestion).toHaveBeenCalledWith(mockDocumentSuggestion);
      });
    });

    test('should handle TitlePoint API failure gracefully', async () => {
      // Mock failed TitlePoint API response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('TitlePoint API unavailable'));

      const onPropertyVerified = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPropertySearch
          onPropertyVerified={onPropertyVerified}
          onError={onError}
          showDocumentSuggestions={false}
        />
      );

      // Simulate manual address entry
      const input = screen.getByPlaceholderText(/enter property address/i);
      fireEvent.change(input, { target: { value: '123 Main St, Los Angeles, CA' } });

      // Should still call onPropertyVerified with basic data
      await waitFor(() => {
        expect(onPropertyVerified).toHaveBeenCalledWith(
          expect.objectContaining({
            address: '123 Main St, Los Angeles, CA',
            apn: '',
            county: '',
            currentOwners: []
          })
        );
      });
    });
  });

  describe('Document Type Selector Integration', () => {
    test('should integrate property search with document suggestions', async () => {
      const mockPropertyData: PropertyData = {
        address: '456 Oak Ave, Orange, CA 92868',
        apn: '987-654-321',
        county: 'Orange',
        legalDescription: 'Lot 5, Block 10, Tract 54321',
        currentOwners: [
          { name: 'John Smith and Mary Smith, husband and wife', vestingType: 'community property' }
        ]
      };

      const mockSuggestion: DocumentSuggestion = {
        recommendedType: 'interspousal_transfer',
        confidence: 0.9,
        reasoning: 'Detected spouse-related ownership',
        alternatives: [
          {
            type: 'grant_deed',
            confidence: 0.6,
            reasoning: 'Standard transfer',
            pros: ['Full warranties'],
            cons: ['More complex']
          }
        ],
        riskFactors: ['Verify marriage status'],
        legalConsiderations: ['Tax exemption may apply']
      };

      const onSelect = jest.fn();
      const onPropertyDataUpdate = jest.fn();

      render(
        <DocumentTypeSelector
          onSelect={onSelect}
          propertyData={mockPropertyData}
          onPropertyDataUpdate={onPropertyDataUpdate}
        />
      );

      // Should display AI recommendation
      await waitFor(() => {
        expect(screen.getByText(/ai recommendation/i)).toBeInTheDocument();
      });

      // Should show recommended document type
      expect(screen.getByText(/interspousal transfer/i)).toBeInTheDocument();
      expect(screen.getByText(/90% confident/i)).toBeInTheDocument();
    });
  });

  describe('Validation Tests', () => {
    test('should validate property data correctly', () => {
      const validPropertyData: PropertyData = {
        address: '123 Main St, Los Angeles, CA 90210',
        apn: '123-456-789',
        county: 'Los Angeles',
        legalDescription: 'Lot 1, Block 2, Tract 12345',
        currentOwners: [
          { name: 'John Doe', vestingType: 'sole and separate' }
        ]
      };

      const validation = validatePropertyData(validPropertyData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch invalid property data', () => {
      const invalidPropertyData = {
        address: '123', // Too short
        apn: 'invalid-apn',
        county: 'Invalid County',
        currentOwners: [
          { name: '' } // Empty name
        ]
      };

      const validation = validatePropertyData(invalidPropertyData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    test('should validate document suggestions', () => {
      const validSuggestion: DocumentSuggestion = {
        recommendedType: 'grant_deed',
        confidence: 0.85,
        reasoning: 'Standard property transfer with good protection',
        alternatives: [],
        riskFactors: ['Verify clear title'],
        legalConsiderations: ['Transfer tax applies']
      };

      const validation = validateDocumentSuggestion(validSuggestion);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch invalid document suggestions', () => {
      const invalidSuggestion = {
        recommendedType: 'invalid_deed_type',
        confidence: 1.5, // Invalid confidence > 1
        reasoning: 'Short', // Too short
        alternatives: []
      };

      const validation = validateDocumentSuggestion(invalidSuggestion);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should perform comprehensive Phase 1.2 integration validation', () => {
      const propertyData: PropertyData = {
        address: '123 Main St, Los Angeles, CA 90210',
        apn: '123-456-789',
        county: 'Los Angeles',
        legalDescription: 'Lot 1, Block 2, Tract 12345',
        currentOwners: [
          { name: 'John Smith and Mary Smith, husband and wife' }
        ]
      };

      const documentSuggestion: DocumentSuggestion = {
        recommendedType: 'grant_deed', // Should warn about not suggesting interspousal
        confidence: 0.8,
        reasoning: 'Standard transfer',
        alternatives: [],
        riskFactors: [],
        legalConsiderations: []
      };

      const validation = validatePhase1_2Integration({
        propertyData,
        documentSuggestion
      });

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => 
        w.includes('spouse owners') && w.includes('interspousal transfer')
      )).toBe(true);
    });
  });

  describe('AI Service Integration', () => {
    test('should handle AI service failures gracefully', async () => {
      mockAIService.suggestDocumentType.mockRejectedValueOnce(new Error('AI service unavailable'));

      const propertyData: PropertyData = {
        address: '123 Main St, Los Angeles, CA',
        apn: '',
        county: 'Los Angeles',
        legalDescription: '',
        currentOwners: []
      };

      // Should not throw error, should return fallback suggestion
      const suggestion = await IntelligentAIService.suggestDocumentType(propertyData);
      
      expect(suggestion).toBeDefined();
      expect(suggestion.recommendedType).toBe('grant_deed'); // Fallback default
      expect(suggestion.confidence).toBeLessThan(1);
    });

    test('should provide appropriate fallback suggestions', async () => {
      const propertyDataWithSpouses: PropertyData = {
        address: '123 Main St, Los Angeles, CA',
        apn: '',
        county: 'Los Angeles',
        legalDescription: '',
        currentOwners: [
          { name: 'John Smith and Mary Smith, husband and wife' }
        ]
      };

      // Mock AI service failure to test fallback
      mockAIService.suggestDocumentType.mockImplementation(() => {
        throw new Error('AI unavailable');
      });

      const suggestion = await IntelligentAIService.suggestDocumentType(propertyDataWithSpouses);
      
      expect(suggestion.recommendedType).toBe('interspousal_transfer');
      expect(suggestion.reasoning).toContain('spouse');
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const onPropertyVerified = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPropertySearch
          onPropertyVerified={onPropertyVerified}
          onError={onError}
        />
      );

      const input = screen.getByPlaceholderText(/enter property address/i);
      fireEvent.change(input, { target: { value: '123 Main St' } });

      // Should handle error gracefully
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining('Property verification failed')
        );
      });
    });

    test('should validate user input before API calls', () => {
      const invalidRequest = {
        address: 'PO Box 123', // Invalid for property search
        includeOwners: true
      };

      const validation = validatePropertyData(invalidRequest);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('PO Box'))).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should complete property search within reasonable time', async () => {
      const startTime = Date.now();

      // Mock fast API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          address: '123 Main St, Los Angeles, CA',
          apn: '123-456-789',
          county: 'Los Angeles',
          owners: [],
          dataSource: 'titlepoint',
          lastUpdated: new Date().toISOString()
        })
      });

      const propertyData = await IntelligentAIService.searchProperty('123 Main St, Los Angeles, CA');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(propertyData).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Integration test helper functions
export function createMockPropertyData(overrides: Partial<PropertyData> = {}): PropertyData {
  return {
    address: '123 Main St, Los Angeles, CA 90210',
    apn: '123-456-789',
    county: 'Los Angeles',
    legalDescription: 'Lot 1, Block 2, Tract 12345',
    currentOwners: [
      { name: 'John Doe', vestingType: 'sole and separate' }
    ],
    ...overrides
  };
}

export function createMockDocumentSuggestion(overrides: Partial<DocumentSuggestion> = {}): DocumentSuggestion {
  return {
    recommendedType: 'grant_deed',
    confidence: 0.8,
    reasoning: 'Standard property transfer',
    alternatives: [],
    riskFactors: [],
    legalConsiderations: [],
    ...overrides
  };
}


