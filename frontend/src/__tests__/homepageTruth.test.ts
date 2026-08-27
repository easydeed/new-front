/**
 * HM2 — the truth pass, pinned.
 *
 * The audit's ironic finding: the homepage asserted exactly what weeks
 * of product doctrine made the software refuse to do ("AI instantly
 * drafts a compliant deed" — the sentence a title company's counsel
 * screenshots). These pins keep the copy on doctrine:
 *
 *   - no unverifiable claim (counts, certifications, percentages),
 *   - no sentence asserting legal compliance or legal judgment as a
 *     software outcome,
 *   - the differentiators (suggest → confirm → record, immutability,
 *     not-legal-advice) present near the fold.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

/**
 * HOME2 — ROUTED THROUGH `codeOnly`, and the reason is this file's own
 * subject matter.
 *
 * Every banned sentence here is a phrase somebody once put on the page,
 * so the natural way to record its removal is a comment saying what it
 * used to say — and a pin reading raw source then trips on the comment
 * explaining the very claim it forbids. That happened on the first run
 * of this ticket: two assertions failed against explanatory comments
 * while the rendered copy was correct.
 *
 * `codeOnly` blanks comments and docstrings and leaves string contents
 * alone, which is exactly the distinction this pin needs: it must see
 * what the page SAYS, not what its history says it used to say.
 */
const PAGE = codeOnly(fs.readFileSync(
  path.join(__dirname, '..', 'app', 'page.tsx'),
  'utf8'
));

describe('HM2 — unverifiable claims are gone', () => {
  const BANNED_CLAIMS = [
    '500+', // invented customer count
    '25,000+', // invented deed count
    '99.9%', // invented accuracy/uptime
    'SOC 2', // uncertified certification
    'AES-256', // unverifiable at-rest claim
    'ALTA', // unverifiable standards adherence
    '100% Compliant',
    '100%", color', // the stats-bar compliance value
  ];
  for (const claim of BANNED_CLAIMS) {
    it(`"${claim}" does not appear`, () => {
      expect(PAGE).not.toContain(claim);
    });
  }
});

describe('HM2 — no legal outcome asserted as a software outcome', () => {
  const BANNED_SENTENCES = [
    'instantly drafts a compliant deed',
    'SmartReview catches potential issues before recording',
    'Formatting compliant',
    'instantly validate',
    'e-record', // a capability we do not have
  ];
  for (const sentence of BANNED_SENTENCES) {
    it(`"${sentence}" does not appear`, () => {
      expect(PAGE).not.toContain(sentence);
    });
  }

  it('the doctrine sentences replaced them', () => {
    /**
     * HOME2 — two of these quoted copy this ticket deliberately changed,
     * and one of them would have forced a claim back onto the page.
     *
     * "county recorder formatting" asserted what a RECORDER ACCEPTS. We
     * measure against what recorders PUBLISH, which is a different and
     * checkable thing and is how it is hedged everywhere else in the
     * product. A pin demanding the unhedged phrase is a pin holding a
     * claim in place.
     *
     * "…before anything generates" went with item 7's authorship pass:
     * the software suggests, the officer decides, and the document
     * PRINTS. Same doctrine, and the sentence says it more exactly.
     *
     * What is pinned is the DOCTRINE, not the wording — the officer
     * confirming before the document prints, and formatting stated as
     * measurement rather than acceptance.
     */
    expect(PAGE).toMatch(/officer confirms every one before anything prints/);
    expect(PAGE).toContain('Two-stage checks');
    expect(PAGE).toMatch(/published requirements/);
    expect(PAGE).not.toMatch(/county recorder formatting rules/);
  });

  it('never describes the software as the author of a deed', () => {
    /**
     * API-CONFIRM built Model 2. The homepage may now say the API has a
     * human in the loop, because it does. The pin still forbids calling
     * the software the author.
     */
    for (const authorship of [
      'Instant deed generation', 'AI Generated', 'AI Generates',
      'generates your deed', 'the AI creates',
    ]) {
      expect(PAGE).not.toContain(authorship);
    }
    expect(PAGE).toContain('A human confirms the deed');
    expect(PAGE).toContain('Every field confirmed before printing');
    expect(PAGE).toContain('API access — same confirmation step');
  });
});

describe('HM2 — the differentiators are near the fold', () => {
  it('suggest → confirm → record is a visible section, not fine print', () => {
    expect(PAGE).toContain('The software suggests');
    expect(PAGE).toContain('Your officer decides');
    expect(PAGE).toContain('The system records');
  });

  it('immutability is stated with its mechanism', () => {
    expect(PAGE).toContain('hash-stamped');
    expect(PAGE).toContain('SHA-256');
  });

  it('the not-legal-advice line is present', () => {
    expect(PAGE).toContain('DeedPro is software, not a law firm');
    expect(PAGE).toContain('does not provide legal advice');
  });

  it('the stats bar states what is true and specific', () => {
    expect(PAGE).toContain('~9 clicks');
    expect(PAGE).toContain('Fields confirmed by your officer');
  });

  it('does not hard-code a legal entity in the footer', () => {
    /**
     * HOME2, then ENTITY1. The footer used to print "DeedPro ·
     * California, USA" — a brand and a geography, not an entity.
     * Identity comes from `publicIdentityLine()`, which reads the three
     * required public env vars. A string here would be a second opinion.
     */
    expect(PAGE).not.toContain('California, USA');
    expect(PAGE).not.toContain('DeedPro Corporation');
    expect(PAGE).toContain('publicIdentityLine()');
  });
});
