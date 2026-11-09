const { defineConfig } = require('cypress')
const { configureSyntheticBrowser } = require('./scripts/synthetic-browser.cjs')

module.exports = defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      // Test environment variables
      GOOGLE_PLACES_ENABLED: 'false',
      TITLEPOINT_ENABLED: 'false'
    },
    setupNodeEvents(on, config) {
      configureSyntheticBrowser(on, config)
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })
      return config
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.js',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
})
