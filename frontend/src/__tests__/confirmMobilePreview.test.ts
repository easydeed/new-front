/**
 * TRY-7 — the confirmation preview on a phone, pinned.
 *
 * The surface is right and is not duplicated; only the preview forks.
 * These pins guard the fork itself and, more importantly, the option
 * that was REFUSED — because that one is nearly free, looks obviously
 * correct, and would hollow out the confirmation model while leaving
 * every other pin green.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const PAGE_PATH = path.join(
  __dirname, '..', 'app', 'confirm', '[token]', 'page.tsx');
const RAW = fs.readFileSync(PAGE_PATH, 'utf8');
const CODE = codeOnly(RAW);

/** Prose with its line wrapping removed.
 *
 *  Source prose is hard-wrapped, so a sentence is stored with newlines
 *  inside it and a contiguous substring match misses a file that says
 *  exactly what the pin demands. The property is what the paragraph
 *  SAYS, not where its newlines fall (§14.1). */
const flowed = (t: string) => t.replace(/\s+/g, ' ');
const PROSE = flowed(RAW);

describe('TRY-7 — the preview forks, the surface does not', () => {
  it('the iframe is desktop-only rather than deleted', () => {
    /**
     * At >=1024px the iframe is genuinely the right surface and the
     * ruling kept it. A fix that removed it everywhere would have
     * regressed the laptop case to solve the phone one.
     */
    const iframe = CODE.slice(CODE.indexOf('<iframe'), CODE.indexOf('</>'));
    expect(iframe).toContain('hidden');
    expect(iframe).toContain('lg:block');
    expect(iframe).toContain('h-[80vh]');
  });

  it('small screens get an explicit open step, not a shrunken iframe', () => {
    expect(CODE).toContain('lg:hidden');
    expect(CODE).toContain('Open the deed');
    expect(CODE).toContain('href={previewSrc}');
  });

  it('the copy says whose viewer opens it', () => {
    expect(PROSE).toContain("your phone&apos;s own PDF viewer");
  });

  it('the document opens in a NEW TAB so returning is not a reload', () => {
    /**
     * The ruling asks that the returning state show the controls
     * without re-scrolling. A new tab satisfies it by construction:
     * this page is never unloaded, so there is no scroll position to
     * restore and no re-fetch to wait through.
     */
    expect(CODE).toContain('target="_blank"');
    expect(CODE).toContain('rel="noopener noreferrer"');
  });

  it('the approve and reject controls are NOT inside the desktop-only branch', () => {
    /**
     * The failure this guards is the one that would make the phone fix
     * pointless: controls that render only where the iframe does.
     */
    const approveAt = CODE.indexOf('onClick={approve}');
    const previewBlockEnd = CODE.indexOf('The rendered deed is no longer available');
    expect(approveAt).toBeGreaterThan(previewBlockEnd);
    const controls = CODE.slice(previewBlockEnd);
    expect(controls).not.toContain('lg:block');
  });

  it('opening is never reported as reading', () => {
    /**
     * ENGINE1 bounded `draft_sha256` the same way: it shows the bytes
     * were fetched and proves nothing about a human reading them. A
     * confirmation surface must not quietly claim more than the API it
     * serves.
     */
    expect(PROSE).toContain('Opened in a new tab');
    for (const overclaim of ['You have read', 'you read the deed',
                             'Document read', 'confirmed you read']) {
      expect(PROSE).not.toContain(overclaim);
    }
  });
});

describe('TRY-7 — the refused option, recorded where it will be proposed', () => {
  it('the HTML-reflow option is named and refused in this file', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR.
     *
     * Serving `render_deed_html()` to the phone is nearly free, reflows
     * to any width, and needs no dependency. It is what a reasonable
     * person proposes on first reading this page — and it breaks the
     * model: approval promotes the PDF BYTES, so the approver would
     * read one artifact and approve another.
     *
     * Pinned at the REFUSAL rather than at the fork, because the fork
     * survives any edit and the explanation is what gets trimmed when
     * somebody shortens a comment block.
     */
    expect(PROSE).toContain('It is the obvious fix and it breaks the');
    expect(PROSE).toContain('read one artifact and approved another');
    expect(PROSE).toContain('AS IT WILL PRINT');
  });

  it('the refusal states the consequence in terms of draft_sha256', () => {
    /**
     * "It would look wrong" is a caveat. "It makes the binding a
     * fiction" names the mechanism that breaks — the ledger's second
     * convention applied to a code comment.
     */
    expect(PROSE).toContain('draft_sha256');
    expect(PROSE).toContain('a fiction');
  });

  it('and no HTML preview is actually wired', () => {
    /** The refusal is worth nothing if the thing is present anyway. */
    expect(CODE).not.toContain('render_deed_html');
    expect(CODE).not.toContain('/preview.html');
    expect(CODE).toContain('preview_url');
  });
});
