// ***********************************************************
// Staging-specific E2E support file for Phase 5 validation
// Simplified configuration without automatic accessibility injection
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Simplified setup for staging environment testing
beforeEach(() => {
  // Set up common test environment without axe injection
  cy.window().then((win) => {
    // Mock console methods to reduce noise in tests
    win.console.warn = cy.stub()
    win.console.error = cy.stub()
  })
})

// No automatic accessibility checks for staging tests
// (These will be run manually when needed)
