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

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

const SIGNINGS = read('app', 'signings', 'page.tsx');
const SHARED = read('app', 'shared-deeds', 'page.tsx');
const SIGNINGS_CODE = codeOnly(SIGNINGS);
const SHARED_CODE = codeOnly(SHARED);

describe('FLOW1 item 3 — the two trackers know about each other', () => {
  it('links in both directions', () => {
    expect(SIGNINGS_CODE).toContain("router.push('/shared-deeds')");
    expect(SHARED_CODE).toContain('router.push(`/signings?focus=${signing.id}`)');
  });

  it('Shared Deeds shows both kinds, filterable, both by default', () => {
    expect(SHARED_CODE).toContain('TrackerFilter');
    expect(SHARED_CODE).toContain('useState<TrackerFilter>("all")');
    expect(SHARED_CODE).toContain('filter !== "signings" && sharedDeeds.map');
    expect(SHARED_CODE).toContain('filter !== "reviews" && signings.map');
  });

  it('the subtitle no longer commits the page to reviewer semantics', () => {
    // Half of what lands here is a signing request, and a notary is not
    // being asked to approve anything — she is being asked when she is
    // free.
    expect(flat(SHARED)).not.toContain('Track deeds shared for approval');
    expect(flat(SHARED)).toContain('reviews you asked for and signings you arranged');
  });

  it('a signing row does not borrow a review’s vocabulary', () => {
    // A signing has no "viewed", no approve/reject and no reviewer. The
    // cells it cannot fill say so.
    const rows = SHARED_CODE.slice(SHARED_CODE.indexOf('signings.map'));
    expect(rows).not.toContain('getStatusBadge(signing');
    expect(rows).not.toContain('signing.viewed_at');
    expect(rows).not.toContain('signing.response_date');
    expect(rows).toContain('{UNKNOWN}');
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

  it('the row expands onto the signing itself', () => {
    expect(SIGNINGS_CODE).toContain('aria-expanded={open}');
    expect(flat(SIGNINGS_CODE)).toContain('apiFetch(`/signing-requests/v2/${requestId}`');
  });

  it('is linkable, so a notification can point at one signing', () => {
    expect(SIGNINGS_CODE).toContain("params?.get('focus')");
  });

  it('a detail that fails to load says so rather than looking empty', () => {
    // §4: an empty panel would read as "this signing has no
    // participants", which is a claim.
    expect(SIGNINGS_CODE).toContain('Could not load this signing');
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
    expect(flat(SIGNINGS_CODE)).toContain(
      "(a, b) => (a.booked_at || '').localeCompare(b.booked_at || '')");
    expect(flat(SIGNINGS_CODE)).toContain(
      "(a, b) => (a.created_at || '').localeCompare(b.created_at || '')");
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
    expect(SIGNINGS_CODE).not.toContain('STUCK_AFTER_DAYS');
    expect(SIGNINGS_CODE).not.toMatch(/>=\s*5\b/);
  });

  it('reads the verdict and the age from the payload', () => {
    expect(SIGNINGS_CODE).toContain('return r.stale;');
    expect(SIGNINGS_CODE).toContain('const age = row.days_waiting;');
    // And the number in the banner's sentence comes with the payload
    // rather than being typed into the sentence.
    expect(SIGNINGS_CODE).toContain('stale_after_days');
  });
});

describe('FLOW1 — a name is not a pronoun', () => {
  it('the signing modal does not assume the notary’s pronouns', () => {
    const MODAL = read('features', 'signing', 'RequestSigningModal.tsx');
    expect(flat(codeOnly(MODAL))).toContain('posts the times they are free');
    expect(flat(codeOnly(MODAL))).not.toContain('the times she is free');
  });
});
