/**
 * D1 — deed display pins, preview side.
 *
 * The mail-to block stacks its lines like the PDF; the legal description
 * carries the parties' bold weight; and EVERY inserted-data region gets
 * the purple data-highlight treatment — in the PreviewPanel only. The
 * PDF-side pins (address lines on a stored PDF, bold in every chassis,
 * no leaked classes) live in backend/tests/test_deed_display.py.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';


const PANEL = codeOnly(
  fs.readFileSync(
    path.join(__dirname, '..', 'components', 'builder', 'PreviewPanel.tsx'),
    'utf8'
  )
);

describe('D1.1 — preview mail-to mirrors the PDF block', () => {
  it('stacks the address lines instead of a squashed comma-string', () => {
    expect(PANEL).toContain('returnToLines');
    // The old single-line join is gone.
    expect(PANEL).not.toContain('returnToAddress');
  });
});

describe('D1.2 — legal description bolded like the parties', () => {
  it('the preview legal description span carries font-bold', () => {
    expect(PANEL).toMatch(/font-bold[^`]*\$\{placeholder\(preview\.legalDescription\)\}/);
  });
});

describe('D1.3 — consistent preview-only data highlighting', () => {
  it('defines one dataHighlight treatment and applies it to every data region', () => {
    expect(PANEL).toContain('const dataHighlight');
    // Every region the ticket names renders through it.
    for (const region of [
      'dataHighlight(preview.requestedBy)',
      'dataHighlight(preview.returnTo)',
      'dataHighlight(line)', // mail-to address lines
      'dataHighlight(preview.titleOrderNo)',
      'dataHighlight(preview.escrowNo)',
      'dataHighlight(preview.apn)',
      'dataHighlight(preview.grantor)',
      'dataHighlight(preview.grantee)',
      'dataHighlight(preview.vesting)',
      'dataHighlight(preview.county)',
      'dataHighlight(preview.legalDescription)',
      'dataHighlight(dttAmount)',
    ]) {
      expect(PANEL).toContain(region);
    }
  });

  it('placeholders never get the data treatment', () => {
    // dataHighlight refuses bracket-placeholders — gray stays gray.
    expect(PANEL).toMatch(/!String\(value\)\.startsWith\('\['\)/);
  });
});
