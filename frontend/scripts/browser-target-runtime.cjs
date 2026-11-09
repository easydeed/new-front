// Disposable loopback-only proof. Two deliberately refused tests must FAIL for
// the proof to pass; a sentinel proves neither request reached its destination.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

const listen = (server) => new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const close = (server) => new Promise(resolve => server.close(resolve))

async function runProof(cypress) {
  let forbiddenHits = 0
  const forbidden = http.createServer((req, res) => { forbiddenHits++; res.end('must not reach') })
  await listen(forbidden)
  const forbiddenUrl = `http://127.0.0.1:${forbidden.address().port}`
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: forbiddenUrl + '/redirected' }); res.end()
    } else if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}')
    } else {
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html><body><p id="result">local fixture</p></body></html>')
    }
  })
  try {
    await listen(server)
    const baseUrl = `http://127.0.0.1:${server.address().port}`
    const root = path.resolve(__dirname, '..').replaceAll('\\', '/')
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'deedpro-browser-target-proof-'))
    const support = path.join(project, 'support.cjs')
    await fs.writeFile(support, `const { installTargetSafety } = require(${JSON.stringify(root + '/cypress/support/target-safety.cjs')}); installTargetSafety(Cypress, cy, before, beforeEach);`)
    const configFile = path.join(project, 'cypress.config.cjs')
    await fs.writeFile(configFile, `const { configureSyntheticBrowser } = require(${JSON.stringify(root + '/scripts/synthetic-browser.cjs')}); module.exports = ${JSON.stringify({ video:false, screenshotOnRunFailure:false, e2e:{ baseUrl, supportFile:support.replaceAll('\\','/'), specPattern:'*.cy.js' }, env:{API_URL:baseUrl} })}; module.exports.e2e.setupNodeEvents = configureSyntheticBrowser;`)
    const positive = path.join(project, 'positive.cy.js')
    await fs.writeFile(positive, "describe('local positive control',()=>{it('visits and requests the configured fixture',()=>{cy.visit('/');cy.get('#result').should('have.text','local fixture');cy.request('/health').its('status').should('eq',200);});});")
    const negative = path.join(project, 'negative.cy.js')
    await fs.writeFile(negative, `describe('expected safety refusals',()=>{it('refuses a different origin before sending',()=>{cy.request(${JSON.stringify(forbiddenUrl + '/direct')});});it('refuses redirects before following',()=>{cy.request('/redirect');});});`)
    const options = { project, configFile, browser:'electron', headed:false, record:false }
    const good = await cypress.run({ ...options, spec:positive })
    assert.equal(good.totalPassed, 1); assert.equal(good.totalFailed, 0)
    assert.equal(good.totalPending, 0); assert.equal(good.totalSkipped, 0)
    const bad = await cypress.run({ ...options, spec:negative })
    assert.equal(bad.totalFailed, 2); assert.equal(bad.totalPassed, 0)
    assert.equal(bad.totalPending, 0); assert.equal(bad.totalSkipped, 0)
    const messages = bad.runs.flatMap(run => run.tests.map(test => test.displayError || ''))
    assert.ok(messages.some(message => message.includes('outside the configured test origins')))
    assert.ok(messages.some(message => message.includes('request redirect refused')))
    assert.equal(forbiddenHits, 0, 'Direct request and redirect must not reach the local sentinel')
    const result = { positivePassed:1, expectedRefusals:2, forbiddenHits, project }
    await fs.writeFile(path.join(project, 'proof-result.json'), JSON.stringify(result, null, 2))
    console.log('Browser target proof passed: one positive test, two expected refusals, zero sentinel hits.')
    console.log(`Synthetic proof evidence retained at ${project}`)
    return result
  } finally {
    await close(server); await close(forbidden)
  }
}

module.exports = runProof
if (require.main === module) runProof(require('cypress')).catch(error => { console.error(error); process.exitCode = 1 })
