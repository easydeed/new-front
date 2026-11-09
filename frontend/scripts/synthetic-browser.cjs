const { configureTargets } = require('../cypress/target-policy.cjs');

// Electron initializes dictionaries before its test-window preferences apply.
// Use supported Chrome with spelling disabled in its private PRE-LAUNCH profile.
// No user profile, broad feature flags, security settings or network guards change.
// https://docs.cypress.io/app/references/launching-browsers
// https://docs.cypress.io/api/node-events/browser-launch-api#Change-browser-preferences
const SYNTHETIC_BROWSER = 'chrome';
function configureSyntheticBrowser(on, config) {
  configureTargets(config);
  on('before:browser:launch', (browser, options) => {
    if (browser.family !== 'chromium' || browser.name === 'electron') return options;
    return { ...options, preferences: { ...options.preferences,
      default: { ...options.preferences?.default,
        browser: { ...options.preferences?.default?.browser, enable_spellchecking: false },
        spellcheck: { ...options.preferences?.default?.spellcheck,
          dictionaries: [], use_spelling_service: false } } } };
  });
  return config;
}

module.exports = { configureSyntheticBrowser, SYNTHETIC_BROWSER };
