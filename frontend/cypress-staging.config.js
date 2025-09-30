const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://deedpro-frontend-new.vercel.app',
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
      API_URL: 'https://deedpro-main-api.onrender.com',
      GOOGLE_PLACES_ENABLED: 'false',
      TITLEPOINT_ENABLED: 'false',
      DYNAMIC_WIZARD_ENABLED: 'false'
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })
    },
  },
})
