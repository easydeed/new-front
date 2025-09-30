// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for login
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
})

// Custom command for navigating to wizard
Cypress.Commands.add('goToWizard', (docType = 'grant_deed') => {
  // Follow proper architecture: /create-deed → select document type → specific wizard
  cy.visit('/create-deed')
  
  // Wait for document types to load
  cy.get('h1').should('contain', 'Create Legal Document')
  
  // Select Grant Deed from document type selection
  cy.contains('Grant Deed').click()
  
  // Should navigate to grant deed wizard
  cy.url().should('include', '/create-deed/grant-deed')
  
  // Check if dynamic wizard is enabled
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="dynamic-wizard"]').length > 0) {
      // Dynamic wizard path
      cy.get('[data-testid="dynamic-wizard"]').should('be.visible')
    } else {
      // Legacy wizard should be on this page
      cy.get('h1, h2').should('exist')
    }
  })
})

// Custom command for filling property address
Cypress.Commands.add('fillPropertyAddress', (address = '123 Test St, Los Angeles, CA 90210') => {
  cy.get('input[placeholder*="property address"], input[placeholder*="address"]')
    .clear()
    .type(address)
})

// Custom command for waiting for API calls
Cypress.Commands.add('waitForAPI', (alias) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response.statusCode).to.be.oneOf([200, 201, 202])
  })
})

// Custom command for checking PDF download
Cypress.Commands.add('checkPDFDownload', () => {
  cy.window().then((win) => {
    // Mock PDF download for testing
    cy.stub(win, 'open').as('windowOpen')
  })
  
  cy.get('button').contains(/generate|download|create/i).click()
  cy.get('@windowOpen').should('have.been.called')
})

// Custom command for accessibility testing with custom rules
Cypress.Commands.add('checkAccessibility', (context = null, options = {}) => {
  // Skip accessibility checks if in staging mode
  if (Cypress.env('SKIP_ACCESSIBILITY_CHECKS')) {
    cy.log('Skipping accessibility check (staging mode)')
    return
  }
  
  const defaultOptions = {
    rules: {
      'color-contrast': { enabled: false }, // Disable for now
      'landmark-one-main': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'region': { enabled: true }
    },
    tags: ['wcag2a', 'wcag2aa']
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  cy.checkA11y(context, mergedOptions)
})

// Custom command for testing responsive design
Cypress.Commands.add('testResponsive', (sizes = ['iphone-6', 'ipad-2', 'macbook-15']) => {
  sizes.forEach(size => {
    cy.viewport(size)
    cy.wait(500) // Allow time for responsive changes
    cy.checkAccessibility()
  })
})

// Custom command for form validation testing
Cypress.Commands.add('testFormValidation', (formSelector) => {
  // Test empty form submission
  cy.get(formSelector).within(() => {
    cy.get('button[type="submit"]').click()
  })
  
  // Check for validation messages
  cy.get('.error, [role="alert"], .text-red-600').should('exist')
})

// Custom command for testing loading states
Cypress.Commands.add('testLoadingState', (triggerSelector) => {
  cy.get(triggerSelector).click()
  
  // Check for loading indicators
  cy.get('.animate-spin, .loading, [role="progressbar"]').should('exist')
  
  // Wait for loading to complete
  cy.get('.animate-spin, .loading, [role="progressbar"]').should('not.exist')
})
