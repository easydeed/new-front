/* Exercise the patched minifier, dev server and Cypress without app/API data.
 * Never load application browser configs or account helpers.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const cypress = require('cypress');
const { withSyntheticBrowser } = require('./synthetic-browser.cjs');
const toolRequire = createRequire(require.resolve('@cypress/webpack-dev-server/package.json'));
const webpack = toolRequire('webpack');
const WebpackDevServer = toolRequire('webpack-dev-server');

async function main() {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'deedpro-toolchain-smoke-'));
  const publicDir = path.join(project, 'public');
  await fs.mkdir(publicDir);
  const entry = path.join(project, 'entry.js');
  const spec = path.join(project, 'local.cy.js');
  await fs.writeFile(entry, "document.getElementById('result').textContent = 'local toolchain ready';\n");
  await fs.writeFile(path.join(publicDir, 'index.html'),
    '<!doctype html><html><body><p id="result">loading</p><script src="/bundle.js"></script></body></html>');
  await fs.writeFile(spec, `describe('isolated patched toolchain', () => {
    it('serves and executes the minified local bundle', () => {
      // Bounded startup observation window: keep the refusal active while
      // browser startup/background requests settle. This is not an app retry.
      cy.wait(10000);
      cy.visit('/');
      cy.get('#result').should('have.text', 'local toolchain ready');
    });
  });`);

  const compiler = webpack({ mode: 'production', entry, devtool: false,
    output: { path: publicDir, filename: 'bundle.js' } });
  const server = new WebpackDevServer({ host: '127.0.0.1', port: 0, open: false,
    static: { directory: publicDir }, client: false, hot: false, webSocketServer: false }, compiler);
  try {
    await server.start();
    await new Promise((resolve, reject) => server.middleware.waitUntilValid((stats) => {
      if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true })));
      else resolve();
    }));
    const baseUrl = `http://127.0.0.1:${server.server.address().port}`;
    const configFile = path.join(project, 'cypress.config.cjs');
    const supportFile = path.join(project, 'support.cjs');
    const policyFile = path.resolve(__dirname, '../cypress/target-policy.cjs').replaceAll('\\', '/');
    const safetyFile = path.resolve(__dirname, '../cypress/support/target-safety.cjs').replaceAll('\\', '/');
    // Use the already-merged safety policy, not another copy of loopback rules.
    await fs.writeFile(supportFile, `const { installTargetSafety } = require(${JSON.stringify(safetyFile)}); installTargetSafety(Cypress, cy, before, beforeEach);\n`);
    const config = { video: false, screenshotOnRunFailure: false,
      e2e: { baseUrl, specPattern: spec.replaceAll('\\', '/'), supportFile: supportFile.replaceAll('\\', '/') } };
    // This generated file is the only config loaded; application browser
    // settings and account helpers are never read.
    await fs.writeFile(configFile, `const { configureTargets } = require(${JSON.stringify(policyFile)}); module.exports = ${JSON.stringify(config, null, 2)}; module.exports.e2e.setupNodeEvents = (on, config) => configureTargets(config);\n`);
    // Bounded reproduction: three fresh browsers, all required to pass. Stop on
    // the first failure; never retry a failed result until it happens to pass.
    await withSyntheticBrowser(async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Toolchain isolated browser ${attempt}/3`);
        const result = await cypress.run({ project, configFile, browser: 'electron',
          headed: false, record: false, env: { API_URL: baseUrl } });
        assert.equal(result.totalFailed, 0, result.message || 'Cypress smoke failed');
        assert.equal(result.totalPassed, 1, 'Cypress must pass the actual test, not skip it');
        assert.equal(result.totalSkipped, 0);
        assert.equal(result.totalPending, 0);
      }
    });
    console.log('Local toolchain smoke passed; no app or production API was used.');
  } finally {
    await server.stop();
    await new Promise((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
    console.log(`Synthetic smoke evidence retained at ${project}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
