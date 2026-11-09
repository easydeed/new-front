// Run with node --test; the .check suffix keeps Jest from claiming this file.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { targets, checkedUrl } = require('../cypress/target-policy.cjs')
const { installTargetSafety, loginInputs } = require('../cypress/support/target-safety.cjs')

const frontend = 'http://127.0.0.1:3000'
const api = 'http://127.0.0.1:8000'
const config = () => ({ baseUrl: frontend, env: { API_URL: api } })

for (const value of [undefined, '', 'https://deedpro.io', 'https://www.deedpro.io',
  'https://deedpro-frontend-new.vercel.app', 'https://deedpro-main-api.onrender.com',
  'https://test.invalid', 'http://localhost.evil.invalid', 'http://127.0.0.1.evil.invalid',
  '//localhost:3000', 'file:///tmp/page', 'http://user:fixture@localhost:3000',
  'http://localhost:3000/path', 'http://localhost:3000/?token=fixture',
  'http://localhost:3000/#fragment', ' http://localhost:3000', 'http://127.1:3000',
  'http://2130706433:3000', 'http://0.0.0.0:3000', 'http://localhost:99999']) {
  // Do not print potentially sensitive input as a test title.
  test(`refuses unsafe or missing origin case ${String(value).length}-${Math.abs([...String(value)].reduce((n, c) => n + c.charCodeAt(0), 0))}`, () => {
    assert.throws(() => targets({ ...config(), baseUrl: value }), /browser target safety/)
    assert.throws(() => targets({ ...config(), env: { API_URL: value } }), /browser target safety/)
  })
}

test('accepts explicit loopback origins, including IPv6, without network access', () => {
  for (const origin of ['http://localhost:3000', frontend, 'http://[::1]:3000', 'https://localhost:3443/']) {
    assert.equal(targets({ baseUrl: origin, env: { API_URL: api } }).frontend, new URL(origin).origin)
  }
})

for (const filename of ['cypress.config.js', 'cypress-staging.config.js', 'cypress-phase5.config.js']) {
  test(`${filename} validates the final merged config before registering tasks`, () => {
    const full = path.join(__dirname, '..', filename)
    const localRequire = createRequire(full)
    const box = { module: { exports: {} }, require: (name) =>
      name === 'cypress' ? { defineConfig: (value) => value } : localRequire(name) }
    vm.runInNewContext(fs.readFileSync(full, 'utf8'), box, { filename })
    const e2e = box.module.exports.e2e
    assert.equal(e2e.baseUrl, undefined)
    assert.equal(e2e.env.API_URL, undefined)
    let events = 0
    const on = () => { events++ }
    assert.throws(() => e2e.setupNodeEvents(on, { env: {} }), /browser target safety/)
    assert.equal(events, 0)
    assert.throws(() => e2e.setupNodeEvents(on, { ...config(), baseUrl: 'https://deedpro.io' }), /browser target safety/)
    assert.equal(events, 0)
    const explicit = config()
    assert.equal(e2e.setupNodeEvents(on, explicit), explicit)
    assert.equal(events, 1)
  })
}

function harness() {
  const state = config()
  const overwrites = {}
  const hooks = []
  const intercepts = []
  const Cypress = {
    config: (name) => state[name], env: (name) => state.env[name],
    Commands: { overwrite: (name, fn) => { overwrites[name] = fn } },
  }
  const cy = { intercept: (matcher, handler) => { intercepts.push({ matcher, handler }) } }
  installTargetSafety(Cypress, cy, (fn) => hooks.push(fn), (fn) => hooks.push(fn))
  return { state, Cypress, overwrites, hooks, intercepts }
}

test('direct request refusals happen before the original command, with value-free errors', () => {
  const h = harness()
  let sent = 0
  for (const url of ['https://blocked.invalid/private?token=fixture', '//deedpro.io/private',
    'http://localhost:9999/', 'http://user:fixture@127.0.0.1:8000/']) {
    assert.throws(() => h.overwrites.request(() => { sent++ }, url), (error) => {
      assert.doesNotMatch(error.message, /fixture|private|token|blocked\.invalid/)
      return /browser target safety/.test(error.message)
    })
  }
  assert.equal(sent, 0)
})

test('supports request overloads and never follows redirects, even on explicit opt-in', async () => {
  const h = harness()
  const cases = [
    ['/health'], ['/health', { fixture: true }], ['health', 'fixture'], ['GET', api + '/health'],
    ['POST', api + '/test', { fixture: true }],
    [{ url: api + '/test', method: 'POST', followRedirect: true, body: { fixture: true } }],
  ]
  for (const args of cases) {
    let sent
    const response = await h.overwrites.request((options) => {
      sent = options
      return Promise.resolve({ status: 200 })
    }, ...args)
    assert.equal(sent.followRedirect, false)
    assert.ok([frontend, api].includes(new URL(sent.url).origin))
    if (args[0] === 'health') {
      assert.equal(sent.url, frontend + '/health')
      assert.equal(sent.body, 'fixture')
    }
    assert.equal(response.status, 200)
  }
  let redirectsFollowed = 0
  await assert.rejects(h.overwrites.request((options) => {
    if (options.followRedirect) redirectsFollowed++
    return Promise.resolve({ status: 302, headers: { location: 'https://blocked.invalid' } })
  }, api + '/redirect'), /redirect refused/)
  assert.equal(redirectsFollowed, 0)
})

test('visits allow frontend only and refuse before delegation', () => {
  const h = harness()
  let calls = 0
  const original = (...args) => { calls++; return args }
  assert.equal(h.overwrites.visit(original, '/login')[0], frontend + '/login')
  assert.equal(h.overwrites.visit(original, { url: '/login' })[0].url, frontend + '/login')
  for (const value of ['https://deedpro.io', '//blocked.invalid', api + '/login']) {
    assert.throws(() => h.overwrites.visit(original, value), /browser target safety/)
  }
  assert.equal(calls, 2)
})

test('runtime config mutations cannot bypass request, visit or login checks', () => {
  const h = harness()
  h.state.env.API_URL = 'https://deedpro-main-api.onrender.com'
  assert.throws(() => h.overwrites.request(() => assert.fail('sent'), '/health'), /browser target safety/)
  assert.throws(() => h.overwrites.visit(() => assert.fail('sent'), '/'), /browser target safety/)
  assert.throws(() => loginInputs(h.Cypress, 'fixture', 'fixture'), /browser target safety/)
})

test('both suite and per-test fences destroy unapproved traffic before it continues', () => {
  const h = harness()
  assert.equal(h.hooks.length, 2)
  h.hooks.forEach((hook) => hook())
  assert.equal(h.intercepts.length, 2)
  for (const { matcher, handler } of h.intercepts) {
    assert.equal(matcher.middleware, true)
    let destroyed = 0
    handler({ url: api + '/test', destroy: () => { destroyed++ } })
    assert.equal(destroyed, 0)
    assert.throws(() => handler({ url: 'https://blocked.invalid', destroy: () => { destroyed++ } }), /refused/)
    assert.equal(destroyed, 1)
  }
})

test('login requires explicit disposable account values; there are no account defaults', () => {
  const h = harness()
  assert.throws(() => loginInputs(h.Cypress), /no account defaults/)
  h.state.env.TEST_EMAIL = 'fixture@example.invalid'
  assert.throws(() => loginInputs(h.Cypress), /no account defaults/)
  h.state.env.TEST_PASSWORD = 'fixture-only'
  assert.deepEqual(loginInputs(h.Cypress), { apiUrl: api, email: 'fixture@example.invalid', password: 'fixture-only' })
})

test('URL validation has positive controls as well as negative controls', () => {
  assert.equal(checkedUrl('/test', api, [api]), api + '/test')
  assert.throws(() => checkedUrl('https://blocked.invalid', api, [api]), /outside/)
})

test('the actual login commands install the guards and cannot send without explicit account inputs', () => {
  const state = config()
  const commands = {}
  const overwrites = {}
  const sent = []
  const Cypress = {
    config: (name) => state[name], env: (name) => state.env[name],
    Commands: {
      overwrite: (name, fn) => { overwrites[name] = fn },
      add: (name, fn) => { commands[name] = fn },
    },
  }
  const cy = {
    request: (options) => {
      sent.push(options)
      return { then: (fn) => fn({ status: 200, body: { access_token: 'synthetic-fixture' } }) }
    },
    setCookie: () => {}, log: () => {},
  }
  const full = path.join(__dirname, '../cypress/support/commands.js')
  const context = { Cypress, cy, require: createRequire(full), before: () => {}, beforeEach: () => {},
    window: { localStorage: { setItem: () => {} } } }
  vm.runInNewContext(fs.readFileSync(full, 'utf8'), context, { filename: 'commands.js' })
  assert.equal(typeof overwrites.request, 'function')
  assert.equal(typeof overwrites.visit, 'function')
  for (const name of ['login', 'loginProgrammatic']) {
    assert.throws(() => commands[name](), /no account defaults/)
  }
  assert.equal(sent.length, 0)
  state.env.TEST_EMAIL = 'fixture@example.invalid'
  state.env.TEST_PASSWORD = 'fixture-only'
  for (const name of ['login', 'loginProgrammatic']) commands[name]()
  assert.equal(sent.length, 2)
  for (const options of sent) {
    assert.equal(options.url, api + '/users/login')
    assert.equal(options.log, false)
    assert.equal(options.body.email, state.env.TEST_EMAIL)
    assert.equal(options.body.password, state.env.TEST_PASSWORD)
  }
  state.env.API_URL = 'https://deedpro-main-api.onrender.com'
  for (const name of ['login', 'loginProgrammatic']) {
    assert.throws(() => commands[name](), /browser target safety/)
  }
  assert.equal(sent.length, 2)
})
