const { defineConfig } = require('cypress')
const { configureTargets } = require('./cypress/target-policy.cjs')

module.exports = defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    env: {
      // Staging environment variables
      GOOGLE_PLACES_ENABLED: 'false',
      TITLEPOINT_ENABLED: 'false',
      DYNAMIC_WIZARD_ENABLED: 'false'
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
