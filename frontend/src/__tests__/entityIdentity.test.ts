/**
 * ENTITY1 — the legal counterparty is named, and the documents still
 * say they are drafts.
 *
 * The footer reads the environment. Terms §11 states the counterparty
 * rather than pointing at that footer. Privacy §4 names the processors
 * a code sweep found, not "a property-data provider" and "a payment
 * processor". The DRAFT banners stay: naming the entity is not counsel
 * review.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const TERMS = codeOnly(fs.readFileSync(path.join(APP, 'terms', 'page.tsx'), 'utf8'));
const PRIVACY = codeOnly(fs.readFileSync(path.join(APP, 'privacy', 'page.tsx'), 'utf8'));
const TERMS_RAW = fs.readFileSync(path.join(APP, 'terms', 'page.tsx'), 'utf8');
const PRIVACY_RAW = fs.readFileSync(path.join(APP, 'privacy', 'page.tsx'), 'utf8');
const VERCEL = JSON.parse(fs.readFileSync(
  path.join(ROOT, '..', 'vercel.json'), 'utf8')) as { env: Record<string, string> };

describe('Terms §11 states the counterparty', () => {
  it('names the corporation, the state, the address, and the contact', () => {
    expect(TERMS).toContain('DeedPro Corporation');
    expect(TERMS).toContain('Wyoming');
    expect(TERMS).toContain('440 Rte 66, Glendora, CA 91750');
    expect(TERMS).toContain('info@deedpro.io');
  });

  it('does not point at a footer that used to point nowhere', () => {
    expect(TERMS).not.toMatch(/pending — see the site footer/i);
    expect(TERMS).not.toMatch(/company identity and contact details pending/i);
  });
});

describe('Privacy names what now exists', () => {
  it('§7 states the contact instead of pointing at the footer', () => {
    expect(PRIVACY).toContain('DeedPro Corporation');
    expect(PRIVACY).toContain('Wyoming');
    expect(PRIVACY).toContain('440 Rte 66, Glendora, CA 91750');
    expect(PRIVACY).toContain('info@deedpro.io');
    expect(PRIVACY).not.toMatch(/contact details pending/i);
    expect(PRIVACY).not.toMatch(/see the site footer/i);
  });

  it('§4 names the processors the code actually calls', () => {
    for (const name of [
      'SiteX', 'Google Places', 'Stripe', 'SendGrid',
      'OpenAI', 'Amazon S3', 'Render', 'Vercel',
    ]) {
      expect(PRIVACY).toContain(name);
    }
    expect(PRIVACY).not.toContain('property-data providers');
    expect(PRIVACY).not.toContain('our payment processor');
  });
});

describe('the DRAFT banners stay', () => {
  it('both pages still say they are not counsel-reviewed', () => {
    for (const src of [TERMS_RAW, PRIVACY_RAW]) {
      expect(src).toContain('DRAFT');
      expect(src).toContain('counsel');
    }
  });
});

describe('the deploy config wires the same identity the footer reads', () => {
  it('sets the three required public vars and STRICT_PUBLIC_ENV', () => {
    expect(VERCEL.env.NEXT_PUBLIC_LEGAL_ENTITY).toBe('DeedPro Corporation');
    expect(VERCEL.env.NEXT_PUBLIC_CONTACT_ADDRESS).toBe('440 Rte 66, Glendora, CA 91750');
    expect(VERCEL.env.NEXT_PUBLIC_CONTACT_EMAIL).toBe('info@deedpro.io');
    expect(VERCEL.env.STRICT_PUBLIC_ENV).toBe('1');
  });

  it('the entity name in Terms is the same string the footer is wired to print', () => {
    /**
     * Two copies of one fact, accepted: the legal page hardcodes the
     * counterparty (a document that read its party from an environment
     * variable would be worse) and the footer reads env. This pin is
     * the comparison, not a third copy — if either side moves, this
     * fails. Address and email ride along because they are the same
     * split.
     */
    const entity = VERCEL.env.NEXT_PUBLIC_LEGAL_ENTITY;
    const address = VERCEL.env.NEXT_PUBLIC_CONTACT_ADDRESS;
    const email = VERCEL.env.NEXT_PUBLIC_CONTACT_EMAIL;
    expect(entity).toBeTruthy();
    expect(TERMS).toContain(entity);
    expect(TERMS).toContain(address);
    expect(TERMS).toContain(email);
  });
});
