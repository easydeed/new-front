const { configureTargets } = require('../cypress/target-policy.cjs');

// Keep the browser bundled with the approved Cypress 15 release line. Known
// background downloads receive owner-approved LOCAL denials in the shared fence.
// No personal profiles, external browser dependency or startup flags are needed.
const SYNTHETIC_BROWSER = 'electron';
function configureSyntheticBrowser(on, config) {
  return configureTargets(config);
}

module.exports = { configureSyntheticBrowser, SYNTHETIC_BROWSER };
