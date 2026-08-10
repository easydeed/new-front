/**
 * HX0 — every internal route rejects unauthenticated access.
 *
 * The audit's finding: /security served the internal app (audit-log UI,
 * IP whitelist, session controls, logout) to a logged-out visitor — the
 * page relied on its data calls failing instead of guarding the route.
 * This is the route-level cousin of the `return True` guard sweep: walk
 * EVERY app route; each one is either on the explicit PUBLIC allowlist
 * or must carry an auth guard (its own, or its layout's). A new page
 * added without a guard fails this test by default.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const APP_DIR = path.join(__dirname, '..', 'app');

// Public BY DESIGN — everything else must guard.
const PUBLIC_ROUTES = new Set([
  '/', // marketing homepage
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify/[code]', // public QR verification of recorded deeds
  '/approve/[token]', // public share-approval flow (token IS the auth)
  // NOTARY2. The token IS the auth, as with /approve — but this one is
  // different in kind and the difference is worth writing down: it is
  // the FIRST CONSUMER SURFACE in this product. Everyone who has ever
  // seen a DeedPro screen has been a professional under an engagement; a
  // signer is a member of the public who got a text about their own
  // house. It is unauthenticated by design (they have no account and
  // must never need one), throttled per-token and per-IP server-side,
  // and its payload is an allowlist pinned by exact key-set equality —
  // see services/signing_surfaces.py. Being on this list is a decision,
  // not an oversight.
  '/signing/[token]',
  '/api-key-request', // partner lead form
  // A4: developer documentation. Public and indexable by ruling —
  // linked from the footer only while key issuance is manual, so it is
  // discoverable by people who go looking without sitting in the
  // conversion path of people who aren't. (/docs retired; it now 301s
  // here.)
  '/developers',
  '/terms', // public legal scaffold (HM3)
  '/privacy', // public legal scaffold (HM3)
  '/settings', // server redirect to /account-settings (which guards)
  '/create-deed', // legacy server redirect to /deed-builder (which guards)
  '/create-deed/[docType]', // legacy server redirect to /deed-builder/[type] (which guards)
]);

const GUARD_MARKERS = [
  'useRequireAuth',
  'AuthManager',
  "localStorage.getItem('access_token')",
  'localStorage.getItem("access_token")',
];

function collectPages(dir: string, route = ''): Array<{ route: string; file: string }> {
  const out: Array<{ route: string; file: string }> = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api' && route === '') continue; // route handlers, not pages
      if (entry.name === 'components' || entry.name === 'styles') continue;
      out.push(...collectPages(p, `${route}/${entry.name}`));
    } else if (entry.name === 'page.tsx') {
      out.push({ route: route || '/', file: p });
    }
  }
  return out;
}

function hasGuard(file: string): boolean {
  const src = fs.readFileSync(file, 'utf8');
  if (GUARD_MARKERS.some((m) => src.includes(m))) return true;
  // A layout guard covers its subtree (the admin section guards there).
  let dir = path.dirname(file);
  while (dir.startsWith(APP_DIR)) {
    const layout = path.join(dir, 'layout.tsx');
    if (fs.existsSync(layout)) {
      const layoutSrc = fs.readFileSync(layout, 'utf8');
      if (GUARD_MARKERS.some((m) => layoutSrc.includes(m))) return true;
    }
    dir = path.dirname(dir);
  }
  return false;
}

describe('HX0 — route-level auth guards', () => {
  const pages = collectPages(APP_DIR);

  it('found a plausible number of routes (walker sanity)', () => {
    expect(pages.length).toBeGreaterThan(15);
  });

  it('every non-public route carries an auth guard', () => {
    const unguarded = pages
      .filter(({ route }) => !PUBLIC_ROUTES.has(route))
      .filter(({ file }) => !hasGuard(file))
      .map(({ route }) => route);
    expect(unguarded).toEqual([]);
  });

  it('the audited leak specifically: /team mounts the guard', () => {
    // /security was the other half of this pin. RED-H1.1 DELETED that
    // route rather than guarding it — see the next test.
    const src = fs.readFileSync(path.join(APP_DIR, 'team', 'page.tsx'), 'utf8');
    expect(src).toContain('useRequireAuth');
    expect(src).toContain('if (!checked) return null;');
  });

  it('RED-H1.1 — /security is GONE, not guarded', () => {
    /**
     * The strongest form of "this page cannot leak" is that the page does
     * not exist. HX0 fixed the route's AUTH; it did not ask whether the
     * page should exist, and the answer turned out to be no.
     *
     * What it rendered was fabricated telemetry end to end: invented login
     * events with invented IP addresses, an invented "Multiple rapid login
     * attempts detected / Automated Bot" high-risk incident, a fake IP
     * whitelist, a fake last-security-scan timestamp, a hardcoded
     * "Compliance Score 94% — SOC2 • GDPR • CCPA", and an audit-log toggle
     * wired to nothing.
     *
     * A fabricated incident report is worse than a fabricated badge: a
     * badge overclaims, but this told an officer that an attack on their
     * account had been detected and handled. Guarding it would have
     * restricted the invention to paying customers.
     *
     * This pin retires when a security page returns with real session
     * telemetry behind it (RED-S3) — and whatever returns must not
     * reintroduce mock data, which is what the second assertion guards.
     */
    expect(fs.existsSync(path.join(APP_DIR, 'security'))).toBe(false);

    const middleware = fs.readFileSync(
      path.join(__dirname, '..', '..', 'middleware.ts'), 'utf8');
    const code = codeOnly(middleware);
    expect(code).not.toMatch(/['"]\/security['"]/);
  });

  it('the builder pages mount the guard', () => {
    for (const rel of [
      ['deed-builder', 'page.tsx'],
      ['deed-builder', '[type]', 'page.tsx'],
      ['deed-builder', '[type]', 'success', 'page.tsx'],
    ]) {
      const src = fs.readFileSync(path.join(APP_DIR, ...rel), 'utf8');
      expect(src).toContain('useRequireAuth');
    }
  });

  it('the guard itself redirects to login and never renders early', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'hooks', 'useRequireAuth.ts'),
      'utf8'
    );
    expect(src).toContain("router.replace(`/login?redirect=");
    expect(src).toContain('setChecked(true)');
  });

  it('the tailwind-test dev fossil is gone from production routes', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'tailwind-test'))).toBe(false);
  });
});
