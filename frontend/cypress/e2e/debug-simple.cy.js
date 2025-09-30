/**
 * Simple Debug Test - Find the exact text issue
 */

describe('Debug Simple Test', () => {
  it('should find what text is actually on the create-deed page', () => {
    cy.visit('/create-deed')
    
    // Log all text content on the page
    cy.get('body').then(($body) => {
      cy.log('Page content:', $body.text())
    })
    
    // Check for various text patterns
    cy.get('body').should('contain', 'Create')
    
    // Try to find the navigation or buttons
    cy.get('a, button').each(($el) => {
      cy.log('Found element:', $el.text())
    })
    
    // Check if we can find "Create Deed" specifically
    cy.contains('Create Deed').should('exist')
  })
  
  it('should test the goToWizard command step by step', () => {
    cy.visit('/create-deed')
    
    // Check if dynamic wizard exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="dynamic-wizard"]').length > 0) {
        cy.log('Found dynamic wizard')
        cy.get('[data-testid="dynamic-wizard"]').should('be.visible')
      } else {
        cy.log('No dynamic wizard found, looking for Create Deed link')
        cy.contains('Create Deed').should('exist').click()
      }
    })
  })
})
