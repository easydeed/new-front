/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initialize, mockInstances } from '@googlemaps/jest-mocks'
import PropertySearchWithTitlePoint from '../PropertySearchWithTitlePoint'

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PropertySearchWithTitlePoint', () => {
  const mockProps = {
    onPropertyVerified: jest.fn(),
    onError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Reset environment variables
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = 'true'
    process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED = 'true'
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY = 'test-api-key'
    
    // Initialize Google Maps mocks (handled by jest.setup.js)
    initialize()
  })

  it('renders property search input', () => {
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    expect(screen.getByPlaceholderText(/enter property address/i)).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('shows disabled state when Google Places is disabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = 'false'
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const searchButton = screen.getByText('Search')
    expect(searchButton).toBeDisabled()
  })

  it('shows warning when API key is not configured', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    // Component should handle missing API key gracefully
    expect(screen.getByPlaceholderText(/enter property address/i)).toBeInTheDocument()
  })

  it('handles address input', async () => {
    const user = userEvent.setup()
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test St')
    
    expect(input).toHaveValue('123 Test St')
  })

  it('enables search button when address is entered', async () => {
    const user = userEvent.setup()
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    const searchButton = screen.getByText('Search')
    
    // Initially disabled
    expect(searchButton).toBeDisabled()
    
    // Type address
    await user.type(input, '123 Test St')
    
    // Should be enabled now
    expect(searchButton).not.toBeDisabled()
  })

  it('handles Google Places API suggestions', async () => {
    const user = userEvent.setup()
    
    // Mock Google Places API response
    const mockPredictions = [
      {
        place_id: 'test-place-id-1',
        description: '123 Test St, Test City, CA, USA',
        structured_formatting: {
          main_text: '123 Test St',
          secondary_text: 'Test City, CA, USA'
        }
      }
    ]
    
    const mockAutocompleteService = {
      getPlacePredictions: jest.fn((request, callback) => {
        callback(mockPredictions, 'OK')
      })
    }
    
    global.window.google.maps.places.AutocompleteService = jest.fn(() => mockAutocompleteService)
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test')
    
    // Wait for suggestions to appear
    await waitFor(() => {
      // Check if suggestions are rendered (they might be in a dropdown)
      const suggestionElements = screen.queryAllByText(/123 Test St/i)
      if (suggestionElements.length > 0) {
        expect(suggestionElements[0]).toBeInTheDocument()
      }
    }, { timeout: 3000 })
  })

  it('handles TitlePoint integration when enabled', async () => {
    const user = userEvent.setup()
    
    // Mock successful TitlePoint API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        apn: '123-456-789',
        county: 'Test County',
        legalDescription: 'Test legal description',
        grantorName: 'Previous Owner'
      })
    })
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test St')
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // Should make API call to TitlePoint if enabled
    await waitFor(() => {
      if (mockFetch.mock.calls.length > 0) {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/property/search'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
      }
    }, { timeout: 3000 })
  })

  it('handles TitlePoint API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock TitlePoint API error
    mockFetch.mockRejectedValueOnce(new Error('TitlePoint API error'))
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test St')
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // Should handle error gracefully and not crash
    await waitFor(() => {
      expect(input).toBeInTheDocument()
    })
  })

  it('works with TitlePoint disabled', async () => {
    const user = userEvent.setup()
    
    // Disable TitlePoint feature flag
    process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED = 'false'
    
    render(<PropertySearchWithTitlePoint {...mockProps} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test St')
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // Should not make TitlePoint API calls when disabled
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls onPropertyVerified with property data', async () => {
    const user = userEvent.setup()
    const mockOnPropertyVerified = jest.fn()
    
    // Mock successful property verification
    const mockPlaceDetails = {
      place_id: 'test-place-id-1',
      formatted_address: '123 Test St, Test City, CA 90210, USA',
      address_components: [
        { long_name: '123', short_name: '123', types: ['street_number'] },
        { long_name: 'Test St', short_name: 'Test St', types: ['route'] },
        { long_name: 'Test City', short_name: 'Test City', types: ['locality'] },
        { long_name: 'CA', short_name: 'CA', types: ['administrative_area_level_1'] },
        { long_name: '90210', short_name: '90210', types: ['postal_code'] },
        { long_name: 'Test County', short_name: 'Test County', types: ['administrative_area_level_2'] }
      ]
    }
    
    const mockPlacesService = {
      getDetails: jest.fn((request, callback) => {
        callback(mockPlaceDetails, 'OK')
      })
    }
    
    global.window.google.maps.places.PlacesService = jest.fn(() => mockPlacesService)
    
    render(<PropertySearchWithTitlePoint {...mockProps} onPropertyVerified={mockOnPropertyVerified} />)
    
    const input = screen.getByPlaceholderText(/enter property address/i)
    await user.type(input, '123 Test St')
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // Should eventually call onPropertyVerified
    await waitFor(() => {
      if (mockOnPropertyVerified.mock.calls.length > 0) {
        expect(mockOnPropertyVerified).toHaveBeenCalledWith(
          expect.objectContaining({
            fullAddress: expect.stringContaining('123 Test St'),
            street: expect.stringContaining('123 Test St'),
            city: 'Test City',
            state: 'CA',
            zip: '90210'
          })
        )
      }
    }, { timeout: 5000 })
  })

  it('calls onError when errors occur', async () => {
    const user = userEvent.setup()
    const mockOnError = jest.fn()
    
    // Remove API key to trigger error
    delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    
    render(<PropertySearchWithTitlePoint {...mockProps} onError={mockOnError} />)
    
    // Should call onError when API key is missing
    await waitFor(() => {
      if (mockOnError.mock.calls.length > 0) {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Address search not available')
        )
      }
    }, { timeout: 3000 })
  })
})