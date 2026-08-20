/**
 * U3 — per-deed tax (batch of smalls), pinned.
 *
 * Rows identify deeds (label + grantee + doc id + time); property lookup is
 * deterministic (suggestion click always fetches); autocomplete labels say
 * "City, CA" without the county mash; explicit confirms advance the
 * accordion; grantee input uppercases; downloads acknowledge themselves;
 * the builder names its way home; no chat-style promise without a chat.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { deedTypeLabel, DEED_LABELS } from '../lib/deedTypes';
import { formatSuggestionSecondary } from '../lib/addressLabels';
import { codeOnly } from '../test-support/sourceText';


function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

describe('U3 — deed types display as names, not slugs', () => {
  it('maps every known slug', () => {
    expect(deedTypeLabel('grant-deed')).toBe('Grant Deed');
    expect(deedTypeLabel('quitclaim-deed')).toBe('Quitclaim Deed');
    expect(deedTypeLabel('interspousal-transfer')).toBe('Interspousal Transfer Deed');
    expect(deedTypeLabel('warranty-deed')).toBe('Warranty Deed');
    expect(deedTypeLabel('tax-deed')).toBe('Tax Deed');
  });

  it('unknown slugs title-case instead of leaking raw', () => {
    expect(deedTypeLabel('trust-transfer-deed')).toBe('Trust Transfer Deed');
    expect(deedTypeLabel(undefined)).toBe('Deed');
  });

  it('the builder header and Past Deeds read from the SAME map', () => {
    const builder = codeOnly(readSource('features', 'builder', 'DeedBuilder.tsx'));
    const pastDeeds = codeOnly(readSource('app', 'past-deeds', 'page.tsx'));
    expect(builder).toContain("from '@/lib/deedTypes'");
    expect(pastDeeds).toContain('deedTypeLabel(deed.deed_type)');
    // The old raw-slug cell is gone.
    expect(pastDeeds).not.toContain('>{deed.deed_type}<');
    expect(Object.keys(DEED_LABELS).length).toBeGreaterThanOrEqual(5);
  });

  it('Past Deeds rows carry grantee and doc id', () => {
    const pastDeeds = codeOnly(readSource('app', 'past-deeds', 'page.tsx'));
    expect(pastDeeds).toContain('deed.grantee_name');
    // X2.7 promoted the doc id from an under-address line to its own
    // column. DEEDDETAIL made it a link to the deed page, so the id is
    // no longer the cell's only child — the rule (its own column) is
    // unchanged and the pin now says that rather than describing markup.
    // Its own <td>, and that cell links to the deed. Asserted as two
    // facts rather than as one exact string of markup, because the
    // previous spelling (`>#{deed.id}</td>`) broke on wrapping the id in
    // a link — correct code failing a pin that described a layout.
    const cell = pastDeeds.slice(0, pastDeeds.indexOf('#{deed.id}'));
    expect(cell.lastIndexOf('<td')).toBeGreaterThan(cell.lastIndexOf('</td>'));
    expect(cell.lastIndexOf('<Link')).toBeGreaterThan(cell.lastIndexOf('<td'));
    expect(pastDeeds).toContain('href={`/deeds/${deed.id}`}');
  });
});

describe('U3 — autocomplete secondary labels: "City, CA", no county mash', () => {
  it('drops county and country segments', () => {
    expect(formatSuggestionSecondary('Santa Monica, Los Angeles County, CA, USA')).toBe(
      'Santa Monica, CA'
    );
    expect(formatSuggestionSecondary('Los Angeles, CA, USA')).toBe('Los Angeles, CA');
  });

  it('handles empty input', () => {
    expect(formatSuggestionSecondary(undefined)).toBe('');
    expect(formatSuggestionSecondary('')).toBe('');
  });

  it('the dropdown renders through the formatter', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'PropertySection.tsx')
    );
    expect(src).toContain('formatSuggestionSecondary(prediction.structured_formatting.secondary_text)');
  });
});

describe('U3 — deterministic lookup: suggestion click always fetches', () => {
  it('handleSelectAddress ends by fetching with the parsed address it just built', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'PropertySection.tsx')
    );
    expect(src).toContain('fetchPropertyData(parsed)');
  });
});

describe('U3 — explicit confirm advances the accordion', () => {
  it('GrantorSection advances on confirm and edit-save, never on keystrokes', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'GrantorSection.tsx')
    );
    expect((src.match(/onComplete\?\.\(\)/g) || []).length).toBe(2);
    // The plain typing input path must NOT advance.
    expect(src).toMatch(/onChange=\{\(e\) => handleEdit\(e\.target\.value\)\}/);
  });

  it('InputPanel wires grantor completion to the grantee section', () => {
    const src = codeOnly(readSource('components', 'builder', 'InputPanel.tsx'));
    expect(src).toContain("onComplete={() => onSectionChange('grantee')}");
  });
});

describe('U3 — grantee input auto-uppercases (already true; pinned so it stays)', () => {
  it('the input maps its value through toUpperCase', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'GranteeSection.tsx')
    );
    expect(src).toContain('onChange(e.target.value.toUpperCase())');
  });
});

describe('U3 — downloads acknowledge themselves', () => {
  it('Past Deeds tracks the in-flight download and toasts the outcome', () => {
    const src = codeOnly(readSource('app', 'past-deeds', 'page.tsx'));
    expect(src).toContain('setDownloadingId(deed.id)');
    expect(src).toContain('PDF downloaded');
    // Failure surfaces the endpoint's real reason, not a shrug.
    expect(src).toContain('err.detail');
  });
});

describe('U3 — the builder names its way home; no dead affordances', () => {
  it('the header link says Dashboard and the handler-less Help button is gone', () => {
    const src = codeOnly(readSource('components', 'builder', 'BuilderHeader.tsx'));
    expect(src).toContain('Dashboard');
    expect(src).not.toContain('HelpCircle');
  });

  it('no surface promises a chat that does not exist', () => {
    /**
     * §16 — U3's RULING, WIDENED RATHER THAN RETIRED.
     *
     * It was pinned on `AIGreeting.tsx`, which GUIDE1 deleted: the
     * component had no render site and only its `getTimeGreeting` helper
     * was live (now `lib/greeting.ts`). Deleting the file satisfies the
     * old assertion trivially, which is the shape §16 exists to catch.
     *
     * The ruling matters MORE now, not less. GUIDE0 established that
     * `/api/ai/chat` has had no reachable caller since 2026-04-28, so a
     * surface offering to answer questions would be a dead affordance
     * pointing at a dark endpoint — U3's defect with a longer drop.
     *
     * So the pin moves from one file to the two surfaces an officer
     * actually uses.
     */
    for (const src of [
      codeOnly(readSource('app', 'dashboard', 'page.tsx')),
      codeOnly(readSource('features', 'builder', 'DeedBuilder.tsx')),
      codeOnly(readSource('components', 'builder', 'BuilderHeader.tsx')),
    ]) {
      expect(src).not.toContain('How can I help');
      expect(src).not.toMatch(/Ask (me|the assistant)/i);
    }
  });

  it('nothing user-visible claims to be AI (GUIDE1)', () => {
    /**
     * The banned-claims family, arriving in a UI LABEL rather than in
     * marketing prose — which is the harder place to see it, because
     * nobody reviews a component name for truth.
     *
     * What shipped as "AI Assist" is hand-written static copy: no
     * request, no model, nothing that can drift. Owner-ruled 2026-08-20:
     * call it what it is. The label returns honestly if a model ever
     * backs the surface.
     */
    const toggle = codeOnly(readSource('components', 'builder', 'GuidanceToggle.tsx'));
    expect(toggle).toContain('Field help');
    expect(toggle).not.toMatch(/\bAI\b/);
    // And the copy it gates is still copy — no call, no inference.
    const guidance = codeOnly(readSource('components', 'builder', 'FieldGuidance.tsx'));
    expect(guidance).not.toContain('fetch(');
    expect(guidance).not.toContain('aiAssistant');
  });
});
