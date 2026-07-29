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

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'page.tsx'),
  'utf8'
);

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
    expect(PAGE).toContain('your officer confirms every field before anything generates');
    expect(PAGE).toContain('Two-stage checks');
    expect(PAGE).toContain('county recorder formatting');
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
});
