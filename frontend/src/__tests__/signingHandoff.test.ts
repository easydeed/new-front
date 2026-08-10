/**
 * NOTARY1 — the signing handoff, on the screens.
 *
 * The backend pins the rules; these pin that the UI does not quietly
 * undo them. Three properties, and each has bitten some product
 * somewhere:
 *
 *  1. NO SIGNER CONTACT. The officer relays; the product coordinates
 *     officer↔notary and messages no signer. A form field is the
 *     easiest place for that to change without anybody deciding to
 *     change it, so this sweeps the frontend the way the backend suite
 *     sweeps Python — fail-closed, across the whole tree.
 *  2. ONE PLACE WRITES THE WORDS. `scheduling_label()` on the server
 *     is the only thing that turns a scheduling state into a sentence,
 *     so "scheduled" cannot drift into "the signing will happen" on
 *     some screen nobody rechecked. These pages render its output; they
 *     do not compose their own.
 *  3. A TIME IS SENT WITH ITS OFFSET. A bare wall-clock time forces the
 *     server to guess a zone, which is how a calendar entry lands an
 *     hour out and somebody arrives at an empty office.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(SRC, ...parts), 'utf8');

/** JSX prose wraps across lines, so a sentence in the source is not a
 * sentence in a string. Flatten before asserting on wording — otherwise
 * the pin passes or fails on where the formatter chose to break. */
const flat = (source: string) => source.replace(/\s+/g, ' ');

const MODAL = read('features', 'signing', 'SigningRequestModal.tsx');
const APPROVE = read('app', 'approve', '[token]', 'page.tsx');
const SHARED = read('app', 'shared-deeds', 'page.tsx');

/** Every .ts/.tsx under src, so a signer field cannot arrive in a file
 * this test did not think to name. */
function allSources(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...allSources(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// The PROPERTY — a way to reach a grantor or grantee — not the spellings
// somebody happened to use. `recipient_email` and `notary_email` are the
// professional the officer chose, not a consumer we found on a deed.
const SIGNER_CONTACT =
  /\b((signer|grantor|grantee|buyer|seller|borrower)_(email|phone|mobile|cell|sms|contact)|(email|phone|sms|notify)_(signer|grantor|grantee|buyer|seller))\b/i;

describe('NOTARY1 — no signer contact, anywhere', () => {
  it('no frontend source captures or sends a signer contact detail', () => {
    const offenders: string[] = [];
    for (const file of allSources()) {
      const match = codeOnly(fs.readFileSync(file, 'utf8')).match(SIGNER_CONTACT);
      if (match) offenders.push(`${path.relative(SRC, file)} → ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the signing form has no field for a signer', () => {
    // Its inputs, enumerated: what the officer sends is the notary's
    // address, a courtesy name, where, and the times.
    const bound = [...MODAL.matchAll(/useState[^\n]*\n/g)].length;
    expect(bound).toBeGreaterThan(0);
    expect(MODAL).toContain('notary_email');
    expect(MODAL).not.toMatch(SIGNER_CONTACT);
    // And it says so on the form, so the officer knows the leg is hers.
    expect(flat(MODAL)).toContain('The signers are not contacted');
  });
});

describe('NOTARY1 — the words come from one place', () => {
  it('the token page renders the summary the server wrote', () => {
    expect(APPROVE).toContain('deed.signing.summary');
  });

  it('the token page never composes its own scheduling sentence', () => {
    const code = codeOnly(APPROVE);
    expect(code).not.toMatch(/scheduled for/i);
    expect(code).not.toMatch(/will (happen|take place|be signed)/i);
    expect(code).not.toMatch(/signing is confirmed/i);
  });

  it('the officer list renders the server line, not its own', () => {
    const code = codeOnly(SHARED);
    expect(code).toContain('deed.signing_summary');
    expect(code).not.toMatch(/scheduled for/i);
  });
});

describe('NOTARY1 — a signing request is not an approval request', () => {
  it('the approve and reject actions are gated off a signing link', () => {
    // can_approve comes back false from the server for a signing share,
    // and the server refuses the POST as well — this pins that the page
    // reads the flag rather than deciding for itself.
    expect(APPROVE).toContain("deed?.share_kind === 'signing_request'");
    expect(APPROVE).toContain('deed?.can_approve && !showRejectForm');
  });

  it('the notary is told what tapping a time means', () => {
    expect(flat(APPROVE)).toContain('you are available then');
  });

  it('a notary is never sent the review reminder', () => {
    expect(SHARED).toContain('if (deed.share_type === "signing_request") return false');
  });
});

describe('NOTARY1 — times carry their offset', () => {
  it('the modal appends the browser offset before sending', () => {
    expect(MODAL).toContain('getTimezoneOffset');
    expect(MODAL).toContain('withOffset(w.start)');
    expect(MODAL).toContain('withOffset(w.end)');
  });

  it('at most three windows are offerable', () => {
    expect(MODAL).toContain('const MAX_WINDOWS = 3');
    expect(MODAL).toContain('windows.length < MAX_WINDOWS');
  });
});
