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

/**
 * FLOW1 item 6. `SigningRequestModal.tsx` — NOTARY1's create form — is
 * DELETED with the route it posted to. The pins that read it are handled
 * three different ways below, and which way each got is the whole
 * question, so it is written down rather than left to the diff:
 *
 *  · The offset and window-count pins MOVE to `/signing/[token]`, which
 *    is where times are entered now. The property ("a time is sent with
 *    its offset, and at most three are offerable") is unchanged; only
 *    the surface that asks for them moved when §13.1 handed the posting
 *    of availability to the notary.
 *  · The "no field for a signer" pin RETIRES. §13.1 reversed that rule:
 *    NOTARY2's create form asks for signers by name, email and phone on
 *    purpose, into `signing_participants`, purged on a schedule. Keeping
 *    it would be asserting a rule the owner overturned.
 *  · The tree-wide signer-contact sweep STAYS, untouched. It is the one
 *    that still means something — no OTHER surface may grow a way to
 *    reach a party.
 */
const TOKEN_PAGE = read('app', 'signing', '[token]', 'page.tsx');
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

});

describe('NOTARY1 — the words come from one place', () => {
  it('the token page takes the retired notice from the server too', () => {
    /**
     * RETARGETED with NOTARY1's read side. The page used to render
     * `deed.signing.summary` — the server's scheduling sentence — and
     * there is no longer a scheduling sentence for it to render, because
     * the routes behind the window picker are gone.
     *
     * The property is unchanged: the CONDITION is known on the server and
     * the page renders what it is told. What changed is which condition.
     */
    expect(APPROVE).toContain('deed?.retired?.reason');
    expect(APPROVE).toContain('deed?.retired?.what_to_do');
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

  it('a retired link says what happened rather than going quiet', () => {
    /**
     * The picker is gone; the visitor holding an old link is not. A page
     * with no actions and no explanation is invariant #4 wearing an empty
     * state — the reader cannot tell "retired" from "broken", and only
     * one of those is theirs to solve.
     */
    const flatCode = flat(APPROVE);
    expect(flatCode).toContain('This scheduling link has been retired');
    expect(flatCode).toContain('Ask the escrow officer to send a new signing request');
    // And it no longer offers what it cannot do.
    expect(codeOnly(APPROVE)).not.toContain('chooseWindow');
    expect(codeOnly(APPROVE)).not.toContain('pcor_url');
  });

  it('a notary is never sent the review reminder', () => {
    expect(SHARED).toContain('if (deed.share_type === "signing_request") return false');
  });
});

describe('NOTARY1 — times carry their offset', () => {
  it('the surface that takes a time appends the browser offset', () => {
    // A bare wall-clock time forces the server to guess a zone, which is
    // how a calendar entry lands an hour out and somebody arrives at an
    // empty office. Pinned where times are ENTERED — which is the
    // notary's token page since §13.1, not the officer's modal.
    // FLOW1 item 7 moved the stamping into `lib/wallClock.ts` when the
    // officer's dispatch form needed it too. Copying the eight lines is
    // how `phoneSearchKey` came to be right in one language and wrong in
    // the other, so the rule lives once and the surfaces call it.
    expect(read('lib', 'wallClock.ts')).toContain('getTimezoneOffset');
    expect(TOKEN_PAGE).toContain('withOffset(start)');
    expect(TOKEN_PAGE).toContain('withOffset(r.start)');
    expect(TOKEN_PAGE).toContain('withOffset(r.end)');
  });
});
