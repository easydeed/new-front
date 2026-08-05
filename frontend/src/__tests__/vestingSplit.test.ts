/**
 * Doctrine A — the TypeScript half of the split, held to the same corpus.
 *
 * `backend/services/vesting_cases.json` is the authority. This suite reads
 * the very same file the Python suite reads, so a rule changed in one
 * language and not the other fails in the language that did not change.
 * That is the only failure mode that catches a one-sided edit, and a
 * one-sided edit is what "two implementations of one rule" always becomes.
 *
 * Three kinds of test, and the order is the argument:
 *
 *   1. THE CORPUS — what the split does, case by case.
 *   2. THE POSITION — whether a characterization can reach a fact position
 *      through the county-record mapping we actually ship. This is the
 *      question RED0 answered "yes" to; it is asked here of the real
 *      mapping function, not of a stand-in.
 *   3. THE MIRROR — the marker lists, character for character. Third,
 *      because it guards a spelling and the corpus guards the property.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  MARKERS,
  basisFor,
  ownerCandidates,
  splitVestedOwner,
} from '@/lib/vestingSplit';
import { mapSiteXResponse } from '@/lib/sitexProperty';
import { collectCandidateFields, propertyCandidatesRemaining } from '@/lib/provenance';
import { codeOnly } from '../test-support/sourceText';
import type { DeedBuilderState } from '@/types/builder';

interface Case {
  input: string;
  verbatim?: string;
  parties?: string | null;
  characterization?: string | null;
  mixed_content?: boolean;
  needs_review?: boolean;
  absent?: boolean;
  why: string;
}

const CORPUS_PATH = path.join(
  __dirname, '..', '..', '..', 'backend', 'services', 'vesting_cases.json');

const CASES: Case[] = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8')).cases;

const MARKER_RX = new RegExp(`\\b(?:${MARKERS.map((m) => `(?:${m})`).join('|')})\\b`, 'i');

// ── 1. The corpus ──────────────────────────────────────────────────────

describe('the shared corpus, in TypeScript', () => {
  it('is the same file the Python suite reads, and it is not empty', () => {
    expect(fs.existsSync(CORPUS_PATH)).toBe(true);
    expect(CASES.length).toBeGreaterThanOrEqual(12);
  });

  CASES.forEach((c) => {
    it(`${c.input.slice(0, 56) || '<empty>'} — ${c.why.slice(0, 60)}`, () => {
      const got = splitVestedOwner(c.input);

      if (c.absent) {
        expect(got).toBeNull();
        expect(ownerCandidates(c.input, 'prelim')).toBeNull();
        return;
      }

      expect(got).not.toBeNull();
      expect(got!.verbatim).toBe(c.verbatim);
      expect(got!.parties).toBe(c.parties);
      expect(got!.characterization).toBe(c.characterization);
      expect(got!.mixedContent).toBe(c.mixed_content);
      expect(got!.needsReview).toBe(c.needs_review);
    });
  });
});

// ── 2. The position ────────────────────────────────────────────────────

describe('no characterization ever reaches a fact position', () => {
  CASES.filter((c) => !c.absent).forEach((c) => {
    it(`county-record mapping — ${c.input.slice(0, 56)}`, () => {
      const property = mapSiteXResponse(
        { address: '1420 OCEAN AVE', apn: '4291-013-027', owner_name: c.input },
        '1420 OCEAN AVE',
      );

      // THE property. Not "the splitter split" — "nothing this mapping
      // puts in a fact position carries a legal characterization".
      expect(property.owner ?? '').not.toMatch(MARKER_RX);
      expect(property.provenance?.owner?.value ?? '').not.toMatch(MARKER_RX);

      // And the composite survived for audit, unchanged.
      expect(property.ownerSplit?.verbatim).toBe(c.verbatim);
    });
  });

  it('the parties, and only the parties, become the owner fact', () => {
    const property = mapSiteXResponse(
      { owner_name: 'JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS' },
      '',
    );
    expect(property.owner).toBe('JOHN A. DOE AND JANE B. DOE');
    expect(property.provenance?.owner).toEqual({
      value: 'JOHN A. DOE AND JANE B. DOE',
      source: 'sitex',
      status: 'candidate',
    });
    expect(property.ownerSplit?.mixedContent).toBe(true);
  });

  it('a bare name is left exactly alone — the common case is not disturbed', () => {
    const property = mapSiteXResponse({ owner_name: 'DOE JOHN A & DOE JANE B' }, '');
    expect(property.owner).toBe('DOE JOHN A & DOE JANE B');
    expect(property.ownerSplit?.mixedContent).toBe(false);
    expect(property.ownerSplit?.vestingProposal).toBeUndefined();
    expect(property.ownerSplit?.needsReview).toBeUndefined();
  });

  it('separate owner fields are joined without a relationship being inferred', () => {
    const property = mapSiteXResponse(
      { primary_owner: { full_name: 'John Doe' }, secondary_owner: { full_name: 'Jane Doe' } },
      '',
    );
    // Two people with the same surname. The old propertyPrefill read that
    // as a marriage and proposed community property with right of
    // survivorship — a legal conclusion drawn from a string comparison.
    expect(property.owner).toBe('JOHN DOE AND JANE DOE');
    expect(property.ownerSplit?.vestingProposal).toBeUndefined();
  });

  it('an unsplittable string offers NEITHER half and says so', () => {
    const property = mapSiteXResponse(
      {
        owner_name:
          'JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN, AS TENANTS IN COMMON',
      },
      '',
    );
    expect(property.owner).toBe('');
    expect(property.ownerSplit?.vestingProposal).toBeUndefined();
    expect(property.ownerSplit?.needsReview).toContain('yourself');
    expect(property.ownerSplit?.verbatim).toContain('MARY ROE');
  });
});

describe('the proposal is not, and cannot become, a confirmable field', () => {
  const withOwner = (ownerName: string): DeedBuilderState => ({
    deedType: 'grant-deed',
    property: mapSiteXResponse({ address: '1420 OCEAN AVE', owner_name: ownerName }, ''),
    grantor: '',
    grantee: '',
    vesting: '',
    dtt: null,
    requestedBy: '',
    returnTo: '',
  });

  it('status is "proposed", never "candidate"', () => {
    const p = ownerCandidates('MARIA GONZALEZ, A SINGLE WOMAN', 'sitex')!;
    expect(p.vestingProposal?.status).toBe('proposed');
    expect(p.vestingProposal?.status).not.toBe('candidate');
    expect(p.owner?.status).toBe('candidate');
  });

  it('the generation gate never asks the officer to confirm it', () => {
    // THE reason 'proposed' is a different word. collectCandidateFields
    // walks the material fields and offers each candidate for
    // confirmation; a legal characterization must never appear in that
    // list, because confirming it there would record her accepting a
    // transcription when what she accepted was a conclusion.
    const state = withOwner('JOHN DOE AND JANE DOE, HUSBAND AND WIFE AS JOINT TENANTS');
    for (const field of collectCandidateFields(state)) {
      expect(field.field.value).not.toMatch(MARKER_RX);
    }
    for (const key of propertyCandidatesRemaining(state.property)) {
      expect(String(state.property![key] ?? '')).not.toMatch(MARKER_RX);
    }
  });

  it('the characterization cannot reach the GRANTOR either', () => {
    // The grantor is the fact position that literally prints on the face
    // of the deed. It is prefilled from `property.owner` (InputPanel's
    // `suggestedName`), so the split protects it for free — but "for
    // free" is how a protection gets removed by someone who did not know
    // it was load-bearing.
    const property = mapSiteXResponse(
      { owner_name: 'JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS' },
      '',
    );
    const suggestedName = property.owner; // exactly what InputPanel passes
    expect(suggestedName).not.toMatch(MARKER_RX);

    const state: DeedBuilderState = {
      deedType: 'grant-deed', property, grantor: suggestedName!, grantee: '',
      vesting: '', dtt: null, requestedBy: '', returnTo: '',
    };
    for (const field of collectCandidateFields(state)) {
      expect(field.field.value).not.toMatch(MARKER_RX);
    }
  });

  it('an unsplittable owner blocks nothing — there is no empty field to confirm', () => {
    // U0: absence is not a candidate. We read something and could not
    // separate it, so we offer nothing; offering an EMPTY owner for
    // confirmation would be a gate on a value that does not exist.
    const state = withOwner(
      'JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN, AS TENANTS IN COMMON');
    expect(propertyCandidatesRemaining(state.property)).not.toContain('owner');
  });
});

describe('the basis names its claimant and its question', () => {
  it('who is claiming this differs by source', () => {
    expect(basisFor('sitex', 'A SINGLE MAN')).toContain('county record');
    expect(basisFor('prelim', 'A SINGLE MAN')).toContain('preliminary title report');
    expect(basisFor('sitex', 'X')).not.toBe(basisFor('prelim', 'X'));
  });

  it('and it says plainly that this is TODAY\'s vesting, not the deed\'s', () => {
    // The expensive mistake this sentence exists to prevent: carrying the
    // seller's vesting into the buyers' deed because both are called
    // "vesting" and both are spelled the same way.
    const basis = basisFor('sitex', 'HUSBAND AND WIFE AS JOINT TENANTS');
    expect(basis).toContain('CURRENT owner');
    expect(basis).toContain('your decision');
  });
});

// ── 3. The mirror ──────────────────────────────────────────────────────

describe('the two implementations are one rule', () => {
  const py = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'backend', 'services', 'vesting_split.py'),
    'utf8',
  );

  it('the marker lists match character for character', () => {
    const block = py.slice(py.indexOf('MARKERS: List[str] = ['), py.indexOf(']\n\n#'));
    const pyMarkers = [...block.matchAll(/r"([^"]*)"/g)].map((m) => m[1]);
    expect(pyMarkers).toEqual(MARKERS);
  });

  it('neither side keeps a private fixture list', () => {
    // A twin with its own cases would pass on strings the other never
    // sees, which is exactly the drift the corpus exists to stop.
    const src = codeOnly(fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'vestingSplit.ts'), 'utf8'));
    expect(src).not.toMatch(/HUSBAND AND WIFE AS JOINT TENANTS/);
    expect(py).toContain('vesting_cases.json');
  });

  it('the county-record path and the prelim path call the same module', () => {
    const sitex = codeOnly(fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'sitexProperty.ts'), 'utf8'));
    expect(sitex).toContain('ownerCandidates');
    const prelim = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'services', 'prelim_import.py'),
      'utf8');
    expect(prelim).toContain('vesting_split');
  });
});
