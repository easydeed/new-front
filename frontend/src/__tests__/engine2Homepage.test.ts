/**
 * ENGINE2 — the homepage's positive structure, pinned.
 *
 * ENGINE1 pinned what the page must NOT say. This pins what it must SAY,
 * which is the half that was never ruled: the two-door fork, the 422 as
 * the platform door's proof, the confirmation step led with, and the
 * app/API distinction stated rather than blurred.
 *
 * ═══ WHY A SEPARATE FILE FROM `homepageTruth` ═══
 *
 * That file guards against claims arriving. This one guards against
 * STRUCTURE LEAVING — and the two fail in opposite directions. A page
 * can pass every honesty pin by saying almost nothing, which is close to
 * what the pre-ENGINE2 homepage did for an integrator: it was accurate
 * and it told a platform engineer they were not the customer.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { API_DEED_TYPES } from '../lib/apiDocs';

const PAGE_PATH = path.join(__dirname, '..', 'app', 'page.tsx');
const RAW = fs.readFileSync(PAGE_PATH, 'utf8');

/** Comments blanked: a rule must be in the page, never in a note about
 *  the page. Every assertion below reads this unless it is ABOUT prose. */
const PAGE = codeOnly(RAW);

/**
 * WHAT THE PAGE SAYS, as opposed to how the source spells it.
 *
 * Written after two pins in this file failed against a page that says
 * exactly what they demanded. `For escrow & title` is authored
 * `For escrow &amp; title`; the 422's sentence is split by an `<em>`
 * around one word. Both are correct copy and both defeat a substring
 * match on source — the §14.1 shape (match the PROPERTY, not the
 * spelling) arriving in the test written to guard the rebuild.
 *
 * The normalisation is deliberately the reader's view and nothing more:
 * decode the entities JSX requires, drop tags, collapse whitespace. It
 * is applied ONLY to prose assertions; structural claims (a component is
 * derived, a literal is absent) keep reading `PAGE`, because there the
 * spelling IS the property.
 */
const SPOKEN = codeOnly(RAW)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&mdash;/g, '—')
  .replace(/&quot;/g, '"')
  .replace(/&sect;/g, '§')
  .replace(/\s+/g, ' ');

describe('ENGINE2 — the two-door fork', () => {
  it('both doors are present and each names its reader', () => {
    expect(SPOKEN).toContain('For platforms');
    expect(SPOKEN).toContain('For escrow & title');
    expect(SPOKEN).toContain("I'm building a product that prepares deeds");
    expect(SPOKEN).toContain('I prepare deeds for California transactions');
  });

  it('neither door is subordinate — both carry their own primary CTA', () => {
    /**
     * "Neither buried, neither subordinate" is the ruling, and the
     * checkable form of it is that each door has its own destination.
     * A fork where one side is a headline and the other is a link is
     * not a fork.
     *
     * SCOPED TO EACH DOOR, and the first draft was not. It asserted the
     * CTA strings against the WHOLE PAGE, so deleting the platform
     * door's button left it green — the closing fork carries the same
     * two labels further down. A mutation probe is what found that:
     * five of six probes fired and this one did not. §14.29 — a gate's
     * coverage is a measurement, not an inference from the fact that
     * it exists.
     */
    const platformDoor = PAGE.slice(PAGE.indexOf('For platforms'), PAGE.indexOf('For escrow'));
    const escrowDoor = PAGE.slice(PAGE.indexOf('For escrow'), PAGE.indexOf('aria-label="Statistics"'));
    expect(platformDoor).toContain('/api-key-request');
    expect(platformDoor).toContain('Get API access');
    expect(escrowDoor).toContain('/register');
    expect(escrowDoor).toContain('Use the app free');
  });

  it('the escrow story survived the repositioning', () => {
    /**
     * The shift is that the API is the business, NOT that the officer
     * stops being a customer. A repositioning that deleted the escrow
     * door would be a different error with the same cause.
     */
    expect(PAGE).toContain('PCOR and BOE');
    expect(PAGE).toContain('guided wizard');
  });
});

describe('ENGINE2 — the 422 is the platform door\'s proof', () => {
  it('the sample is on the homepage, not only in the docs', () => {
    /**
     * It demonstrates the doctrine instead of asserting it, and it is
     * the build-vs-buy argument in one exchange. It lived only on
     * /developers, which an evaluator who bounces never reaches.
     */
    expect(SPOKEN).toContain('422');
    expect(SPOKEN).toContain('VALIDATION_ERROR');
    expect(SPOKEN).toContain('is the vesting decision');
  });

  it('the sample DERIVES its instrument from the catalog, never a literal', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR, and it is §14.3's shape: the page
     * must not carry its own opinion about which instrument fixes its
     * vesting. `FIXED_VESTING_SAMPLE` reads `API_DEED_TYPES` — the
     * mirror of `services/api_catalog.py` that the API validates
     * against — so if the catalog ever stops fixing this instrument's
     * vesting, the sample stops claiming it does.
     *
     * A hard-coded "grant_deed_jt" would keep rendering a 422 sample
     * for an instrument that had started accepting the field, and
     * nothing would fail.
     */
    expect(PAGE).toContain("API_DEED_TYPES.find((t) => t.vesting === 'fixed-by-instrument')");
    expect(PAGE).toContain('{FIXED_VESTING_SAMPLE.slug}');
    expect(PAGE).not.toContain('"grant_deed_jt"');
  });

  it('the instrument table renders FROM the catalog rather than transcribing it', () => {
    expect(PAGE).toContain('API_DEED_TYPES.map(');
    for (const slug of ['grant_deed_cp_ros', 'grant_deed_corp', 'grant_deed_partnership']) {
      expect(PAGE).not.toContain(`>${slug}<`);
    }
  });
});

describe('ENGINE2 — the confirmation step is led with', () => {
  it('it is a section of its own, not a feature bullet', () => {
    expect(PAGE).toContain('A human confirms the deed');
    expect(PAGE).toContain('id="confirmation"');
  });

  it('the three-stage sequence is present', () => {
    expect(PAGE).toContain('The facts arrive as candidates');
    expect(PAGE).toContain('A named human confirms');
    expect(PAGE).toContain('The PDF comes into existence');
  });

  it('the stage vocabulary is the SHIPPED contract, not the mockup\'s', () => {
    /**
     * The mockup wrote `awaiting_confirmation` and `confirmed`. The API
     * serves `pending_confirmation` and `completed` (services/
     * api_confirm.py). Copying the mockup would DOCUMENT A CONTRACT WE
     * DO NOT SERVE — the split-brain ENGINE1 reversed, arriving through
     * a picture instead of through prose.
     */
    expect(PAGE).toContain('pending_confirmation');
    expect(PAGE).toContain('"completed"');
    expect(PAGE).not.toContain('awaiting_confirmation');
    expect(PAGE).not.toContain('status: "confirmed"');
  });

  it('the approver fields are the shipped ones and licence is not among them', () => {
    /**
     * The mockup's stage-02 card read `reviewer.name · reviewer.license`
     * — wrong twice. The object is `approver`, and ENGINE1 ruled the
     * licence OPTIONAL and named it `license_claimed` so nobody reads it
     * as a check we ran. A homepage listing it beside the name as a
     * required field would undo that naming in the one place a buyer
     * forms the expectation.
     */
    expect(PAGE).toContain('approver.name');
    expect(PAGE).toContain('approver.role');
    expect(PAGE).not.toContain('reviewer.license');
    expect(PAGE).not.toContain('reviewer.name');
  });

  it('the licence is described as recorded-not-verified, in prose', () => {
    expect(SPOKEN).toContain('never verified by DeedPro');
    expect(SPOKEN).toContain('license_claimed');
  });
});

describe('ENGINE2 — one engine, two ways in, stated honestly', () => {
  it('the app/API confirmation difference is NAMED rather than blurred', () => {
    /**
     * ENGINE1: the API's confirmation is a stored RECORD since #263;
     * the app's is the officer's SESSION. "No path, app or API, without
     * a named person" is the page's central claim and therefore cannot
     * be the imprecise thing on it — so the page states the difference
     * instead of letting one sentence cover both.
     */
    expect(SPOKEN).toContain("the officer's own authenticated session");
    expect(SPOKEN).toContain('a stored record naming the person');
  });

  it('the held families are named from the registry, not typed', () => {
    expect(PAGE).toContain('HELD_FAMILIES.map(');
  });

  it('per-key export is not claimed — it is held by ruling', () => {
    /**
     * The mockup offered "exportable per key". ENGINE1 cut it and it
     * stays cut. Retrieval PER DEED ships and is claimed; the export
     * does not exist.
     */
    expect(PAGE).toContain('retrievable per deed');
    expect(PAGE).not.toContain('exportable per key');
    expect(PAGE).not.toContain('per key');
  });
});

describe('ENGINE2 — /trust and /developers hang off the platform door', () => {
  it('both are linked above the footer', () => {
    /**
     * Ruling 6. A link in the footer is one an evaluator reaches after
     * they have already decided. The check is positional: the platform
     * door's links must appear BEFORE the footer element.
     */
    const footerAt = PAGE.indexOf('<footer');
    expect(footerAt).toBeGreaterThan(-1);
    const aboveFooter = PAGE.slice(0, footerAt);
    expect(aboveFooter).toContain('/trust');
    expect(aboveFooter).toContain('/developers');
  });
});

describe('ENGINE2 — the CUT list still governs the rebuilt page', () => {
  /**
   * The 13 ENGINE1 gate rules run over this file in CI via
   * `check_banned_claims.py`. These restate the ones the MOCKUP
   * specifically carried, so a future paste from the same artifact
   * fails here with the reason attached rather than only in a gate
   * whose message is generic.
   */
  const FROM_THE_MOCKUP = [
    'status.deedpro.io',
    'api.deedpro.io',
    'Priced per confirmed deed',
    'DPA + SLA',
    'uptime',
    'status page',
    'SOC 2',
    'P1 within',
    'custom SLA',
  ];
  for (const claim of FROM_THE_MOCKUP) {
    it(`"${claim}" did not come back with the structure`, () => {
      expect(PAGE).not.toContain(claim);
    });
  }

  it('the emptied meta slots carry measured facts rather than being removed', () => {
    /**
     * OWNER-FLAGGED: "those slots need honest replacements rather than
     * removal, or the strip reads as truncated." An empty cell in a
     * six-cell strip reads as a layout fault, which is §14.12's rule
     * (a removed claim must read as an answer) applied to a grid.
     *
     * What replaced them is measured: the boundary refusal, and the
     * subprocessor count that /trust already publishes individually.
     */
    expect(PAGE).toContain('Wrong instrument fails at the boundary');
    expect(PAGE).toContain('Sandbox keys on request');
    expect(PAGE).toContain('8 subprocessors');
  });

  it('no per-deed rate is printed, and the absence is stated as an answer', () => {
    expect(SPOKEN).toContain('no published per-deed rate yet');
    expect(PAGE).not.toContain('/ confirmed deed');
  });
});

describe('ENGINE2 — every number names a measured source', () => {
  it('the instrument counts are derived, never literals', () => {
    /**
     * The governing constraint, and the one most easily lost in a
     * rebuild: a rewrite retypes copy, and a retyped count is a literal
     * that cannot outdate loudly. §14.11's rule — a move is a rewrite
     * unless the bytes are compared — applied to numbers.
     */
    expect(PAGE).toContain('INSTRUMENT_COUNT');
    expect(PAGE).toContain('API_DEED_TYPES.length');
    expect(PAGE).toContain('priceLabel(');

    /* The two counts as they stand today. If either appears as a bare
       numeral in the copy, somebody typed it. */
    const rendered = PAGE.replace(/API_DEED_TYPES|INSTRUMENT_COUNT/g, '');
    expect(rendered).not.toMatch(/\b21 instruments\b/);
    expect(rendered).not.toMatch(/\b9 instruments\b/);
    expect(rendered).not.toMatch(/\b9 deed-family\b/);
  });

  it('the catalog still holds the counts the page is built on', () => {
    /** A floor under the derivation: if the catalog emptied, every
     *  derived number would render "0" and read as a formatting bug
     *  rather than as a claim. */
    expect(API_DEED_TYPES.length).toBeGreaterThan(0);
    expect(API_DEED_TYPES.some((t) => t.vesting === 'fixed-by-instrument')).toBe(true);
  });
});
