/**
 * D3 — click-to-fix preview, pinned.
 *
 * The preview's highlighted data regions (D1) become a workbench: click
 * any region and the corresponding builder section opens; where a plain
 * input exists it also receives focus. One gesture covers fix (real
 * value) and fill (placeholder). Scope: builder PreviewPanel ONLY — the
 * stored-PDF preview remains a faithful document view.
 *
 * Mapping-shape decision (flagged, not guessed): provenance-card fields
 * (grantor, APN, legal description, county) open at SECTION level — the
 * confirm/edit card is the affordance there, and faking an input focus
 * would mislead. Plain typed inputs get field-level focus anchors.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const PREVIEW = readSource('components', 'builder', 'PreviewPanel.tsx');
const BUILDER = readSource('features', 'builder', 'DeedBuilder.tsx');

const KNOWN_SECTIONS = new Set(['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording']);
const FIELD_ANCHORS: Array<[string, string[]]> = [
  ['grantee', ['components', 'builder', 'sections', 'GranteeSection.tsx']],
  ['dtt-value', ['components', 'builder', 'sections', 'TransferTaxSection.tsx']],
  ['dtt-city', ['components', 'builder', 'sections', 'TransferTaxSection.tsx']],
  ['requested-by', ['components', 'builder', 'sections', 'RecordingSection.tsx']],
  ['requested-by-address', ['components', 'builder', 'sections', 'RecordingSection.tsx']],
  ['title-order-no', ['components', 'builder', 'sections', 'RecordingSection.tsx']],
  ['escrow-no', ['components', 'builder', 'sections', 'RecordingSection.tsx']],
];

describe('D3 — every preview data region is clickable with a valid mapping', () => {
  const gos = [...PREVIEW.matchAll(/go\('([^']+)'(?:,\s*'([^']+)')?\)/g)];

  it('the regions carry click handlers (a plausible number of them)', () => {
    expect(gos.length).toBeGreaterThanOrEqual(14);
  });

  it('every mapping targets a real section', () => {
    for (const m of gos) {
      expect(KNOWN_SECTIONS.has(m[1])).toBe(true);
    }
  });

  it('every field-level mapping has a data-builder-field anchor', () => {
    const fields = gos.map((m) => m[2]).filter(Boolean) as string[];
    expect(fields.length).toBeGreaterThanOrEqual(5);
    for (const field of new Set(fields)) {
      const anchor = FIELD_ANCHORS.find(([name]) => name === field);
      expect(anchor).toBeDefined();
      const src = readSource(...anchor![1]);
      expect(src).toContain(`data-builder-field="${field}"`);
    }
  });

  it('provenance-card sections map at section level (no fake field focus)', () => {
    // grantor / property regions carry no field id.
    expect(PREVIEW).toContain("go('grantor')");
    expect(PREVIEW).toContain("go('property')");
    expect(PREVIEW).not.toMatch(/go\('grantor',/);
    expect(PREVIEW).not.toMatch(/go\('property',/);
  });
});

describe('D3 — the builder opens the section and focuses the anchor', () => {
  it('handleRegionClick expands, then focuses via the anchor attribute', () => {
    expect(BUILDER).toContain('const handleRegionClick');
    expect(BUILDER).toContain('setExpandedSection(section)');
    expect(BUILDER).toContain('data-builder-field="${field}"');
    expect(BUILDER).toContain('onRegionClick={handleRegionClick}');
  });

  it('clicking is preview-panel scoped — the click affordance only exists when wired', () => {
    expect(PREVIEW).toContain('onRegionClick ? ');
    expect(PREVIEW).toContain('cursor-pointer');
  });
});
