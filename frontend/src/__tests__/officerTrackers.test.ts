/**
 * FLOW1 items 3 and 4 — the officer's two trackers, and the Signings page.
 *
 * ═══ ITEM 3: TWO SCREENS THAT DID NOT KNOW ABOUT EACH OTHER ═══
 *
 * A review lives in `deed_shares`; a signing lives in `signing_requests`.
 * Shared Deeds read the first, Signings read the second, and neither
 * mentioned the other — zero cross-references in either direction. So
 * the page named for sharing showed one of the two things she shares,
 * and "where is the thing I sent Nora" had two possible answers and no
 * signpost to either. Its subtitle also said "shared for approval",
 * committing the whole page to reviewer semantics before asking what she
 * had actually sent.
 *
 * The two feeds are NOT flattened into one row shape, and the pin below
 * keeps them apart: a review has a viewing and a decision, a signing has
 * a notary and a set of times. Sharing columns between them would put
 * two different facts under one heading, which is the defect item 0
 * spent a whole PR on.
 *
 * ═══ ITEM 4: THE SIGNINGS PAGE ═══
 *
 * Three things it claimed or did that it should not have:
 *
 *  1. Every card navigated to `/past-deeds`, throwing away which signing
 *     she had pressed — the one gesture on the page discarded the only
 *     context the page had.
 *  2. The subtitle said "soonest first" while the server ordered by
 *     `COALESCE(booked_at, expires_at)` — a signing's time for booked
 *     rows and the LINK'S DEATH for the rest. Two facts in one sort key,
 *     described as a schedule. And nothing on screen carried a date to
 *     check it against.
 *  3. The stuck age was reconstructed as `expires_at minus 21 days`,
 *     duplicating `default_expiry()`'s constant into another language as
 *     a bare number. Changing the default expiry would have silently
 *     re-aimed every stuck badge, and nothing would have failed.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { groupSignings, isStuck, type SigningSummary } from '../features/signing/signingSummary';
import { requestsSections } from '../lib/requestsSections';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

/** The agenda moved out of `app/signings/page.tsx` and into this
 *  component when the Requests merge folded it into `/requests`;
 *  the old path is now a permanent alias that redirects. Pointed at
 *  the alias these assertions would read a forty-line redirect —
 *  see requestsMerge.test.ts for the retarget reasoning. */
const SIGNINGS = read('features', 'signing', 'SigningAgenda.tsx');
/** The tracker moved to `/requests`; `app/shared-deeds/page.tsx` is now
 *  the permanent alias that redirects there. See
 *  sharedDeedsContract.test.ts for the retarget reasoning. */
const SHARED = read('app', 'requests', 'page.tsx');
const SIGNINGS_CODE = codeOnly(SIGNINGS);
/** DEEDDETAIL: the agenda's expanding panel became its own component and
 *  is rendered on the deed page. The pins about the PANEL read it here;
 *  the pins about the ROW still read the agenda. */
const DETAIL_CODE = codeOnly(read('features', 'signing', 'SigningDetail.tsx'));
const SUMMARY_CODE = codeOnly(read('features', 'signing', 'signingSummary.ts'));

/** A signing row with only the fields a test cares about named. */
const row = (over: Partial<SigningSummary>): SigningSummary => ({
  id: 1, deed_id: 1, property_address: null, deed_type: null,
  notary_name: null, state: 'requested', live: true, summary: '',
  booked_at: null, booked_by: null, created_at: null, days_waiting: null,
  stale: false, expires_at: null, signers: 1, ...over,
});
const SHARED_CODE = codeOnly(SHARED);

describe('FLOW1 item 3 — the two trackers know about each other', () => {
  it('is ONE page now, and both old paths lead to it', () => {
    /**
     * Item 3 gave the two trackers links to each other. Step 2 of the
     * Requests merge removed the need: they are one page with two
     * renderers, and a cross-link from a page to itself is furniture.
     *
     * What replaced the property is stronger — both retired paths are
     * permanent aliases onto this page, each supplying the kind its own
     * path used to imply. That is pinned by CALL in requestsMerge.test.ts;
     * here we only check the page still renders both halves.
     */
    expect(SHARED_CODE).toContain('<SigningAgenda');
    expect(SHARED_CODE).toContain('sharedDeeds.map');
  });

  it('the tracker shows both kinds, filterable, both by default', () => {
    expect(SHARED_CODE).toContain('TrackerFilter');
    /**
     * "Both by default" used to be pinned as the literal
     * `useState<TrackerFilter>("all")`. The Requests merge gave the
     * initial filter a reason to vary — a link that names a kind opens
     * that kind — so the default moved into `initialFilter`, and the
     * spelling this line used to match is gone.
     *
     * The pin follows the PROPERTY rather than the spelling: the page
     * asks the shared rule, and `requestsMerge.test.ts` CALLS that rule
     * with no parameters and asserts the answer is "all". Re-asserting
     * a literal here would be a second, weaker opinion about a decision
     * that is now tested by execution.
     */
    expect(SHARED_CODE).toContain('useState<TrackerFilter>(initialFilter(focus))');

    /**
     * Which halves are on screen was four JSX conditions, and a
     * combination of individually-correct ones produced a BLANK PAGE —
     * filtered to Reviews with no reviews but several signings, nothing
     * rendered at all, not even the "nothing here" panel. So the
     * decision moved into `requestsSections` and is CALLED here.
     */
    expect(requestsSections('all', 3, 2)).toEqual(
      { showReviews: true, showSignings: true, showEmpty: false });
    expect(requestsSections('reviews', 3, 2).showSignings).toBe(false);
    expect(requestsSections('signings', 3, 2).showReviews).toBe(false);
  });

  it('never renders a page with nothing on it', () => {
    /** The blank-page case, swept over every combination rather than
     *  reasoned about at four separate call sites. */
    for (const filter of ['all', 'reviews', 'signings'] as const) {
      for (const reviews of [0, 1, 5]) {
        for (const signings of [0, 1, 5]) {
          const s = requestsSections(filter, reviews, signings);
          expect(s.showReviews || s.showSignings || s.showEmpty).toBe(true);
        }
      }
    }
  });

  it('the subtitle no longer commits the page to reviewer semantics', () => {
    // Half of what lands here is a signing request, and a notary is not
    // being asked to approve anything — she is being asked when she is
    // free.
    expect(flat(SHARED)).not.toContain('Track deeds shared for approval');
    expect(flat(SHARED)).toContain('reviews you asked for and signings you arranged');
  });

  it('a signing row does not borrow a review’s vocabulary', () => {
    /**
     * It used to say so by writing "—" into the review table's Response
     * and Viewed columns. Step 2 removed the compromise instead of
     * decorating it: a signing is a card with a notary, a set of times
     * and an expandable detail, so those columns do not exist for it to
     * leave blank. The pin follows — the agenda holds none of the
     * review vocabulary at all.
     */
    expect(SIGNINGS_CODE).not.toContain('getStatusBadge');
    expect(SIGNINGS_CODE).not.toContain('response_date');
    expect(SIGNINGS_CODE).not.toMatch(/approve|reject/i);
    // NOT `viewed_at`: the detail panel uses `p.viewed_at` to say whether
    // a PARTICIPANT has opened their link, which is a different fact that
    // happens to share a name with the review column. A pin that fired on
    // it would be matching the spelling and calling it vocabulary.
  });
});

describe('FLOW1 item 4 — the card opens the signing', () => {
  it('no card navigates to /past-deeds any more', () => {
    // The empty state may still point at her deeds — that is a signpost
    // for somebody with no signings, not a row throwing away context.
    const rowRegion = SIGNINGS_CODE.slice(SIGNINGS_CODE.indexOf('function SigningRow'));
    expect(rowRegion).not.toContain('/past-deeds');
    expect(SIGNINGS_CODE).not.toContain("onOpen={() => router.push(`/past-deeds`)}");
  });

  it('the row LEADS to the signing itself — it no longer expands onto it', () => {
    /**
     * DEEDDETAIL retargeted this, and the direction is worth naming: the
     * rule was "a row leads somewhere", and it still does. What changed
     * is where the panel lives.
     *
     * The tracker's job is the CROSS-DEED question — what has gone quiet
     * across every file. A panel that opens one signing in place answers
     * a single-deed question in the middle of it, and single-deed is
     * exactly what the deed page is for.
     *
     * The named cost was accepted: cancel goes from one click to
     * navigate-plus-click.
     */
    expect(SIGNINGS_CODE).toContain('href={`/deeds/${row.deed_id}`}');
    expect(SIGNINGS_CODE).not.toContain('aria-expanded');
    // And the detail it used to fetch is fetched by the component that
    // moved — same request, one place.
    expect(flat(DETAIL_CODE)).toContain('apiFetch(`/signing-requests/v2/${requestId}`');
  });

  it('is linkable, so a notification can point at one signing', () => {
    /* `?focus=` still reaches a row; it marks it rather than expanding
       it. The parameter is still parsed in exactly one place for both
       kinds of row, which is the rule this pin is actually about. */
    expect(SIGNINGS_CODE).toContain('focusId');
    expect(SIGNINGS_CODE).toContain('focused={focusId === r.id}');
    expect(SHARED_CODE).toContain('focusId={focus.kind === "signings" ? focus.id : null}');
  });

  it('a detail that fails to load says so rather than looking empty', () => {
    // §4: an empty panel would read as "this signing has no
    // participants", which is a claim. The panel moved; the rule did not.
    expect(DETAIL_CODE).toContain('Could not load this signing');
  });
});

describe('FLOW1 item 4 — the order is the one it claims', () => {
  it('does not claim "soonest first" over rows with no date', () => {
    expect(flat(SIGNINGS)).not.toContain('Every signing you have arranged, soonest first');
  });

  it('sorts each group by the fact that group actually has', () => {
    // Booked by when it is booked for; being-arranged by how long she
    // has waited, oldest first — the longest-waiting is the one worth a
    // phone call. Orthogonal facts, separate keys: T-5 one layer up.
    /**
     * CALLED, not grepped. The sort moved into `groupSignings` when the
     * agenda became a component, and a pin matching the comparator's
     * source text would have broken on the move while telling us nothing
     * about the order it produces.
     */
    const rows = [
      row({ id: 1, state: 'booked', booked_at: '2026-09-10T17:00:00Z' }),
      row({ id: 2, state: 'booked', booked_at: '2026-09-02T17:00:00Z' }),
      row({ id: 3, state: 'requested', created_at: '2026-08-01T00:00:00Z' }),
      row({ id: 4, state: 'requested', created_at: '2026-07-01T00:00:00Z' }),
    ];
    const g = groupSignings(rows);
    expect(g.booked.map((r) => r.id)).toEqual([2, 1]);      // soonest first
    expect(g.arranging.map((r) => r.id)).toEqual([4, 3]);   // longest-waiting first
  });

  it('files a closed request as closed, whatever was arranged', () => {
    /** A cancelled signing that HAD a booked time is not an appointment
     *  she still has. `signing_loop.request_state` reports it as
     *  `cancelled` rather than `booked` — pinned on the Python side in
     *  test_cancellation_beats_booking_in_the_state_vocabulary. */
    const g = groupSignings([
      row({ id: 9, state: 'cancelled', live: false, booked_at: '2026-09-10T17:00:00Z' }),
    ]);
    expect(g.closed.map((r) => r.id)).toEqual([9]);
    expect(g.booked).toEqual([]);
    expect(g.arranging).toEqual([]);
  });

  it('puts a date on the row so the order can be checked', () => {
    expect(flat(SIGNINGS)).toContain('Booked for ${new Date(row.booked_at)');
    expect(flat(SIGNINGS)).toContain('Requested ${age} day');
  });
});

describe('FLOW1 item 4 → DASH1 — the age is read, and so is the verdict', () => {
  // DASH1 FINISHED WHAT ITEM 4 STARTED, and the pin moved with it.
  //
  // Item 4 stopped this screen RECONSTRUCTING a request's age from
  // `expires_at minus 21 days`, and pinned the local `ageInDays` that
  // replaced the arithmetic. DASH1 removed the local judgement too: the
  // dashboard needed the same "has this gone quiet?" answer, and a
  // threshold in Python beside one in TypeScript is how the partner
  // category list came to have four copies.
  //
  // So the assertions moved UP a level rather than being deleted: the
  // screen holds no age arithmetic AND no threshold, and reads both from
  // the payload.
  it('carries no copy of the server’s expiry constant', () => {
    expect(SIGNINGS_CODE).not.toMatch(/\b21\s*\*\s*86400/);
    expect(SIGNINGS_CODE).not.toContain('expires - 21');
  });

  it('holds no staleness threshold of its own', () => {
    // Both halves of the agenda: the component AND the module the
    // grouping moved into. Dropping the second would be a sweep that
    // stopped covering the place the logic went.
    for (const src of [SIGNINGS_CODE, SUMMARY_CODE]) {
      expect(src).not.toContain('STUCK_AFTER_DAYS');
      expect(src).not.toMatch(/>=\s*5\b/);
    }
  });

  it('reads the verdict and the age from the payload', () => {
    // CALLED: `isStuck` reports what the server said and forms no
    // opinion of its own, whatever `days_waiting` happens to be.
    expect(isStuck(row({ stale: true, days_waiting: 1 }))).toBe(true);
    expect(isStuck(row({ stale: false, days_waiting: 99 }))).toBe(false);
    expect(SIGNINGS_CODE).toContain('const age = row.days_waiting;');
    // And the number in the banner's sentence comes with the payload
    // rather than being typed into the sentence. The fetch is the merged
    // page's now — one lookup feeding both halves — and the agenda takes
    // it as a prop, so the pin follows it to the page.
    expect(SHARED_CODE).toContain('stale_after_days');
    expect(SIGNINGS_CODE).toContain('staleAfterDays ?? 5');
  });
});

describe('FLOW1 — a name is not a pronoun', () => {
  it('the signing modal does not assume the notary’s pronouns', () => {
    const MODAL = read('features', 'signing', 'RequestSigningModal.tsx');
    expect(flat(codeOnly(MODAL))).toContain('posts the times they are free');
    expect(flat(codeOnly(MODAL))).not.toContain('the times she is free');
  });
});
