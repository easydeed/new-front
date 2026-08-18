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
  // The server-redirect stubs (/settings, /create-deed, /shared-deeds…)
  // are NOT listed here any more. They were, one entry at a time, and
  // the Requests merge was about to add a fourth — at which point a
  // hand-kept list of one recurring shape is a list that will be added
  // to without being thought about. `isRedirectOnly` below recognises
  // the shape and PROVES the exemption instead of asserting it.
]);

/**
 * ═══ WHAT COUNTS AS A GUARD, AND WHY THE LIST WAS NOT IT ═══
 *
 * This used to be four strings, one of which was
 * `localStorage.getItem('access_token')` — a line that appears in EVERY
 * file calling an authenticated endpoint, because that is how you build
 * an Authorization header. So a page reading a token TO SEND IT counted
 * as a page that guards its route.
 *
 * Three of fourteen non-public pages passed that way: `/onboarding`,
 * `/deeds/[id]/preview` and `/partners`. None had a guard. The first was
 * found only when an unrelated refactor moved its token read into a
 * module and took the string with it — the sweep then reported what had
 * always been true.
 *
 * §14.1.1's silent half, in a security sweep, which is the worst
 * habitat it has appeared in: a pin matching a string rather than a
 * property did not merely miss the gap, it CERTIFIED it. A later audit
 * had no reason to open a file whose test was green.
 *
 * ═══ THE PROPERTY ═══
 *
 * A guard is not "the file mentions a token". It is: **when no token is
 * present, the page does not render its content.** That is one of two
 * shapes, and both are checkable:
 *
 *   1. `useRequireAuth()` — the hook, which reads the token and
 *      `router.replace`s to /login when it is absent. Verified as
 *      behaviour rather than trusted as a name: five pages rest entirely
 *      on it, so a hook that was a name without a behaviour would have
 *      made this a five-page finding instead of a two-page one.
 *
 *   2. An inline redirect on ABSENCE — a `!token` test whose branch
 *      navigates. `if (!res.ok)` does not qualify: that is the page
 *      discovering it is unauthenticated by being REFUSED, which is the
 *      late failure this sweep exists to prevent.
 */

/**
 * Shape 1: the shared hook, AND the render gate it hands back.
 *
 * The hook navigates from an effect, so a page that calls it and ignores
 * its `checked` flag still paints its content for a frame. The property
 * is not "redirects eventually" — it is "does not render its content
 * when no token is present", and `if (!checked) return null` is what
 * delivers the second half.
 *
 * Asserting only the hook's name would have been this sweep repeating
 * its own original mistake one level up: matching the presence of a
 * mechanism rather than its effect. `/team` had both halves; two pages
 * moved onto the hook in this ticket got both because of this check.
 */
function usesGuardHook(src: string): boolean {
  return src.includes('useRequireAuth')
      && /if\s*\(\s*!\s*checked\s*\)\s*return/.test(src);
}

/**
 * Shape 2: a test for an ABSENT token whose branch leaves the page.
 *
 * Matched as a pair rather than as two independent facts — a file may
 * legitimately contain both a `!token` check and an unrelated redirect,
 * so the redirect must be inside the branch.
 *
 * ═══ AND YES, THIS IS A BOUNDED WINDOW. IT IS NOT §14.4's MISTAKE ═══
 *
 * A note for the next reader, who will have read §14.4 about the tsc
 * gate and may be tempted to "fix" this into symmetry with it.
 *
 * That window failed OPEN: a file tsc could not parse dropped out of the
 * error count, and the gate — which only checked that the number had not
 * RISEN — reported an improvement. Breaking the measurement made the
 * result better.
 *
 * This window fails CLOSED. If the branch is longer than the slice, or
 * shaped in a way this cannot read, the guard reads as ABSENT and the
 * sweep goes RED. The page's author is told to look; nobody is told
 * everything is fine. A heuristic that cannot see a guard reports an
 * unguarded page, which is the safe direction for a security sweep and
 * the whole reason the imprecision is acceptable here.
 *
 * Same shape, opposite safety direction. Do not make them match.
 */
function redirectsWhenTokenAbsent(src: string): boolean {
  const test = /if\s*\(\s*!\s*(?:\w*[Tt]oken|localStorage\.getItem\([^)]*token[^)]*\))\s*\)/gi;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = test.exec(src)) !== null) {
    const after = src.slice(m.index, m.index + 400);
    const branch = after.slice(0, after.indexOf('}') + 1 || after.length);
    if (/router\.(push|replace)\(|redirect\(/.test(branch)) return true;
  }
  return false;
}

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

/**
 * A route that renders nothing, fetches nothing, and forwards.
 *
 * ═══ WHY THIS IS AN EXEMPTION AT ALL ═══
 *
 * Routes get renamed, and the old path cannot simply be deleted: a
 * `?focus=` link to `/shared-deeds` is in email that has already been
 * delivered, and `/create-deed` is bookmarked. So each rename leaves a
 * permanent stub whose whole body is a `redirect()`. Asking a stub to
 * carry an auth guard would be worse than pointless — it would bounce
 * the visitor to login from the alias and lose the parameters the alias
 * exists to forward, when the destination guards anyway.
 *
 * ═══ WHY IT IS PROVED RATHER THAN LISTED ═══
 *
 * Three of these sat on the PUBLIC allowlist by name, and the Requests
 * merge brought a fourth. A hand-kept list of one repeating shape stops
 * being read: entry four goes in because entries one through three are
 * already there, and the day somebody adds a name that is NOT a stub,
 * nothing objects. The claim being made is "this route cannot leak
 * anything", so the test makes the route demonstrate it.
 *
 * The bar is deliberately unforgiving. Any sign of a page that does
 * something — a fetch, a token read, storage, state, rendered markup —
 * disqualifies it, and it goes back to needing a real guard.
 */
const LEAK_SIGNS = [
  'apiFetch', 'fetch(', 'localStorage', 'sessionStorage', 'document.cookie',
  'useState', 'useEffect', 'useRouter', '<div', '<main', '<Sidebar',
];

function isRedirectOnly(file: string): boolean {
  const src = codeOnly(fs.readFileSync(file, 'utf8'));
  if (!/from ['"]next\/navigation['"]/.test(src)) return false;
  if (!/\bredirect\(/.test(src)) return false;
  return !LEAK_SIGNS.some((sign) => src.includes(sign));
}

function guards(src: string): boolean {
  return usesGuardHook(src) || redirectsWhenTokenAbsent(src);
}

function hasGuard(file: string): boolean {
  const src = codeOnly(fs.readFileSync(file, 'utf8'));
  if (guards(src)) return true;
  // A layout guard covers its subtree (the admin section guards there).
  let dir = path.dirname(file);
  while (dir.startsWith(APP_DIR)) {
    const layout = path.join(dir, 'layout.tsx');
    if (fs.existsSync(layout) && guards(codeOnly(fs.readFileSync(layout, 'utf8')))) {
      return true;
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
      .filter(({ file }) => !isRedirectOnly(file))
      .filter(({ file }) => !hasGuard(file))
      .map(({ route }) => route);
    expect(unguarded).toEqual([]);
  });

  it('the redirect exemption is recognising the stubs, and only stubs', () => {
    /**
     * The scanner-floor rule: a classifier that matches nothing exempts
     * nothing and passes forever, and one that matches everything
     * exempts the whole app just as quietly. Both ends get a number.
     */
    const stubs = pages.filter(({ file }) => isRedirectOnly(file)).map(({ route }) => route);
    expect(stubs).toEqual(expect.arrayContaining([
      '/settings',        // → /account-settings
      '/create-deed',     // → /deed-builder
      '/shared-deeds',    // → /requests (the focus links already emailed)
    ]));
    // Real screens must never qualify. If the bar ever loosens enough to
    // let one through, this is where it is caught.
    expect(stubs).not.toContain('/requests');
    expect(stubs).not.toContain('/dashboard');
    expect(stubs).not.toContain('/past-deeds');
    expect(stubs.length).toBeLessThan(pages.length / 3);
  });

  it('a stub that grew a data call loses the exemption', () => {
    /**
     * Mutation probe, written down rather than performed once: the
     * exemption is only safe because a stub that starts doing something
     * stops being exempt. Proved on a synthetic file so the probe lives
     * in the suite instead of in a session transcript.
     */
    const bare = `import { redirect } from 'next/navigation';
      export default function S() { redirect('/requests'); }`;
    const grown = `import { redirect } from 'next/navigation';
      import { apiFetch } from '@/lib/apiClient';
      export default async function S() { await apiFetch('/deeds'); redirect('/requests'); }`;
    const tmp = path.join(__dirname, '__redirect_probe.tsx');
    try {
      fs.writeFileSync(tmp, bare);
      expect(isRedirectOnly(tmp)).toBe(true);
      fs.writeFileSync(tmp, grown);
      expect(isRedirectOnly(tmp)).toBe(false);
    } finally {
      fs.unlinkSync(tmp);
    }
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
