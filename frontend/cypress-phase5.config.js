const { defineConfig } = require('cypress')
const { configureTargets } = require('./cypress/target-policy.cjs')

module.exports = defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e-staging.js',
    specPattern: 'cypress/e2e/wizard-regression-pack.cy.js', // Only run core regression tests
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      // Phase 5 staging environment variables
      GOOGLE_PLACES_ENABLED: 'false',
      TITLEPOINT_ENABLED: 'false',
      DYNAMIC_WIZARD_ENABLED: 'false',
      SKIP_ACCESSIBILITY_CHECKS: 'true'
    },
    setupNodeEvents(on, config) {
      configureTargets(config)
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })
      return config
    },
  },
})
