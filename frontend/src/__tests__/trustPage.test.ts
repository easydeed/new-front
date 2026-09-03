/**
 * ENGINE1 — the trust centre, and the properties that make it worth having.
 *
 * The page's value is entirely in what it refuses to claim. Every
 * assertion here guards a way that value could be lost while the page
 * still looked fine.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const RAW = read('app', 'trust', 'page.tsx');
const PAGE = codeOnly(RAW);

describe('ENGINE1 — the gaps lead, and they are named rather than narrated', () => {
  it('the absence section comes before the capability section', () => {
    /**
     * OWNER-RULED, and it is the whole inversion. The mockup closed with
     * "What we do not have yet" as a footnote. Putting the gaps first is
     * what makes this an inventory rather than a brochure with a
     * disclaimer, and a later edit that reorders the sections would undo
     * the ruling without touching a word of copy.
     */
    expect(PAGE.indexOf('What we do not have'))
      .toBeLessThan(PAGE.indexOf('What we do have'));
  });

  it('the headline no longer promises to answer everything', () => {
    // "Everything your security review will ask for, on one page" became
    // false by subtraction once availability, SLA, insurance and
    // certification came out. The thesis was replaced, not emptied.
    expect(PAGE).not.toContain('Everything your security review');
    expect(PAGE).toContain('what we will not pretend about');
  });

  it('no gap line explains itself into an apology', () => {
    /**
     * THE CONSTRAINT MOST LIKELY TO ERODE, because each individual
     * softening will look reasonable. "No SOC 2 report" is a fact; "No
     * SOC 2 report — we are a small team and it is expensive" asks the
     * reader to manage our feelings about something they came to check.
     *
     * ═══ THIS IS A TRIPWIRE, NOT THE MECHANISM (§14.25) ═══
     *
     * Probed, and the probe failed the first version. Appending "— we are
     * a small team and it is expensive" to a gap line produced 71
     * characters, under the 130 ceiling and containing none of the
     * forbidden words, and the test passed. Measured lengths explain why
     * a ceiling alone cannot work: the nine real gaps run 23–64
     * characters and an apology starts at about 70, so **there is no
     * threshold that separates them cleanly.**
     *
     * So the ceiling came down to 80 and the word list gained the markers
     * an excuse actually uses. Both together caught the probe. Neither is
     * sufficient, and saying so here is the point: **the mechanism is the
     * ruling and a reviewer reading the diff.** A future apology phrased
     * in words nobody listed, at 78 characters, walks past this test. It
     * is kept because a pointer's failure mode is a false alarm rather
     * than a silent wrong answer.
     *
     * The one long entry is the California sentence, which states a limit
     * and a consequence rather than an excuse — the model the ruling
     * named for the whole page.
     *
     * AND THE WORD CHECK IS SCOPED TO THE GAP TEXT, not the page. The
     * first version searched the whole file and tripped on "because" in
     * the page's own prose, which is honest writing about why the page is
     * shaped as it is. The constraint governs the GAP LINES; a pin
     * broader than its ruling fails on correct work, and a pin that fails
     * on correct work is one somebody deletes.
     */
    /* MEASURE THE GAP TEXT, NOT THE SOURCE LINE. The first version
       counted lines over 130 characters and got 4 instead of 1, because
       four gap lines carry a trailing `banned-claims: allow` comment and
       the comment is part of the line. The pin was measuring its own
       annotation — §14.1, one layer out from the property. */
    const block = RAW.slice(RAW.indexOf('const GAPS'), RAW.indexOf('];', RAW.indexOf('const GAPS')));
    const gaps = [...block.matchAll(/^\s*'((?:[^'\\]|\\.)*)',/gm)].map((m) => m[1]);
    expect(gaps.length).toBeGreaterThanOrEqual(9);

    const long = gaps.filter((g) => g.length > 80);
    expect(long.length).toBe(1);
    expect(long[0]).toContain('wrong vendor');

    for (const excuse of ['unfortunately', 'we hope to', 'soon', 'in progress',
                          'coming', 'currently working', 'plan to', 'we are a',
                          'because', 'due to', 'expensive', 'small team',
                          'once we', 'when we', 'for now']) {
      expect(gaps.join(' ').toLowerCase()).not.toContain(excuse);
    }
  });

  it('no gap is written in the future tense', () => {
    // "No SOC 2 report YET" is a roadmap promise wearing a denial's
    // clothes, and it is the single most likely edit to this page.
    const block = PAGE.slice(PAGE.indexOf('const GAPS'), PAGE.indexOf('];', PAGE.indexOf('const GAPS')));
    expect(block).not.toMatch(/\byet\b/i);
  });
});

describe('ENGINE1 — every "what we have" claim is checkable', () => {
  it('names the entity ENTITY1 established, not a placeholder', () => {
    expect(PAGE).toContain('DeedPro Corporation, a Wyoming corporation');
    expect(PAGE).toContain('440 Rte 66, Glendora, CA 91750');
  });

  it('states the retention the code actually enforces', () => {
    // The mockup said 30 days. Seven is the ruled figure.
    expect(PAGE).toContain('7 days');
    expect(PAGE).not.toMatch(/Drafts expire in 30/);
  });

  it('says test keys are on request, never self-serve', () => {
    /**
     * MEASURED BEFORE WRITTEN. `POST /api-key-requests` requires an
     * authenticated user and only RECORDS an inquiry ("ping the owner");
     * the status moves new → contacted → approved through an ADMIN-ONLY
     * PATCH. So a sandbox exists — `is_test`, the `dp_test_` prefix — and
     * issuance is not self-serve. "Self-serve sandbox" would be the
     * easiest false sentence on this page to write by accident.
     */
    expect(PAGE).toContain('not self-serve');
    expect(PAGE).toContain('dp_test_');
    expect(PAGE).not.toMatch(/self[\s-]serve sandbox/i);
  });

  it('names all eight subprocessors rather than a count', () => {
    // "[N]: [hosting], [database], [email]" was the mockup. A count is
    // not a disclosure — the reader wants to know whether their data
    // reaches a party they have their own opinion about.
    for (const p of ['SiteX', 'Google Places', 'Stripe', 'SendGrid',
                     'OpenAI', 'Amazon S3', 'Render', 'Vercel']) {
      expect(PAGE).toContain(p);
    }
  });

  it('discloses that the address reaches Google before it reaches us', () => {
    /* The one subprocessor fact a reader would not guess, and the one
       that made "deed data never leaves the United States" false. Stated
       on the page rather than left in the privacy policy's paragraph. */
    expect(PAGE).toMatch(/browser[\s\S]{0,80}Google|Google before it reaches us/);
  });

  it('states what public verification withholds', () => {
    expect(PAGE).toContain('Never the property address, the parcel number, or a party name');
  });
});

describe('ENGINE1 — the page is reachable and its exemptions are real', () => {
  it('is linked from somewhere, so it is not an orphan', () => {
    /* DARKSWEEP's shape: a page nothing links to is a page that does not
       exist from where the reader stands, and this one is written for a
       reader who arrives from a security review. */
    const home = codeOnly(read('app', 'page.tsx'));
    expect(home).toContain('href="/trust"');
  });

  it('carries no inert banned-claims exemption', () => {
    /**
     * The first draft put an allow on all nine gap lines. Stripping them
     * produced only SIX violations, so four excused nothing — the same
     * inert-exemption shape deleted from the bcrypt test hours earlier.
     * An allow that suppresses nothing tells the next reader a conflict
     * exists where none does.
     *
     * Pinned as a count so a future gap line cannot quietly arrive with a
     * decorative allow attached.
     */
    const allows = RAW.match(/banned-claims: allow/g) ?? [];
    expect(allows.length).toBe(5);
  });
});
