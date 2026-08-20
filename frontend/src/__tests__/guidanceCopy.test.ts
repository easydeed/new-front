/**
 * GUIDE2 — the static guidance copy, and the rules it must not break.
 *
 * Two surfaces, both copy rather than inference: where an unconfirmed
 * value came from, and what an R&T exemption section covers.
 *
 * The pins here are mostly PROHIBITIONS, because that is the shape of the
 * risk. Copy cannot fail loudly — a sentence that quietly recommends an
 * instrument, or asserts what a recorder will do, renders exactly as
 * neatly as one that does not.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { PROVENANCE, provenanceLabel } from '../lib/provenanceLabels';
import { EXEMPTION_SCOPE, exemptionScope } from '../lib/exemptionScope';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

describe('provenance — the badge says which source, and no other', () => {
  it('covers every member of FieldSource', () => {
    /**
     * The union is the authority. A source added there without an entry
     * here would fall through to a generic sentence, which is the defect
     * this file exists to fix — a plausible line standing in for one we
     * do not have.
     *
     * Read from the TYPE rather than from a list retyped here, so the
     * two cannot drift (§14.3: one declaration).
     */
    const types = codeOnly(read('types', 'builder.ts'));
    const decl = types.slice(types.indexOf('export type FieldSource'));
    const union = decl.slice(0, decl.indexOf(';'));
    const members = [...union.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

    expect(members.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(PROVENANCE).sort()).toEqual(members.sort());
  });

  it('never credits the county for a source that is not the county', () => {
    /**
     * THE DEFECT, PINNED.
     *
     * `ConfirmableField` showed "From county records — confirm" on every
     * unconfirmed field. `google` is a mapping service. `prelim` is a
     * title company's work product. `ai_suggested` is a value this
     * software proposed — displayed, before GUIDE2, as though the county
     * had provided it.
     *
     * Vendors are named as vendors: SiteX and TitlePoint aggregate
     * county data, and if the value is wrong it is wrong at the vendor,
     * which is who we actually heard it from.
     */
    for (const [source, label] of Object.entries(PROVENANCE)) {
      const text = `${label.badge} ${label.detail}`.toLowerCase();
      if (source !== 'sitex' && source !== 'titlepoint') {
        expect(text).not.toContain('county record');
      }
      // And never in the BADGE, which is the half read at a glance.
      expect(label.badge.toLowerCase()).not.toContain('county record');
    }
  });

  it('names an unrecorded source rather than inventing one', () => {
    // §14.8 — an absent label is a source we cannot describe, not a
    // neutral absence to paper over with a confident sentence.
    const fallback = provenanceLabel('nonsense' as never);
    expect(fallback.badge.toLowerCase()).toContain('unrecorded');
    expect(fallback.detail.toLowerCase()).not.toContain('county record');
  });

  it('is rendered from the field\'s own source, not a constant', () => {
    const field = codeOnly(read('components', 'builder', 'ConfirmableField.tsx'));
    expect(field).toContain('provenanceLabel(field.source)');
    expect(field).not.toContain('From county records');
  });
});

describe('exemption scope — explain yes, select no', () => {
  it('covers every option the dropdown offers', () => {
    /**
     * Read from the SECTION's own list. A dropdown option added without
     * scope copy fails here rather than shipping a silent blank — and a
     * silent blank on the manual path is the exact gap GUIDE2 found.
     */
    const src = codeOnly(read('components', 'builder', 'sections', 'TransferTaxSection.tsx'));
    const block = src.slice(src.indexOf('const EXEMPTION_REASONS'));
    const list = block.slice(0, block.indexOf(']'));
    const values = [...list.matchAll(/value:\s*"([^"]+)"/g)].map((m) => m[1]);

    expect(values.length).toBeGreaterThanOrEqual(8);
    // Collected rather than asserted one at a time: a failure should name
    // every option missing copy, not stop at the first.
    const missing = values.filter((v) => !exemptionScope(v));
    expect(missing).toEqual([]);
  });

  it('states what the section covers and never what she should do', () => {
    /**
     * DOCTRINE B, IN COPY. The forbidden half is not a tone — it is a
     * sentence that decides for her. These phrasings are how a scope
     * note turns into a recommendation without anybody intending it.
     */
    const forbidden = [
      'you should', 'we recommend', 'the right choice', 'the best',
      'is appropriate', 'you want', 'i\'d go with', 'use this if you',
    ];
    const offenders: string[] = [];
    for (const [code, scope] of Object.entries(EXEMPTION_SCOPE)) {
      const text = `${scope.covers} ${scope.limit ?? ''}`.toLowerCase();
      for (const phrase of forbidden) {
        if (text.includes(phrase)) offenders.push(`${code}: "${phrase}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never asserts what a recorder will accept', () => {
    /**
     * The failure mode GUIDE0 named, and the one copy commits as easily
     * as a model: we do not know what any particular recorder will do,
     * and a sentence saying otherwise is unbackable at the moment it
     * matters most.
     */
    const claims = ['will be accepted', 'the recorder will', 'guaranteed',
                    'always exempt', 'will not be taxed', 'no tax is due'];
    const all = Object.values(EXEMPTION_SCOPE)
      .map((s) => `${s.covers} ${s.limit ?? ''}`).join(' ').toLowerCase();
    for (const c of claims) expect(all).not.toContain(c);
  });

  it('reaches the manual path, not only the proposal', () => {
    // The officer deciding unaided is the one with no suggestion to read.
    const src = codeOnly(read('components', 'builder', 'sections', 'TransferTaxSection.tsx'));
    expect(src).toContain('exemptionScope(value.exemptReason)');
    expect(src).toContain('exemptionScope(suggestion.codeSection)');
  });

  it('leaves the choice, and the basis, with her', () => {
    const src = read('components', 'builder', 'sections', 'TransferTaxSection.tsx');
    expect(src).toContain('the basis is yours');
  });
});

describe('GUIDE2 — this is copy, and stays copy', () => {
  it('neither module reaches the network', () => {
    /**
     * The whole cost and drift argument depends on this. A `fetch` added
     * to either file turns a fixed, reviewable, free explanation into an
     * inference with a bill and a failure mode — and it would look like
     * an improvement in review.
     */
    for (const f of ['provenanceLabels.ts', 'exemptionScope.ts']) {
      const src = codeOnly(read('lib', f));
      expect(src).not.toMatch(/\bfetch\s*\(|apiFetch|axios|XMLHttpRequest/);
      expect(src).not.toContain('/api/');
    }
  });
});
