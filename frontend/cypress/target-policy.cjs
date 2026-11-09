// Shared by final Node configuration and browser commands. No env flag can
// authorize a remote host: a remote test environment needs separate owner review.
function fail(message) {
  throw new Error(`[browser target safety] ${message}`)
}

function origin(value, field) {
  if (typeof value !== 'string' ||
      !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i.test(value)) {
    fail(`${field} must explicitly name a loopback HTTP(S) origin; no deployed targets are approved`)
  }
  try {
    return new URL(value).origin
  } catch {
    // Never echo input: an accidentally supplied URL could contain credentials.
    fail(`${field} is not a valid loopback origin`)
  }
}

function targets(config) {
  return {
    frontend: origin(config.baseUrl, 'baseUrl'),
    api: origin(config.env && config.env.API_URL, 'API_URL'),
  }
}

function checkedUrl(value, base, allowed) {
  let parsed
  try {
    if (typeof value !== 'string' || !value || value !== value.trim()) fail('URL is required')
    parsed = new URL(value, base)
  } catch {
    fail('request or visit URL is invalid')
  }
  if (parsed.username || parsed.password || !allowed.includes(parsed.origin)) {
    fail('request or visit is outside the configured test origins')
  }
  return parsed.href
}

function configureTargets(config) {
  targets(config) // Cypress has already merged file, environment and CLI values.
  return config
}

// Owner-approved deny-only treatment for observed browser infrastructure.
// This NEVER authorizes a remote target or applies to cy.request/cy.visit.
function knownBrowserDownloadBlock(request) {
  let url
  try { url = new URL(request.url) } catch { return null }
  const knownHost = url.hostname === 'edgedl.me.gvt1.com' ||
    url.hostname === 'redirector.gvt1.com' || /^rr\d+---sn-[a-z0-9-]+\.gvt1\.com$/.test(url.hostname)
  if (!knownHost || !['http:', 'https:'].includes(url.protocol) ||
      url.port || url.username || url.password ||
      !['GET', 'HEAD'].includes(request.method) ||
      (request.resourceType && request.resourceType !== 'other')) return null
  // App fetch/XHR/navigation/resource traffic, authenticated requests and
  // requests carrying app-origin context must keep the strict failure path.
  const appHeaders = ['origin', 'referer', 'authorization', 'cookie']
  const headers = Object.fromEntries(Object.entries(request.headers || {}).map(([name, value]) => [name.toLowerCase(), value]))
  if (appHeaders.some(name => Object.hasOwn(headers, name)) ||
      (headers['sec-fetch-site'] && headers['sec-fetch-site'] !== 'none') ||
      (headers['sec-fetch-dest'] && headers['sec-fetch-dest'] !== 'empty')) return null
  return {
    statusCode: 503,
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store',
      'x-deedpro-test-block': 'browser-background-download' },
    body: 'Browser background download blocked locally by the test safety policy.',
  }
}

module.exports = { targets, checkedUrl, configureTargets, knownBrowserDownloadBlock }
