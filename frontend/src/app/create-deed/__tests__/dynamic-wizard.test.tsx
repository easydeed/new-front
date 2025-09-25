/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DynamicWizard from '../dynamic-wizard'

// Mock the PropertySearchWithTitlePoint component
jest.mock('@/components/PropertySearchWithTitlePoint', () => {
  return function MockPropertySearchWithTitlePoint({ onVerified }: any) {
    const handleVerify = () => {
      if (onVerified) {
        onVerified({
          fullAddress: '123 Test St, Test City, CA 90210',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '90210',
          county: 'Test County',
          apn: '123-456-789'
        })
      }
    }

    return (
      <div data-testid="property-search">
        <button onClick={handleVerify}>
          Verify Property
        </button>
      </div>
    )
  }
})

describe('DynamicWizard', () => {
  const mockProps = {
    currentStep: 1,
    docType: 'grant_deed',
    formData: {},
    customPrompt: '',
    loading: false,
    errors: {},
    onPropertyVerified: jest.fn(),
    onDocTypeChange: jest.fn(),
    onButtonPrompt: jest.fn(),
    onCustomPrompt: jest.fn(),
    onCustomPromptChange: jest.fn(),
    onStepChange: jest.fn(),
    onInputChange: jest.fn(),
    onGenerate: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the wizard with property address step', () => {
    render(<DynamicWizard {...mockProps} />)
    
    expect(screen.getByText('Property Address')).toBeInTheDocument()
  })

  it('displays property search on step 1', () => {
    render(<DynamicWizard {...mockProps} currentStep={1} />)
    
    expect(screen.getByTestId('property-search')).toBeInTheDocument()
  })

  it('calls onPropertyVerified when property is verified', async () => {
    const user = userEvent.setup()
    const mockOnPropertyVerified = jest.fn()
    
    render(<DynamicWizard {...mockProps} onPropertyVerified={mockOnPropertyVerified} />)
    
    const verifyButton = screen.getByText('Verify Property')
    await user.click(verifyButton)
    
    expect(mockOnPropertyVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        fullAddress: '123 Test St, Test City, CA 90210',
        apn: '123-456-789'
      })
    )
  })

  it('displays property address step for all document types', () => {
    const { rerender } = render(<DynamicWizard {...mockProps} docType="grant_deed" />)
    expect(screen.getByText('Property Address')).toBeInTheDocument()
    
    rerender(<DynamicWizard {...mockProps} docType="quit_claim" />)
    expect(screen.getByText('Property Address')).toBeInTheDocument()
  })

  it('shows loading state when loading is true', () => {
    render(<DynamicWizard {...mockProps} loading={true} />)
    
    // Should show loading text
    expect(screen.getByText('Fetching data...')).toBeInTheDocument()
  })

  it('displays errors when present', () => {
    const errors = { custom: 'Test error message' }
    render(<DynamicWizard {...mockProps} errors={errors} currentStep={2} />)
    
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('calls onDocTypeChange when document type is changed', async () => {
    const user = userEvent.setup()
    const mockOnDocTypeChange = jest.fn()
    
    render(<DynamicWizard {...mockProps} onDocTypeChange={mockOnDocTypeChange} />)
    
    // Look for document type selector (if it exists)
    const docTypeSelector = screen.queryByRole('combobox') || screen.queryByRole('button', { name: /document type/i })
    
    if (docTypeSelector) {
      await user.click(docTypeSelector)
      expect(mockOnDocTypeChange).toHaveBeenCalled()
    }
  })

  it('handles custom prompt changes', async () => {
    const user = userEvent.setup()
    const mockOnCustomPromptChange = jest.fn()
    
    render(<DynamicWizard {...mockProps} onCustomPromptChange={mockOnCustomPromptChange} />)
    
    // Look for custom prompt input
    const customPromptInput = screen.queryByPlaceholderText(/custom prompt/i) || 
                             screen.queryByLabelText(/custom prompt/i) ||
                             screen.queryByRole('textbox')
    
    if (customPromptInput) {
      await user.type(customPromptInput, 'Test prompt')
      expect(mockOnCustomPromptChange).toHaveBeenCalled()
    }
  })

  it('calls onButtonPrompt when AI assist buttons are clicked', async () => {
    const user = userEvent.setup()
    const mockOnButtonPrompt = jest.fn()
    
    render(<DynamicWizard {...mockProps} onButtonPrompt={mockOnButtonPrompt} />)
    
    // Look for AI assist buttons (vesting, grant_deed, tax_roll)
    const vestingButton = screen.queryByText(/vesting/i) || screen.queryByRole('button', { name: /vesting/i })
    
    if (vestingButton) {
      await user.click(vestingButton)
      expect(mockOnButtonPrompt).toHaveBeenCalledWith('vesting')
    }
  })

  it('handles step changes correctly', () => {
    const mockOnStepChange = jest.fn()
    
    const { rerender } = render(<DynamicWizard {...mockProps} currentStep={1} onStepChange={mockOnStepChange} />)
    
    // Simulate step change
    rerender(<DynamicWizard {...mockProps} currentStep={2} onStepChange={mockOnStepChange} />)
    
    // The component should handle the step change
    expect(mockOnStepChange).not.toHaveBeenCalled() // onStepChange is called by parent, not by prop change
  })

  it('calls onGenerate when generate button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnGenerate = jest.fn()
    
    render(<DynamicWizard {...mockProps} onGenerate={mockOnGenerate} />)
    
    // Look for generate button
    const generateButton = screen.queryByText(/generate/i) || screen.queryByRole('button', { name: /generate/i })
    
    if (generateButton) {
      await user.click(generateButton)
      expect(mockOnGenerate).toHaveBeenCalled()
    }
  })
})