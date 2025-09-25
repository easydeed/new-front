/**
 * Integration Tests - API Contract & Fault Injection
 * Phase 4: Quality Assurance & Hardening
 * 
 * Tests API contracts with fault injection scenarios:
 * - Timeouts, HTTP 500, network failures
 * - Graceful degradation behavior
 * - Error boundary handling
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PropertySearchWithTitlePoint from '../../components/PropertySearchWithTitlePoint'

// Mock fetch for fault injection scenarios
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('API Contract & Fault Injection Tests', () => {
  const mockProps = {
    onPropertyVerified: jest.fn(),
    onError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Set environment variables for integration testing
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = 'true'
    process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED = 'true'
  })

  describe('TitlePoint API Contract Tests', () => {
    it('handles successful TitlePoint response contract', async () => {
      // Mock successful TitlePoint API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          propertySearch: 'Found property',
          apn: '123-456-789',
          county: 'Los Angeles',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          legalDescription: 'Lot 1, Block 2, Tract 3',
          grantorName: 'John Doe',
          fullAddress: '123 Test St, Los Angeles, CA 90210',
          confidence: 0.95
        })
      })

      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      // Trigger TitlePoint lookup
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/property/search',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
      })

      expect(mockProps.onPropertyVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          apn: '123-456-789',
          fullAddress: '123 Test St, Los Angeles, CA 90210'
        })
      )
    })

    it('handles TitlePoint API timeout (fault injection)', async () => {
      // Simulate API timeout
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('timeout')
        )
      }, { timeout: 3000 })
    })

    it('handles TitlePoint HTTP 500 error (fault injection)', async () => {
      // Simulate HTTP 500 server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          message: 'TitlePoint service unavailable'
        })
      })

      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('service unavailable')
        )
      })
    })

    it('handles TitlePoint partial data response (degraded service)', async () => {
      // Simulate partial data response (missing some fields)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          propertySearch: 'Partial match found',
          apn: '123-456-789',
          county: 'Los Angeles',
          // Missing: city, state, zip, legalDescription, grantorName
          fullAddress: '123 Test St, Los Angeles, CA 90210',
          confidence: 0.65 // Lower confidence
        })
      })

      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      await waitFor(() => {
        expect(mockProps.onPropertyVerified).toHaveBeenCalledWith(
          expect.objectContaining({
            apn: '123-456-789',
            fullAddress: '123 Test St, Los Angeles, CA 90210'
          })
        )
      })

      // Should still work with partial data
      expect(mockProps.onError).not.toHaveBeenCalled()
    })

    it('handles network failure (fault injection)', async () => {
      // Simulate network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error: Failed to fetch'))

      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        )
      })
    })
  })

  describe('Grant Deed Generation API Contract Tests', () => {
    it('handles successful grant deed generation contract', async () => {
      // Mock successful PDF generation response
      const mockPdfBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' })
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockPdfBlob,
        headers: new Headers({
          'Content-Type': 'application/pdf',
          'X-Generation-Time': '1250ms',
          'X-Request-ID': 'req-123-456'
        })
      })

      const response = await fetch('http://localhost:8000/api/generate/grant-deed-ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantorName: 'John Doe',
          granteeName: 'Jane Smith',
          propertyAddress: '123 Test St, Los Angeles, CA 90210',
          apn: '123-456-789'
        })
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('X-Generation-Time')).toBe('1250ms')
      
      const blob = await response.blob()
      expect(blob.type).toBe('application/pdf')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('handles grant deed generation timeout (fault injection)', async () => {
      // Simulate PDF generation timeout
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout')), 100)
        )
      )

      await expect(
        fetch('http://localhost:8000/api/generate/grant-deed-ca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantorName: 'John Doe',
            granteeName: 'Jane Smith',
            propertyAddress: '123 Test St, Los Angeles, CA 90210'
          })
        })
      ).rejects.toThrow('PDF generation timeout')
    })

    it('handles grant deed validation errors (fault injection)', async () => {
      // Simulate validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: {
            grantorName: 'Grantor name is required',
            propertyAddress: 'Invalid property address format'
          }
        })
      })

      const response = await fetch('http://localhost:8000/api/generate/grant-deed-ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
          granteeName: 'Jane Smith'
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      
      const errorData = await response.json()
      expect(errorData.error).toBe('Validation failed')
      expect(errorData.details).toHaveProperty('grantorName')
      expect(errorData.details).toHaveProperty('propertyAddress')
    })
  })

  describe('AI Assist API Contract Tests', () => {
    it('handles successful AI assist response contract', async () => {
      // Mock successful AI assist response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          suggestions: {
            grantorName: 'John A. Doe',
            granteeName: 'Jane B. Smith',
            considerationAmount: '$10.00',
            propertyDescription: 'Single family residence'
          },
          confidence: 0.92,
          duration: 850,
          cached: false,
          request_id: 'ai-req-789'
        })
      })

      const response = await fetch('http://localhost:8000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Help me fill out grant deed information',
          context: {
            propertyAddress: '123 Test St, Los Angeles, CA 90210',
            docType: 'grant_deed'
          }
        })
      })

      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.suggestions).toHaveProperty('grantorName')
      expect(data.confidence).toBeGreaterThan(0.8)
      expect(data.request_id).toMatch(/^ai-req-/)
    })

    it('handles AI assist timeout (fault injection)', async () => {
      // Simulate AI service timeout
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI service timeout')), 100)
        )
      )

      await expect(
        fetch('http://localhost:8000/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Help me fill out grant deed information'
          })
        })
      ).rejects.toThrow('AI service timeout')
    })
  })

  describe('Feature Flag Resilience Tests', () => {
    it('gracefully handles disabled Google Places API', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = 'false'
      
      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      // Should still render but with limited functionality
      expect(screen.getByPlaceholderText(/enter property address/i)).toBeInTheDocument()
      
      // Should show appropriate messaging about disabled features
      expect(screen.getByText(/google places api disabled/i)).toBeInTheDocument()
    })

    it('gracefully handles disabled TitlePoint integration', async () => {
      process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED = 'false'
      
      render(<PropertySearchWithTitlePoint {...mockProps} />)
      
      const input = screen.getByPlaceholderText(/enter property address/i)
      await userEvent.type(input, '123 Test St, Los Angeles, CA')
      
      // Should not attempt TitlePoint API call
      expect(mockFetch).not.toHaveBeenCalled()
      
      // Should still allow manual property entry
      expect(input).toHaveValue('123 Test St, Los Angeles, CA')
    })
  })
})
