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

module.exports = { targets, checkedUrl, configureTargets }
