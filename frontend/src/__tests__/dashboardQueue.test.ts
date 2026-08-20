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
/* DASH3 moved the sentences and the destinations server-side (§13 rule
   3), so the rulings that used to be satisfied in this file are now
   satisfied one language over. */
const PY_WORKLIST = fs.readFileSync(
  path.join(SRC, '..', '..', 'backend', 'services', 'worklist.py'), 'utf8');
const PAST_CODE = codeOnly(PAST);

describe('DASH1 — the queue leads', () => {
  it('IS the body — DASH3 removed the counters it used to sit above', () => {
    /**
     * §16 — WHAT THIS RULING BECAME.
     *
     * DASH1 ruled the queue leads, because what is waiting on somebody
     * comes before what has been made. It was pinned as "the queue
     * renders above the stat tiles", which asserted an ORDER between two
     * things — and DASH3 removed the second one. The ruling is not
     * weakened by that; it is satisfied maximally, since the queue is
     * now the whole body and there is nothing left for it to lead.
     *
     * Pinned as the property that survives: the worklist renders, and no
     * counter grid renders above or below it.
     */
    expect(DASH_CODE).toContain('<Worklist');
    expect(DASH_CODE).not.toContain('<StatCard');
    expect(DASH_CODE).not.toContain('grid-cols-2 lg:grid-cols-4');
  });


  it('asks the server what is waiting rather than working it out', () => {
    expect(DASH_CODE).toContain('apiFetch(`/dashboard/queue`');
    // No local threshold. "Stale" is decided once, server-side.
    expect(DASH_CODE).not.toContain('STUCK_AFTER_DAYS');
    expect(DASH_CODE).not.toMatch(/>=\s*5\s*&&/);
  });

  it('keeps the three questions distinguishable without three columns', () => {
    /**
     * §16 — THE COLUMNS ARE SUPERSEDED BY OWNER-SUPPLIED DESIGN; THE
     * REASON FOR THEM IS NOT.
     *
     * DASH1 split "chase somebody", "be somewhere" and "finish
     * something" into three lists so she would not sort one pile by
     * hand. DASH3's design is one list, and the sorting she would have
     * done by hand is done for her: consequence bands order the rows,
     * and each question keeps its own words.
     *
     * I am NOT claiming the bands are the three columns renamed — they
     * are not. "Be somewhere" (a booked signing) sits in the same band
     * as "finish something", because both are her turn. What survives is
     * the property the columns existed for: no row is indistinguishable
     * from a row of a different kind, and she does not do the sorting.
     */
    /* The WORDS, not the assignment: the chase tag is a conditional
       ("Gone quiet" or "Waiting") and pinning `tag="Waiting"` would be
       asserting how the line is written (§14.1). */
    const py = PY_WORKLIST;
    for (const words of ['"Waiting"', '"Gone quiet"', '"Signing booked"',
                         '"Needs your eyes"', '"Unfinished"', '"Sitting"']) {
      expect(py).toContain(words);
    }
    // And the ordering is the server's, done once.
    expect(py).toContain('def _sort_key');
  });

  it('shows one attention number, from the server', () => {
    /**
     * The ruling is unchanged and its SOURCE moved: the headline was
     * `queue.needs_attention` and is now `worklist.count`, which is
     * `hero_count()` over the very groups rendered below.
     *
     * The half that mattered is the prohibition, and it is kept
     * verbatim: the screen does not recompute it. A second opinion about
     * which rows count makes the number mean two things.
     */
    expect(DASH_CODE).toContain('worklist?.count');
    expect(DASH_CODE).not.toMatch(/filter\([^)]*\.stale\)/);
    expect(DASH_CODE).not.toMatch(/groups[\s\S]{0,40}reduce/);
  });
});

describe('DASH1 — an empty queue is an answer, a failed one is not', () => {
  it('says nothing is waiting rather than rendering nothing', () => {
    // Same ruling, new words: the empty board is a RESULT and says so.
    expect(flat(DASH)).toContain('Nothing needs you.');
    expect(flat(DASH)).toContain('nobody is waiting on a reply');
  });

  it('a failed queue says so instead of showing the empty state', () => {
    // §4. "Nothing is waiting" over a failed request is a claim about
    // her work, made out of our own error.
    expect(flat(DASH)).toContain("Couldn't load what's waiting");
    /* Pinned as ORDER, which is what the ruling actually is: the failure
       branch must be reached before any branch that makes a claim about
       her work. DASH3 turned two branches into four — a failed queue, a
       queue that has not answered, a failed DEED list (F4), and the two
       empty results — and the order is the whole assertion. */
    const failed = DASH_CODE.indexOf('queueError ?');
    const pending = DASH_CODE.indexOf('!queue ?');
    const clear = DASH_CODE.indexOf('hasDeeds ?');
    expect(failed).toBeGreaterThan(-1);
    expect(failed).toBeLessThan(pending);
    expect(pending).toBeLessThan(clear);
  });

  it('keeps the queue and the deed list on separate errors', () => {
    // Either failing must not blank the other — the rule FLOW1 item 3
    // landed on when Shared Deeds grew a second feed.
    expect(DASH_CODE).toContain('setQueueError');
    expect(DASH_CODE).toContain('setDeedsError');
  });
});

describe('DASH1 — every count and every row goes somewhere', () => {
  it('every count that survived is still pressable', () => {
    /**
     * §16 — DASH1's ruling outliving its subject. "A count with no
     * drill-down is trivia: '4 Drafts' that cannot be pressed tells her
     * a number and makes her go and find the four."
     *
     * The tiles are gone. The counts that REPLACED them live in each
     * worklist group header, so they inherit the rule: `N recorded` is a
     * button. The `N open items` count needs none — the rows it counts
     * are directly beneath it, which is the drill-down.
     */
    const worklist = read('features', 'dashboard', 'Worklist.tsx');
    expect(worklist).toContain('recorded=1&property=');
    // Asserted by POSITION rather than by one regex over JSX: an
    // `onClick={() => ...}` contains a `>` of its own, so a `[^>]*`
    // pattern fails on correct code — the fixed-window mistake in a new
    // costume. The property is "the count sits inside a button".
    const at = worklist.indexOf('{group.recorded}');
    expect(at).toBeGreaterThan(-1);
    const before = worklist.slice(0, at);
    expect(before.lastIndexOf('<button')).toBeGreaterThan(before.lastIndexOf('</button>'));
  });



  it('the worklist rows link to the deed', () => {
    /**
     * §16 — THE ORPHAN RULING OUTLIVING THE FEED IT WAS PINNED ON.
     *
     * "Recently worked on" is gone, so its rows are gone. The ruling —
     * a row about a document lands on that document, never on a list
     * where she has to find it again — now applies to the worklist, and
     * is enforced server-side where the hrefs are built.
     *
     * DASH3 broke it twice before restoring it: once by copying a
     * retired alias out of the module it replaced, and once by
     * "fixing" that to the canonical tracker route, which satisfied the
     * link contract and still landed her on a list.
     */
    expect(PY_WORKLIST).toContain('return f"/deeds/{deed_id}"');
    expect(PY_WORKLIST).toContain('/deed-builder?resume=');
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

  it('§16 — the feed is GONE, and its ordering ruling went with it', () => {
    /**
     * DASH1 ruled the feed sorts by when something last HAPPENED to a
     * deed rather than when it was created, because a creation-ordered
     * list read as a completed-deeds feed while the Drafts counter said
     * otherwise.
     *
     * DASH3 removes the feed: every row in it read *Prepared*, which is
     * a list of finished work on a screen for unfinished work. It is the
     * Past Deeds link now.
     *
     * **THE ORDERING RULING DOES NOT SURVIVE, AND THAT IS REPORTED
     * RATHER THAN QUIETLY DROPPED.** It was a rule about the ordering of
     * a module that no longer exists. Past Deeds has its own ordering
     * and its own ruling; if a future reader wants last-touched ordering
     * THERE, that is a new decision about a different screen, not this
     * one inherited.
     */
    expect(DASH_CODE).not.toContain('recentlyTouched.slice(0, 5)');
    // codeOnly: the removal is recorded in a COMMENT on the page, and
    // an assertion that reads prose would fail on the note explaining
    // the very removal it is checking for (§14.1 — the comment-trip).
    expect(flat(DASH_CODE)).not.toContain('Recently worked on');
    // And the replacement is named, so the capability is findable.
    expect(DASH_CODE).toContain('/past-deeds');
  });
});

describe('DASH1 — "This Month" is gone', () => {
  it('§16 — and so is the tile it was a correction to', () => {
    /**
     * DASH1 replaced a calendar-month counter with a rolling 30-day one,
     * because "This Month" rendered a big zero on the first of every
     * month for somebody whose work had not stopped.
     *
     * DASH3 removes the tile entirely. The ruling's INTENT — never
     * report a number whose drop is an artefact of the calendar — has no
     * subject on this screen any more, and is preserved as a prohibition
     * rather than a fix: no monthly counter comes back.
     */
    expect(DASH_CODE).not.toContain('label="This Month"');
    expect(DASH_CODE).not.toContain('label="Last 30 days"');
    expect(DASH_CODE).not.toMatch(/summary\?\.month/);
  });
});
