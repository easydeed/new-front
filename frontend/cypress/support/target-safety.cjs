const { targets, checkedUrl } = require('../target-policy.cjs')

function currentTargets(Cypress) {
  return targets({ baseUrl: Cypress.config('baseUrl'), env: { API_URL: Cypress.env('API_URL') } })
}

function loginInputs(Cypress, email, password) {
  const configured = currentTargets(Cypress)
  email = email === undefined ? Cypress.env('TEST_EMAIL') : email
  password = password === undefined ? Cypress.env('TEST_PASSWORD') : password
  if (typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password.trim()) {
    throw new Error('[browser target safety] supply a disposable test account explicitly; no account defaults exist')
  }
  return { apiUrl: configured.api, email, password }
}

function requestOptions(args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object') return { ...args[0] }
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT',
    'COPY', 'LOCK', 'MKCOL', 'MOVE', 'PROPFIND', 'PROPPATCH', 'SEARCH', 'UNLOCK', 'REPORT',
    'MKACTIVITY', 'CHECKOUT', 'MERGE', 'M-SEARCH', 'NOTIFY', 'SUBSCRIBE', 'UNSUBSCRIBE', 'PURGE']
  if (args.length >= 2 && args.length <= 3 && typeof args[1] === 'string' &&
      typeof args[0] === 'string' && methods.includes(args[0].toUpperCase())) {
    return { method: args[0], url: args[1], ...(args.length === 3 ? { body: args[2] } : {}) }
  }
  if (args.length === 1 || args.length === 2) {
    return { url: args[0], ...(args.length === 2 ? { body: args[1] } : {}) }
  }
  throw new Error('[browser target safety] unsupported request arguments')
}

function installTargetSafety(Cypress, cy, before, beforeEach) {
  Cypress.Commands.overwrite('request', (original, ...args) => {
    const configured = currentTargets(Cypress)
    const options = requestOptions(args)
    options.url = checkedUrl(options.url, configured.frontend, Object.values(configured))
    // Cypress's Node-side requests bypass cy.intercept. Never follow a redirect
    // before its destination can be checked, even if a caller asks us to.
    options.followRedirect = false
    return original(options).then((response) => {
      if (response.status >= 300 && response.status < 400) {
        throw new Error('[browser target safety] request redirect refused; use the final approved test URL')
      }
      return response
    })
  })

  Cypress.Commands.overwrite('visit', (original, url, options) => {
    const configured = currentTargets(Cypress)
    const value = typeof url === 'object' && url !== null ? url.url : url
    const checked = checkedUrl(value, configured.frontend, [configured.frontend])
    return typeof url === 'object' && url !== null
      ? original({ ...url, url: checked }) : original(checked, options)
  })

  const fence = () => {
    const configured = currentTargets(Cypress)
    cy.intercept({ url: '**', middleware: true }, (request) => {
      try {
        checkedUrl(request.url, configured.frontend, Object.values(configured))
      } catch {
        request.destroy()
        throw new Error('[browser target safety] browser traffic outside the test origins refused')
      }
    })
  }
  // Protect suite-level login hooks as well as each test (intercepts reset).
  before(fence)
  beforeEach(fence)
}

module.exports = { installTargetSafety, loginInputs }
