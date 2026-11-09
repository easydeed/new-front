const { configureTargets } = require('../cypress/target-policy.cjs');

// Electron fetches Hunspell dictionaries from Google's CDN by default. That
// request is unrelated to the fixture but must still be refused by our fence.
// Disable only test-window spellchecking, not security checks or network guards.
// https://www.electronjs.org/docs/latest/tutorial/spellchecker
// https://docs.cypress.io/api/node-events/browser-launch-api#Change-browser-preferences
function configureSyntheticBrowser(on, config) {
  configureTargets(config);
  on('before:browser:launch', (browser, options) => {
    if (browser.name !== 'electron') return options;
    return { ...options, preferences: { ...options.preferences,
      webPreferences: { ...options.preferences?.webPreferences, spellcheck: false } } };
  });
  return config;
}

module.exports = { configureSyntheticBrowser };
