/**
 * The Requests merge, step 1 — the rename and the id space.
 *
 * ═══ WHAT MOVED ═══
 *
 * The Shared Deeds tracker is now `/requests`, and `/shared-deeds` is a
 * permanent alias that redirects to it. Permanent, not a migration
 * window: `?focus=` links to the old path are in emails that were
 * already delivered, and an email in somebody's inbox cannot be edited.
 * The alias comes out the day we accept a 404 nobody can report.
 *
 * ═══ WHAT THE MERGE BROKE, AND HOW THE ALIAS FIXES IT ═══
 *
 * Two pages became one, and the two kinds of row are keyed off different
 * tables — a review is a `deed_shares.id`, a signing is a
 * `signing_requests.id`. Review 42 and signing 42 both exist and are
 * different deeds. So `?focus=42` on the merged page names two rows, and
 * the path that used to disambiguate it is gone.
 *
 * The alias supplies what the number cannot: an id arriving at
 * `/shared-deeds` came from the reviews table, because that is the only
 * thing that path ever meant. It leaves saying so.
 *
 * ═══ WHY THESE PINS CALL RATHER THAN GREP ═══
 *
 * The load-bearing rule here is NEGATIVE — an ambiguous link highlights
 * nothing. Source text cannot demonstrate the absence of a guess; only
 * calling the rule with a bare focus and reading `false` can. Same
 * lesson `signingRowAction.ts` carries from the other direction: a
 * string-presence pin cannot tell REACHABLE from PRESENT.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  readFocus, initialFilter, isFocused, aliasTarget, type Focus,
} from '../lib/requestsFocus';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

/** A `useSearchParams`-shaped getter over a plain query string. */
const from = (qs: string) => {
  const sp = new URLSearchParams(qs);
  return readFocus((k) => sp.get(k));
};

describe('a link that says which table the id came from opens that row', () => {
  it('reads both halves off a review link', () => {
    expect(from('kind=reviews&focus=42')).toEqual({ id: 42, kind: 'reviews' });
  });

  it('reads both halves off a signing link', () => {
    expect(from('kind=signings&focus=7')).toEqual({ id: 7, kind: 'signings' });
  });

  it('opens the list the link named', () => {
    expect(initialFilter(from('kind=reviews&focus=42'))).toBe('reviews');
    expect(initialFilter(from('kind=signings&focus=7'))).toBe('signings');
  });

  it('highlights that row and only that row', () => {
    const focus = from('kind=reviews&focus=42');
    expect(isFocused(42, 'reviews', focus)).toBe(true);
    // The same NUMBER in the other table is a different deed belonging
    // to somebody else. This is the whole reason `?kind=` exists.
    expect(isFocused(42, 'signings', focus)).toBe(false);
    expect(isFocused(41, 'reviews', focus)).toBe(false);
  });
});

describe('an ambiguous link refuses rather than guesses', () => {
  it('a focus with no kind highlights nothing, in either list', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR.
     *
     * "Try reviews first" would be right most of the time — reviews are
     * the older feature and there are more of them — and wrong the rest,
     * silently, by highlighting a stranger's signing. A tie-breaking
     * rule invents an answer that will be right often enough that nobody
     * checks it (doctrine §0). A heuristic wrong 5% of the time is more
     * dangerous than one wrong 50%, because the 50% one gets found.
     *
     * An unhighlighted list is merely a list. A highlighted wrong row is
     * an assertion.
     */
    const bare = from('focus=42');
    expect(bare).toEqual({ id: 42, kind: null });
    expect(isFocused(42, 'reviews', bare)).toBe(false);
    expect(isFocused(42, 'signings', bare)).toBe(false);
  });

  it('and shows everything rather than picking a list', () => {
    expect(initialFilter(from('focus=42'))).toBe('all');
    expect(initialFilter(from(''))).toBe('all');
  });

  it('treats a kind it does not recognise as no kind at all', () => {
    // Including the one somebody will type by hand from the old vocabulary.
    for (const qs of ['kind=shares&focus=42', 'kind=&focus=42', 'kind=REVIEWS&focus=42']) {
      expect(from(qs).kind).toBeNull();
      expect(isFocused(42, 'reviews', from(qs))).toBe(false);
    }
  });

  it('rejects a focus that is not a whole row id', () => {
    for (const qs of ['focus=abc', 'focus=', 'focus=1.5', 'focus=%20']) {
      expect(from(`kind=reviews&${qs}`).id).toBeNull();
    }
    // ...and a null id never matches, whatever the kind says.
    expect(isFocused(0, 'reviews', { id: null, kind: 'reviews' } as Focus)).toBe(false);
  });

  it('does not mistake id 0 for a missing id', () => {
    // `Number('0')` is falsy, and the expression this replaced used a
    // truthiness test. Postgres identity columns start at 1 so no row is
    // 0 today — but a rule that is right for the wrong reason breaks
    // the day the reason changes.
    expect(from('kind=reviews&focus=0').id).toBe(0);
  });
});

describe('the alias recovers the id space instead of losing it', () => {
  it('each alias says the one thing its own path meant', () => {
    expect(aliasTarget([['focus', '42']], 'reviews')).toBe('/requests?focus=42&kind=reviews');
    expect(aliasTarget([['focus', '42']], 'signings')).toBe('/requests?focus=42&kind=signings');
  });

  it('round-trips: what the alias emits, the page reads back as that row', () => {
    /**
     * The two halves are written in different files and deployed
     * together, so nothing else compares them. This is the pin that
     * would catch the alias and the page disagreeing about the spelling
     * of `kind` — a redirect that lands on the right page with the wrong
     * parameter is a link that half-works, which is harder to notice
     * than one that does not work at all.
     */
    for (const kind of ['reviews', 'signings'] as const) {
      const target = aliasTarget([['focus', '42']], kind);
      const focus = from(target.split('?')[1]);
      expect(focus).toEqual({ id: 42, kind });
      expect(isFocused(42, kind, focus)).toBe(true);
      // ...and never the same number in the other table.
      expect(isFocused(42, kind === 'reviews' ? 'signings' : 'reviews', focus)).toBe(false);
    }
  });

  it('carries every other parameter across untouched', () => {
    const target = aliasTarget(
      [['focus', '42'], ['utm_source', 'email'], ['deed', '9']], 'reviews');
    const sp = new URLSearchParams(target.split('?')[1]);
    expect(sp.get('utm_source')).toBe('email');
    expect(sp.get('deed')).toBe('9');
  });

  it('gives a link that already carries a kind exactly one', () => {
    const sp = new URLSearchParams(
      aliasTarget([['kind', 'signings'], ['focus', '42']], 'reviews').split('?')[1]);
    expect(sp.getAll('kind')).toEqual(['reviews']);
  });

  it('is what BOTH alias pages actually call', () => {
    /** The function is only the rule if the routes use it. Two aliases
     *  now, and a second copy of the function with one word changed is
     *  how they would come to disagree about the spelling of `kind`. */
    for (const [dir, kind] of [['shared-deeds', 'reviews'], ['signings', 'signings']] as const) {
      const alias = codeOnly(read('app', dir, 'page.tsx'));
      expect(alias).toContain(`redirect(aliasTarget(entries, '${kind}'))`);
      // And it redirects rather than rendering a second copy of the tracker.
      expect(alias).not.toContain('apiFetch');
    }
  });

  it('is what the page actually calls', () => {
    const page = codeOnly(read('app', 'requests', 'page.tsx'));
    expect(page).toContain('readFocus(');
    expect(page).toContain('initialFilter(focus)');
    expect(page).toContain('isFocused(deed.id, "reviews", focus)');
    // The signings half is the agenda component now; it takes the focused
    // id as a prop rather than parsing the query string a second time.
    expect(page).toContain('focusId={focus.kind === "signings" ? focus.id : null}');
    // No second opinion about what a kind is, next to the first.
    expect(page).not.toContain('=== "reviews" ||');
  });
});

describe('the alias is reachable, and the old page is not duplicated', () => {
  it('the route still exists — an email cannot be edited', () => {
    expect(fs.existsSync(path.join(SRC, 'app', 'shared-deeds', 'page.tsx'))).toBe(true);
  });

  it('the tracker lives at /requests and nowhere else', () => {
    expect(fs.existsSync(path.join(SRC, 'app', 'requests', 'page.tsx'))).toBe(true);
    // Both aliases are short redirects; the tracker is the real screen.
    // A copy left behind at either old path is two screens drifting
    // apart, which is the defect this merge exists to remove.
    for (const dir of ['shared-deeds', 'signings']) {
      expect(read('app', dir, 'page.tsx').split('\n').length).toBeLessThan(80);
    }
  });

  it('the signings route still exists — the schedule notice is an email', () => {
    expect(fs.existsSync(path.join(SRC, 'app', 'signings', 'page.tsx'))).toBe(true);
  });
});

describe('every in-app link points at the new route', () => {
  /**
   * The alias catches mail. It should not be catching our own sidebar —
   * a redirect on every navigation is a hop we control and can remove,
   * and leaving it there is how the alias's traffic stops telling us
   * anything about how much old mail is still being clicked.
   */
  const ROUTERS: Array<[string, string[]]> = [
    ['sidebar', ['components', 'Sidebar.tsx']],
    ['dashboard', ['app', 'dashboard', 'page.tsx']],
    ['deed preview', ['app', 'deeds', '[id]', 'preview', 'page.tsx']],
    ['past deeds row action', ['lib', 'signingRowAction.ts']],
  ];

  for (const [name, segments] of ROUTERS) {
    it(`${name} navigates to /requests`, () => {
      const code = codeOnly(read(...segments));
      // BOTH retired paths. Adding the second alias without widening this
      // sweep would have left it auditing half of what it is named for.
      expect(code).not.toMatch(/(router\.push|href[:=])\s*[('"`]+\/shared-deeds/);
      expect(code).not.toMatch(/(router\.push|href[:=])\s*[('"`]+\/signings/);
    });
  }

  it('and a link that names a signing says which table the id came from', () => {
    /* `/requests?focus=42` with no kind highlights nothing — deliberately.
       So an in-app link that carries an id must carry its kind, or it
       lands her on the right page pointing at nothing. */
    for (const segments of [['components', 'Sidebar.tsx'],
                            ['app', 'dashboard', 'page.tsx'],
                            ['lib', 'signingRowAction.ts']]) {
      const code = codeOnly(read(...segments));
      const bare = code.match(/\/requests\?(?!.*kind=)[^`'"]*focus=/g) || [];
      expect(bare).toEqual([]);
    }
  });

  it('but the API path is untouched — /shared-deeds is also a BACKEND route', () => {
    /**
     * A live defect during this ticket: the review modal's
     * `apiFetch('/shared-deeds', {method:'POST'})` was repointed to
     * `/requests?kind=reviews` along with the navigation, which would
     * have 404'd every review share on the first click.
     *
     * A page and an endpoint sharing a name is a trap that a
     * find-and-replace walks straight into, so it gets a pin: the
     * frontend ROUTE moved, the backend ENDPOINT did not.
     */
    const modal = codeOnly(read('features', 'signing', 'ShareForReviewModal.tsx'));
    expect(modal).toContain("'/shared-deeds'");
    const page = codeOnly(read('app', 'requests', 'page.tsx'));
    expect(page).toContain('apiFetch(`/shared-deeds`');
    expect(page).not.toContain('apiFetch(`/requests');
  });
});
