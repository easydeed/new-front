/**
 * CAT1 — the catalog's front door, pinned.
 *
 * Three registry-driven layers: search (situation words), grouped browse
 * (desk taxonomy), recents. Constraint pinned throughout: ORGANIZATION,
 * never recommendation — no wizard, no ranking-by-guess; choosing the
 * instrument is the officer's legal decision (Flag-3 doctrine).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { FORM_REGISTRY } from '../lib/formRegistry';
import { groupedForms, matchesForm, searchForms } from '../lib/formSearch';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const PICKER = readSource('app', 'deed-builder', 'page.tsx');

describe('CAT1 — search translates situations into instruments', () => {
  it('"death" surfaces all five death affidavits', () => {
    const slugs = searchForms('death').map((f) => f.slug);
    for (const s of ['affidavit-death-jt', 'affidavit-death-cp-spouse', 'affidavit-death-trustee',
                     'affidavit-death-jt-dp', 'affidavit-death-cp-dp']) {
      expect(slugs).toContain(s);
    }
  });

  it('"corporation" and "llc" surface the entity deed', () => {
    expect(searchForms('corporation').map((f) => f.slug)).toContain('grant-deed-corp');
    expect(searchForms('llc').map((f) => f.slug)).toContain('grant-deed-corp');
  });

  it('"trust" surfaces the trust instruments', () => {
    const slugs = searchForms('trust').map((f) => f.slug);
    for (const s of ['trust-certification', 'trustee-substitution', 'affidavit-death-trustee']) {
      expect(slugs).toContain(s);
    }
  });

  it('"homestead" surfaces the homestead family', () => {
    const slugs = searchForms('homestead').map((f) => f.slug);
    for (const s of ['homestead-declaration', 'homestead-declaration-spouses', 'homestead-abandonment']) {
      expect(slugs).toContain(s);
    }
  });

  it('prefix tokens match ("corp" → corporation) but arbitrary fuzz does not', () => {
    expect(searchForms('corp').map((f) => f.slug)).toContain('grant-deed-corp');
    // Character-subsequence fuzz is deliberately absent: a near-miss on a
    // legal instrument must read as a miss.
    expect(searchForms('crprtn')).toHaveLength(0);
  });

  it('empty query matches everything; results keep registry order (no ranking)', () => {
    const all = searchForms('');
    expect(all.map((f) => f.slug)).toEqual(Object.keys(FORM_REGISTRY));
  });

  it('multi-word queries require every token', () => {
    const slugs = searchForms('death partner').map((f) => f.slug);
    expect(slugs).toContain('affidavit-death-jt-dp');
    expect(slugs).not.toContain('grant-deed');
  });
});

describe('CAT1 — grouped browse covers the whole catalog', () => {
  it('every type appears in exactly one group; groups are desk taxonomy', () => {
    const groups = groupedForms();
    const seen = groups.flatMap((g) => g.forms.map((f) => f.slug));
    expect(seen.sort()).toEqual(Object.keys(FORM_REGISTRY).sort());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('all 21 types remain reachable through search with their own label', () => {
    for (const f of Object.values(FORM_REGISTRY)) {
      expect(matchesForm(f, f.label)).toBe(true);
    }
  });
});

describe('CAT1 — the picker organizes; the officer chooses', () => {
  it('the picker carries the Flag-3 doctrine comment and no wizard logic', () => {
    expect(PICKER).toMatch(/officer'?s legal decision/i);
    expect(PICKER).toContain('Flag-3');
    // No recommendation machinery: nothing scores, ranks, or auto-picks.
    for (const smell of ['recommend', 'suggest', 'bestMatch', 'autoSelect', 'score(']) {
      expect(PICKER.toLowerCase()).not.toContain(smell.toLowerCase());
    }
  });

  it('Enter selects the visible top hit, not a hidden guess', () => {
    expect(PICKER).toContain("e.key === 'Enter'");
    expect(PICKER).toContain('results[0].slug');
  });

  it('recents come from the existing deeds list, silently', () => {
    expect(PICKER).toContain("apiFetch('/deeds'");
    expect(PICKER).toContain('silent: true');
    expect(PICKER).toContain('Recently used');
  });
});
