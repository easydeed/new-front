/**
 * Ticket PV drift-killer: the builder's live preview and the backend
 * chassis templates must show the same document.
 *
 * The pre-PV preview was a pixel-faithful portrait of the DELETED pre-G2
 * template — bordered recorder box, stamp-zone reference numbers, missing
 * statutory DTT lead-in, ("Grantor")/("Grantee") labels — a surface
 * asserting something untrue about output (the doctrine sweep's seventh
 * habitat).
 *
 * Enforcement is transitive through one source of truth:
 *   lib/deedFurniture constants  ⊂  PreviewPanel source (used by identifier)
 *   lib/deedFurniture constants  ⊂  templates/<type>/index.jinja2 (by value)
 * so a wording change breaks this test until preview and templates move
 * together — they cannot drift apart silently.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  DTT_LEAD,
  DTT_AMOUNT_LABEL,
  DTT_BASIS_FULL,
  DTT_BASIS_LESS_LIENS,
  RECORDER_CAPTION,
  MAIL_TAX_DIRECTIVE,
  OPERATIVE_WORDS,
  EXEMPTION_RECITALS,
  FIXED_VESTING_PHRASES,
} from '../lib/deedFurniture';

/** Strip // and /* comments so prose about a disease can't trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const PANEL = stripComments(
  fs.readFileSync(
    path.join(__dirname, '..', 'components', 'builder', 'PreviewPanel.tsx'),
    'utf8'
  )
);

const TEMPLATE_ROOT = path.join(__dirname, '..', '..', '..', 'templates');

const TEMPLATE_DIRS: Record<string, string> = {
  'grant-deed': 'grant_deed_ca',
  'quitclaim-deed': 'quitclaim_deed_ca',
  'interspousal-transfer': 'interspousal_transfer_ca',
  'warranty-deed': 'warranty_deed_ca',
  'tax-deed': 'tax_deed_ca',
  'grant-deed-jt': 'grant_deed_jt_ca',
  'grant-deed-cp-ros': 'grant_deed_cp_ros_ca',
};

/** Normalize Jinja/HTML source for wording comparison. */
function normalized(source: string): string {
  return source
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/\s+/g, ' ');
}

function template(deedType: string): string {
  return normalized(
    fs.readFileSync(path.join(TEMPLATE_ROOT, TEMPLATE_DIRS[deedType], 'index.jinja2'), 'utf8')
  );
}

describe('preview uses the shared furniture constants', () => {
  it.each([
    'DTT_LEAD',
    'DTT_AMOUNT_LABEL',
    'DTT_BASIS_FULL',
    'DTT_BASIS_LESS_LIENS',
    'RECORDER_CAPTION',
    'MAIL_TAX_DIRECTIVE',
    'OPERATIVE_WORDS',
    'EXEMPTION_RECITALS',
    'FIXED_VESTING_PHRASES',
  ])('renders via %s, not a duplicated string', (identifier) => {
    expect(PANEL).toContain(identifier);
  });
});

describe('preview carries no dead pre-G2 furniture', () => {
  it.each([
    ['("Grantor") defined-term label', '"Grantor"'],
    ['("Grantee") defined-term label', '"Grantee"'],
    ['separate "Same as above" mail-tax block', 'Same as above'],
    ['bordered recorder box', 'border-2 border-black'],
    ['recorder caption inside a box', 'For Recorder&apos;s Use Only'],
    ['22pt celebration title', 'text-[22pt]'],
    ['auto-declared zero tax', '$0.00'],
  ])('does not render the %s', (_label, pattern) => {
    expect(PANEL).not.toContain(pattern);
  });

  it('never pre-checks a DTT checkline without officer data', () => {
    // Every Checkline mark must be gated on the dtt state existing.
    const marks = PANEL.match(/marked=\{[^}]*\}/g) || [];
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      expect(m).toContain('!!dtt');
    }
  });
});

describe('the same wording lives in the backend chassis templates', () => {
  const allTypes = Object.keys(TEMPLATE_DIRS);
  const dttTypes = ['grant-deed', 'quitclaim-deed', 'warranty-deed', 'grant-deed-jt', 'grant-deed-cp-ros'];

  it.each(allTypes)('%s: recorder caption and mail-tax directive', (dt) => {
    const t = template(dt);
    expect(t).toContain(RECORDER_CAPTION);
    expect(t).toContain(MAIL_TAX_DIRECTIVE);
  });

  it.each(dttTypes)('%s: statutory DTT declaration', (dt) => {
    const t = template(dt);
    expect(t).toContain(DTT_LEAD);
    expect(t).toContain(DTT_AMOUNT_LABEL);
    expect(t).toContain(DTT_BASIS_FULL);
    expect(t).toContain(DTT_BASIS_LESS_LIENS);
  });

  it.each(allTypes)('%s: operative granting words', (dt) => {
    expect(template(dt)).toContain(OPERATIVE_WORDS[dt]);
  });

  it.each(Object.keys(EXEMPTION_RECITALS))('%s: categorical exemption recital', (dt) => {
    expect(template(dt)).toContain(EXEMPTION_RECITALS[dt]);
  });

  // Wave 1 #3/#4: the fixed-vesting phrase is furniture printed by the
  // template — preview and instrument must carry the identical wording,
  // and the template must never read the stored vesting value (a stray
  // value must not contradict the face of the instrument).
  it.each(Object.keys(FIXED_VESTING_PHRASES))('%s: fixed-vesting furniture, stored vesting never read', (dt) => {
    const t = template(dt);
    expect(t).toContain(`${FIXED_VESTING_PHRASES[dt]} the real property situated in the County of`);
    expect(t).not.toContain('{{ vesting }}');
    expect(t).not.toContain('{% if vesting %}');
  });
});
