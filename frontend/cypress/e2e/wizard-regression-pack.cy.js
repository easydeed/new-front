/**
 * Cypress E2E Tests - Full Regression Pack
 * Phase 4: Quality Assurance & Hardening
 * 
 * Per Wizard Rebuild Plan:
 * - Full regression pack
 * - Accessibility (axe) checks  
 * - PDF download verification
 */

describe('Wizard Regression Pack - Full E2E Suite', () => {
  beforeEach(() => {
    // Set up test environment
    cy.visit('/')
    
    // Mock external APIs for consistent testing
    cy.intercept('POST', '**/api/property/search', {
      statusCode: 200,
      body: {
        success: true,
        apn: '123-456-789',
        county: 'Los Angeles',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
        legalDescription: 'Lot 1, Block 2, Tract 3',
        grantorName: 'John Doe',
        fullAddress: '123 Test St, Los Angeles, CA 90210',
        confidence: 0.95
      }
    }).as('propertySearch')
    
    cy.intercept('POST', '**/api/generate/grant-deed-ca', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Generation-Time': '1250ms',
        'X-Request-ID': 'test-req-123'
      },
      body: 'Mock PDF Content'
    }).as('generateDeed')
    
    cy.intercept('POST', '**/api/ai/assist', {
      statusCode: 200,
      body: {
        success: true,
        suggestions: {
          grantorName: 'John A. Doe',
          granteeName: 'Jane B. Smith',
          considerationAmount: '$10.00'
        },
        confidence: 0.92,
        request_id: 'ai-test-123'
      }
    }).as('aiAssist')
  })

  describe('Landing Page & Navigation', () => {
    it('should load homepage with proper accessibility', () => {
      cy.visit('/')
      
      // Check basic page structure
      cy.get('h1').should('exist')
      cy.get('nav').should('exist')
      
      // Accessibility check
      cy.checkAccessibility()
      
      // Test responsive design
      cy.testResponsive(['iphone-6', 'ipad-2', 'macbook-15'])
    })

    it('should navigate to create deed wizard', () => {
      cy.visit('/')
      
      // Find and click create deed button/link
      cy.contains(/create.*deed|start.*wizard|get.*started/i).click()
      
      // Should navigate to wizard
      cy.url().should('include', '/create-deed')
      
      // Check accessibility of wizard page
      cy.checkAccessibility()
    })
  })

  describe('Dynamic Wizard Flow', () => {
    beforeEach(() => {
      cy.goToWizard()
    })

    it('should complete full wizard flow with accessibility checks', () => {
      // Step 1: Property Address
      cy.get('h2').should('contain', 'Property Address')
      cy.checkAccessibility()
      
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      cy.get('button').contains(/search|verify/i).click()
      
      cy.waitForAPI('@propertySearch')
      
      // Step 2: Document Type & Data (if dynamic wizard)
      cy.get('body').then(($body) => {
        if ($body.find('h2:contains("Document Type")').length > 0) {
          cy.checkAccessibility()
          
          // Fill in required fields
          cy.get('input[placeholder*="grantor"], input[name*="grantor"]')
            .type('John A. Doe')
          
          cy.get('input[placeholder*="grantee"], input[name*="grantee"]')
            .type('Jane B. Smith')
          
          // Test AI assist if available
          cy.get('body').then(($body2) => {
            if ($body2.find('button:contains("AI Assist")').length > 0) {
              cy.get('button').contains('AI Assist').click()
              cy.waitForAPI('@aiAssist')
            }
          })
        }
      })
      
      // Final step: Generate deed
      cy.get('button').contains(/generate|create|download/i).click()
      cy.waitForAPI('@generateDeed')
      
      // Verify PDF generation
      cy.checkPDFDownload()
    })

    it('should handle form validation properly', () => {
      cy.goToWizard()
      
      // Test empty form submission
      cy.get('button').contains(/generate|create|next/i).click()
      
      // Should show validation errors
      cy.get('.error, [role="alert"], .text-red-600').should('exist')
      
      // Check accessibility of error states
      cy.checkAccessibility()
    })

    it('should handle loading states correctly', () => {
      cy.goToWizard()
      
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      
      // Test loading state
      cy.testLoadingState('button:contains("Search")')
      
      // Check accessibility during loading
      cy.checkAccessibility()
    })
  })

  describe('Legacy Wizard Fallback', () => {
    it('should work with legacy 5-step wizard', () => {
      // Navigate to legacy wizard
      cy.visit('/create-deed/grant-deed')
      
      // Check accessibility
      cy.checkAccessibility()
      
      // Test basic functionality
      cy.get('h1, h2').should('contain', /grant.*deed/i)
      
      // Fill step 1 - Property Info
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      cy.get('button').contains(/next|continue/i).click()
      
      // Check accessibility on each step
      cy.checkAccessibility()
    })
  })

  describe('Error Handling & Resilience', () => {
    it('should handle API failures gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '**/api/property/search', {
        statusCode: 500,
        body: { error: 'Service unavailable' }
      }).as('propertySearchError')
      
      cy.goToWizard()
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      cy.get('button').contains(/search|verify/i).click()
      
      cy.wait('@propertySearchError')
      
      // Should show error message
      cy.get('.error, [role="alert"], .text-red-600').should('exist')
      
      // Check accessibility of error states
      cy.checkAccessibility()
    })

    it('should handle network timeouts', () => {
      // Mock timeout
      cy.intercept('POST', '**/api/property/search', {
        delay: 15000, // Longer than default timeout
        statusCode: 408,
        body: { error: 'Request timeout' }
      }).as('propertySearchTimeout')
      
      cy.goToWizard()
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      cy.get('button').contains(/search|verify/i).click()
      
      // Should handle timeout gracefully
      cy.get('.error, [role="alert"]').should('exist')
      cy.checkAccessibility()
    })
  })

  describe('Feature Flag Resilience', () => {
    it('should work with disabled Google Places', () => {
      // Mock disabled feature
      cy.window().then((win) => {
        win.localStorage.setItem('GOOGLE_PLACES_ENABLED', 'false')
      })
      
      cy.goToWizard()
      
      // Should still allow manual address entry
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      
      // Check accessibility
      cy.checkAccessibility()
    })

    it('should work with disabled TitlePoint', () => {
      // Mock disabled feature
      cy.window().then((win) => {
        win.localStorage.setItem('TITLEPOINT_ENABLED', 'false')
      })
      
      cy.goToWizard()
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      
      // Should work without TitlePoint enrichment
      cy.checkAccessibility()
    })
  })

  describe('Mobile & Responsive Testing', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-6')
      cy.goToWizard()
      
      // Check mobile accessibility
      cy.checkAccessibility()
      
      // Test mobile interactions
      cy.fillPropertyAddress('123 Test St')
      cy.get('button').contains(/search/i).should('be.visible').click()
      
      // Check responsive behavior
      cy.get('input').should('be.visible')
    })

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2')
      cy.goToWizard()
      
      cy.checkAccessibility()
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
    })
  })

  describe('PDF Download Verification', () => {
    it('should generate and download PDF successfully', () => {
      cy.goToWizard()
      
      // Complete wizard flow
      cy.fillPropertyAddress('123 Test St, Los Angeles, CA 90210')
      cy.get('button').contains(/search|verify/i).click()
      cy.waitForAPI('@propertySearch')
      
      // Fill required fields if needed
      cy.get('body').then(($body) => {
        if ($body.find('input[placeholder*="grantor"]').length > 0) {
          cy.get('input[placeholder*="grantor"]').type('John Doe')
          cy.get('input[placeholder*="grantee"]').type('Jane Smith')
        }
      })
      
      // Generate PDF
      cy.checkPDFDownload()
      
      // Verify API call was made
      cy.wait('@generateDeed').then((interception) => {
        expect(interception.response.statusCode).to.equal(200)
        expect(interception.response.headers).to.have.property('content-type', 'application/pdf')
      })
    })
  })

  describe('Performance & Loading', () => {
    it('should load pages within acceptable time', () => {
      const startTime = Date.now()
      
      cy.visit('/')
      cy.get('h1').should('be.visible')
      
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(3000) // 3 second max
      })
    })

    it('should handle concurrent users simulation', () => {
      // Simulate multiple rapid requests
      for (let i = 0; i < 5; i++) {
        cy.goToWizard()
        cy.fillPropertyAddress(`${100 + i} Test St, Los Angeles, CA 90210`)
        cy.get('button').contains(/search/i).click()
      }
      
      // Should handle all requests
      cy.checkAccessibility()
    })
  })
})
