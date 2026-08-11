/**
 * DASH1 — the dashboard is a workflow surface.
 *
 * ═══ THE FINDING ═══
 *
 * Everything on the dashboard was document-authoring state: four
 * counters and a feed. Nothing was WORKFLOW state — and workflow state
 * is the escrow officer's job. She could not answer "what is stuck?",
 * "what signs tomorrow?" or "who has not responded?" without visiting
 * two other pages, while the page carried four entry points for creating
 * a deed, which she does once per file and forty times less often than
 * she checks what is waiting.
 *
 * ═══ WHAT IS PINNED ═══
 *
 *  1. THE QUEUE LEADS. Above the counters, in the source order the page
 *     renders. A workflow surface with the workflow below the trivia is
 *     the old page with an extra section.
 *  2. EVERY ROW LINKS TO THE THING ITSELF, and every link LANDS —
 *     `?status=` and `?focus=` are read by the page they point at. A
 *     link that arrives and shows an unfiltered list is the dead-button
 *     defect wearing a URL.
 *  3. A COUNT WITH NO DRILL-DOWN IS TRIVIA. `href` on StatCard is
 *     REQUIRED, so a tile added later without one fails to compile
 *     rather than silently reintroducing the thing this ticket removed.
 *  4. THE EMPTY QUEUE SAYS SO. An honest empty queue is a good morning,
 *     not a blank page — and a FAILED queue says that instead, because
 *     "nothing is waiting" is a claim about her work rather than about
 *     our request (§4).
 *  5. "THIS MONTH" IS GONE. It rendered a big zero every rollover.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

const DASH = read('app', 'dashboard', 'page.tsx');
const DASH_CODE = codeOnly(DASH);
const PAST = read('app', 'past-deeds', 'page.tsx');
const PAST_CODE = codeOnly(PAST);

describe('DASH1 — the queue leads', () => {
  it('renders what is waiting above the counters', () => {
    const queueAt = DASH_CODE.indexOf('<ActionQueue');
    const statsAt = DASH_CODE.indexOf('label="Total Deeds"');
    expect(queueAt).toBeGreaterThan(-1);
    expect(statsAt).toBeGreaterThan(-1);
    expect(queueAt).toBeLessThan(statsAt);
  });

  it('asks the server what is waiting rather than working it out', () => {
    expect(DASH_CODE).toContain('apiFetch(`/dashboard/queue`');
    // No local threshold. "Stale" is decided once, server-side.
    expect(DASH_CODE).not.toContain('STUCK_AFTER_DAYS');
    expect(DASH_CODE).not.toMatch(/>=\s*5\s*&&/);
  });

  it('splits the three questions instead of making one pile', () => {
    // "Chase somebody", "be somewhere" and "finish something" are
    // different actions; merged, she sorts them by hand every morning.
    expect(DASH_CODE).toContain('queue.upcoming');
    expect(DASH_CODE).toContain('queue.awaiting');
    expect(DASH_CODE).toContain('queue.idle_drafts');
  });

  it('shows one attention number, from the server', () => {
    expect(DASH_CODE).toContain('queue.needs_attention');
    // It is not recomputed here — a second opinion about which rows
    // count would make the number mean two things.
    expect(DASH_CODE).not.toMatch(/filter\([^)]*\.stale\)/);
  });
});

describe('DASH1 — an empty queue is an answer, a failed one is not', () => {
  it('says nothing is waiting rather than rendering nothing', () => {
    expect(flat(DASH)).toContain('Nothing is waiting on anyone.');
  });

  it('a failed queue says so instead of showing the empty state', () => {
    // §4. "Nothing is waiting" over a failed request is a claim about
    // her work, made out of our own error.
    expect(flat(DASH)).toContain("Couldn't load what's waiting");
    const errorBranch = DASH_CODE.indexOf('if (error)');
    const emptyBranch = DASH_CODE.indexOf('const empty =');
    expect(errorBranch).toBeGreaterThan(-1);
    expect(errorBranch).toBeLessThan(emptyBranch);
  });

  it('keeps the queue and the deed list on separate errors', () => {
    // Either failing must not blank the other — the rule FLOW1 item 3
    // landed on when Shared Deeds grew a second feed.
    expect(DASH_CODE).toContain('setQueueError');
    expect(DASH_CODE).toContain('setDeedsError');
  });
});

describe('DASH1 — every count and every row goes somewhere', () => {
  it('makes href required on a stat tile', () => {
    // Not optional. A tile added later without one would silently be
    // the thing this ticket removed.
    expect(DASH_CODE).toMatch(/color:\s*"blue"\s*\|\s*"yellow"\s*\|\s*"green"\s*\|\s*"purple"\s*\n?\s*href:\s*string/);
    expect(DASH_CODE).not.toContain('href?: string');
  });

  it('every tile carries a drill-down', () => {
    // Counted over the grid rather than matched per element: a
    // `<StatCard ... icon={<FileText />} ... />` closes its ICON first,
    // so a non-greedy match ends before the props that matter. The first
    // version of this pin did exactly that and failed on correct code.
    const grid = DASH_CODE.slice(
      DASH_CODE.indexOf('grid-cols-2 lg:grid-cols-4'),
      DASH_CODE.indexOf('Create New Deed'));
    const tiles = (grid.match(/<StatCard\b/g) || []).length;
    const hrefs = (grid.match(/\bhref="/g) || []).length;
    expect(tiles).toBe(4);
    expect(hrefs).toBe(tiles);
  });

  it('the activity rows link to the deed', () => {
    expect(DASH_CODE).toContain('?resume=${deed.id}');
    expect(DASH_CODE).toContain('/past-deeds?focus=${deed.id}');
  });

  it('and those links land — the target reads them', () => {
    // The half of a link that is easy to forget. `?status=` seeds the
    // filter, `?focus=` marks the row.
    expect(PAST_CODE).toContain('params?.get("status")');
    expect(PAST_CODE).toContain('params?.get("focus")');
    expect(PAST_CODE).toContain('deed.id === focusId');
  });
});

describe('DASH1 — the feed says what it shows', () => {
  it('is no longer called "Recent Activity" while sorted by creation', () => {
    // `GET /deeds` orders by created_at DESC, so a draft edited this
    // morning sat below five deeds made last week and never touched.
    expect(flat(DASH)).not.toContain('>Recent Activity<');
    expect(flat(DASH)).toContain('Recently worked on');
  });

  it('sorts by when something last happened to the deed', () => {
    expect(DASH_CODE).toContain('const recentlyTouched');
    expect(flat(DASH_CODE)).toContain('String(b.updated_at || b.created_at');
    expect(DASH_CODE).toContain('recentlyTouched.slice(0, 5)');
  });
});

describe('DASH1 — "This Month" is gone', () => {
  it('counts a rolling window instead of a calendar page', () => {
    expect(DASH_CODE).not.toContain('label="This Month"');
    expect(DASH_CODE).toContain('label="Last 30 days"');
    expect(DASH_CODE).toContain('data.last_30_days');
    // And the state field is not still called `month` while holding
    // thirty days — a name that lies inside the component is the
    // same defect one scope down.
    expect(DASH_CODE).toContain('lastThirtyDays');
    expect(DASH_CODE).not.toMatch(/summary\?\.month/);
  });
});
