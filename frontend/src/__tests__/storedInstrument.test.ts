/**
 * A surface showing a deed shows the RECORDED document, not a lookalike.
 *
 * ═══ THE DEFECT ═══
 *
 * Two pages displayed "the deed" and only one displayed the deed.
 *
 * `/deed-builder/{type}/success` fetched `/deeds/{id}/download`, which
 * serves the bytes stored in `deed_pdfs`. `/deeds/{id}/preview` POSTed
 * the deed's fields to `/api/generate/{type}` on every visit and showed
 * the result — and its Download button handed over that blob.
 *
 * `deed_pdfs` is one row per deed, INSERT-OR-REFUSE under doctrine §9,
 * with a sha256 stamped on the deed row. It is immutable on purpose:
 * §3 removed QR codes from recorded pages on the reasoning that
 * "verification survives as data", and that hash is the data. A
 * re-render routes around every part of it.
 *
 * The two agree until a template, the rate registry or the deed's own
 * fields change after generation. Nothing compared them, and the
 * registry version is a KNOWN mover — RED-S4 is queued precisely
 * because it is not yet stamped at generation time.
 *
 * "Probably the instrument" is the wrong phrase for the thing being
 * signed and recorded.
 *
 * ═══ AND THE TRAP IN THE OBVIOUS FIX ═══
 *
 * "Call the download endpoint, let it render when nothing is stored"
 * would have been worse than the defect. `store_deed_pdf` sets
 * `status = 'completed'`, stamps `completed_at`, and refuses to be
 * replaced. So rendering a draft on demand does not preview it — it
 * FINALISES it, permanently, with whatever half-entered fields it had at
 * that moment.
 *
 * Nothing in the API prevented that. What prevented it was a button:
 * Past Deeds renders Download only when `status === "completed"`. The
 * rule is `deed_pdf.may_self_heal` now, pinned in Python where it lives.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const PREVIEW = codeOnly(read('app', 'deeds', '[id]', 'preview', 'page.tsx'));

/** Every .ts/.tsx under src, so a re-render cannot arrive in a file this
 *  test did not think to name. */
function allSources(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      // `app/api/generate/*` are the proxy ROUTES themselves — the thing
      // being called, not a caller. Excluding them is the difference
      // between "nothing generates" and "the endpoint does not exist".
      if (full.endsWith(path.join('app', 'api'))) continue;
      out.push(...allSources(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('the preview shows the recorded instrument', () => {
  it('fetches the stored document instead of making one', () => {
    expect(PREVIEW).toContain('apiFetch(`/deeds/${deedId}/download`');
    expect(PREVIEW).not.toContain('/api/generate/');
    expect(PREVIEW).not.toContain('generateWithRetry');
  });

  it('downloads what it displayed, and what it displayed is the record', () => {
    // The Download button hands over the same blob the viewer showed —
    // and that blob now comes from storage. A second fetch here would be
    // a second chance to diverge.
    expect(PREVIEW).toContain('a.href = pdfUrl');
  });

  it('says a draft has no instrument rather than making it one', () => {
    /**
     * The 409 is a NORMAL state with an obvious next step, not a
     * failure. Rendering here instead would stamp `completed` on a
     * half-entered deed and refuse to be corrected.
     */
    expect(PREVIEW).toContain('res.status === 409');
    expect(PREVIEW).toContain('setNotGenerated');
    expect(PREVIEW).toContain('Continue in the builder');
  });

  it('reports a document it could not load rather than an empty frame', () => {
    // §4: an empty viewer would read as a deed with nothing in it.
    expect(PREVIEW).toMatch(/Could not load this deed/);
  });

  it('no longer holds its own opinion about completeness', () => {
    // The pre-flight field check guarded a generation this page does not
    // perform. A second opinion beside the builder's own.
    expect(PREVIEW).not.toContain('validateDeedData');
    expect(PREVIEW).not.toContain('validationErrors');
  });
});

describe('tree-wide: nothing renders a deed that already has one', () => {
  it('no surface outside the builder POSTs to a generate endpoint', () => {
    /**
     * The PROPERTY, swept rather than spot-checked. The preview page was
     * the only caller when this was written — the builder generates
     * through `/api/deeds/generate`, which stores what it made — and the
     * point of a sweep is that the second caller fails here rather than
     * shipping.
     */
    const offenders = allSources()
      .filter((f) => /\/api\/generate\//.test(codeOnly(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('the sweep is reading a plausible corpus', () => {
    // A walker that finds nothing exempts everything. Same scanner-floor
    // rule the guard and link sweeps carry.
    expect(allSources().length).toBeGreaterThan(80);
  });

  it('the surfaces that show a deed all read it from storage', () => {
    for (const segments of [
      ['app', 'past-deeds', 'page.tsx'],
      ['app', 'deeds', '[id]', 'preview', 'page.tsx'],
      ['app', 'deed-builder', '[type]', 'success', 'success-content.tsx'],
    ]) {
      expect(codeOnly(read(...segments))).toMatch(/\/deeds\/\$\{[^}]+\}\/download/);
    }
  });
});
