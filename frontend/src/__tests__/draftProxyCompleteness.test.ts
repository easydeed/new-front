/**
 * A draft never persists a poorer payload than generate does.
 *
 * ═══ THE RULE WAS ALREADY WRITTEN. NOTHING CHECKED IT. ═══
 *
 * `app/api/deeds/draft/route.ts` says so in its own opening comment, and
 * then lists twenty-two fields by hand. The create proxy forwards the
 * payload wholesale, so generate keeps everything the serializer emits
 * and the draft keeps whatever somebody remembered to add to the list.
 *
 * `parties` was not on the list. It carries the single named party of
 * every declaration-family instrument — the homestead declaration's
 * declarant, the trust certification's certifying trustee, the statutory
 * POA's principal, the TOD revocation's grantor. So those drafts
 * autosaved without the only party they have, and resumed with the field
 * blank: work silently discarded, with a save that reported success.
 *
 * A hand-maintained list of fields is a list that falls behind the
 * serializer. This compares the two rather than trusting the comment.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { join } from 'path';

import { codeOnly } from '@/test-support/sourceText';

const SRC = join(process.cwd(), 'src');

/** Top-level keys the builder's one serializer emits. */
function serializerKeys(): string[] {
  const src = codeOnly(fs.readFileSync(join(SRC, 'lib', 'deedPayload.ts'), 'utf8'));
  const body = src.slice(src.indexOf('export function buildDeedPayload'));
  const start = body.indexOf('return {');
  // Top-level keys of the returned literal are at exactly four spaces;
  // nested object keys are deeper, which is what keeps this honest.
  return Array.from(body.slice(start).matchAll(/^ {4}([a-z_][a-z0-9_]*):/gm))
    .map((m) => m[1]);
}

/** Keys the draft proxy forwards to the backend. */
function proxyKeys(): string[] {
  const src = codeOnly(
    fs.readFileSync(join(SRC, 'app', 'api', 'deeds', 'draft', 'route.ts'), 'utf8'));
  const body = src.slice(src.indexOf('const draftSave = {'));
  return Array.from(body.matchAll(/^ {6}([a-z_][a-z0-9_]*):/gm)).map((m) => m[1]);
}

/**
 * Serializer keys the proxy renames rather than drops. The backend's
 * `DraftSave` uses the column names; the serializer uses the render
 * context's names, and the proxy is where the two meet.
 */
const RENAMED: Record<string, string> = {
  doc_type: 'deed_type',
  grantors_text: 'grantor_name',
  grantees_text: 'grantee_name',
};

/**
 * Serializer keys that legitimately do not reach the draft row.
 *
 * EMPTY, and that is the finding. The first draft of this file carried a
 * 33-name exemption list for the affidavit facts — written from a regex
 * that matched every four-space-indented key in the file and therefore
 * counted the CONTENTS of `buildFactsBlock` as top-level. They are not:
 * they are nested under `affidavit`, which the proxy forwards whole.
 *
 * The same bad regex first suggested that 36 fields were being silently
 * dropped. Two were. A measurement worth acting on is one that survives
 * being checked.
 */
const NOT_PERSISTED_SEPARATELY = new Set<string>([]);

describe('the draft proxy forwards what the serializer emits', () => {
  it('drops nothing that is not accounted for', () => {
    const forwarded = new Set(proxyKeys());
    const dropped = serializerKeys().filter((key) => {
      if (NOT_PERSISTED_SEPARATELY.has(key)) return false;
      return !forwarded.has(RENAMED[key] ?? key);
    });
    expect(dropped).toEqual([]);
  });

  it('carries the two the audit found', () => {
    /**
     * `parties` — every declaration-family draft's only party.
     * `parcel` — §13.3's record of who chose the parcel, which lived in
     * React state and died with the page.
     */
    const forwarded = proxyKeys();
    expect(forwarded).toContain('parties');
    expect(forwarded).toContain('parcel');
  });

  it('and the exemption list does not outlive the serializer', () => {
    // A key exempted but no longer emitted is a stale excuse, and the
    // next reader would take it for a considered decision.
    const emitted = new Set(serializerKeys());
    const stale = [...NOT_PERSISTED_SEPARATELY].filter((k) => !emitted.has(k));
    expect(stale).toEqual([]);
  });
});
