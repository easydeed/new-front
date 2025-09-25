// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global before hook for all tests
beforeEach(() => {
  // Inject axe-core for accessibility testing
  cy.injectAxe()
  
  // Set up common test environment
  cy.window().then((win) => {
    // Mock console methods to reduce noise in tests
    win.console.warn = cy.stub()
    win.console.error = cy.stub()
  })
})

// Global after hook for accessibility checks
afterEach(() => {
  // Run accessibility checks on every page
  cy.checkA11y(null, {
    rules: {
      // Disable color-contrast rule for now (can be enabled later)
      'color-contrast': { enabled: false }
    }
  }, (violations) => {
    // Log accessibility violations
    violations.forEach(violation => {
      cy.task('log', `Accessibility violation: ${violation.id}`)
      cy.task('log', `Description: ${violation.description}`)
      cy.task('log', `Help: ${violation.helpUrl}`)
    })
  })
})
