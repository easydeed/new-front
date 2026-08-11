/**
 * PARTNER2 / Part B — two actions, and the rolodex as the default.
 *
 * ═══ WHAT WAS WRONG ═══
 *
 * One generic "Share" button opened a modal that asked for a typed email
 * address and a free-text role. It produced a REVIEW share, which meant
 * the button quietly meant "review" without saying so, and requesting a
 * signing was a different button that had arrived later.
 *
 * And both flows asked her to type an address she had already stored.
 * She has a partners screen. Her notary is in it. The product ignored it
 * every single time.
 *
 * ═══ THE TWO PROPERTIES PINNED HERE ═══
 *
 * 1. `share_kind` is decided by WHICH BUTTON SHE PRESSED — never
 *    inferred from the payload, never asked as a radio button. Two
 *    actions ask two different questions; making her classify her own
 *    intent for the database's benefit before she can act is the thing
 *    a kind-selector would have done.
 * 2. The rolodex is the DEFAULT and typing is the FALLBACK. Not the
 *    other way round, and not the only option either — a one-off
 *    recipient is real, and forcing a partner row for somebody she will
 *    email once would be the product being tidy at her expense.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const PAGE = read('app', 'past-deeds', 'page.tsx');
const REVIEW = read('features', 'signing', 'ShareForReviewModal.tsx');
const SIGNING = read('features', 'signing', 'SigningRequestModal.tsx');
const PICKER = read('features', 'partners', 'PartnerRecipientPicker.tsx');

describe('Part B — two distinct actions on the deed', () => {
  it('the deed offers "Share for review" and "Request signing", separately', () => {
    // FLOW1 item 1 RETARGETED THIS PIN, and the retarget is the point.
    // It used to assert `title="Share for review"` — a TOOLTIP. That was
    // the spelling, not the property: the property is that the two
    // actions are separately named where she can read them. A tooltip is
    // invisible until you already suspect you need it and absent
    // entirely on touch, which is how the owner pressed the wrong one of
    // two identical slate squares and sent a notary a reviewer's email.
    //
    // So the assertion moved UP in strength, not sideways: visible text,
    // and the titles that used to carry it are gone rather than kept as
    // a second copy of the same words.
    const flat = PAGE.replace(/\s+/g, ' ');
    expect(flat).toContain('<span className="whitespace-nowrap">Share for review</span>');
    expect(flat).toContain('<span className="whitespace-nowrap">Request signing</span>');
    expect(PAGE).not.toContain('title="Share for review"');
    expect(PAGE).not.toContain('title="Request signing"');
    // The generic one is gone, not relabelled alongside them.
    expect(PAGE).not.toContain('title="Share deed"');
  });

  it('each button opens its own modal', () => {
    expect(PAGE).toContain('setReviewDeedId(deed.id)');
    expect(PAGE).toContain('setSigningDeedId(deed.id)');
    expect(PAGE).toContain('<ShareForReviewModal');
    // NOTARY2 replaced SigningRequestModal (officer proposes windows)
    // with RequestSigningModal (the notary posts them) — §13.1's reversal
    // reaching the surface. The PROPERTY is unchanged: this button opens
    // the signing flow and the other opens the review flow.
    expect(PAGE).toContain('<RequestSigningModal');
  });

  it('the old inline share modal is deleted, not kept alongside', () => {
    // Two code paths creating the same kind of share with different
    // wording is precisely the divergence this ticket deletes elsewhere.
    const code = codeOnly(PAGE);
    expect(code).not.toContain('handleShareSubmit');
    expect(code).not.toContain('shareModalOpen');
    expect(code).not.toContain('ShareFormData');
  });

  it('share_kind comes from the endpoint each modal calls, never from a selector', () => {
    // The review modal posts to the review endpoint; the signing modal
    // posts to the signing endpoint. Neither sends a `share_kind` field
    // and neither offers the officer a kind to choose.
    expect(REVIEW).toContain("'/shared-deeds'");
    expect(SIGNING).toContain('"/signing-requests"');
    for (const src of [REVIEW, SIGNING]) {
      expect(codeOnly(src)).not.toContain('share_kind');
    }
  });

  it('the two modals speak their own status language', () => {
    expect(REVIEW).toContain('Send the review request');
    expect(SIGNING).toContain('Send the request');
    // Neither borrows the other's words.
    expect(REVIEW).not.toContain('availability');
    expect(SIGNING).not.toContain('approve');
  });
});

describe('Part B — the rolodex is the default, typing is the fallback', () => {
  it('both modals pick a recipient from her partners', () => {
    for (const src of [REVIEW, SIGNING]) {
      expect(src).toContain('PartnerRecipientPicker');
    }
    // And neither keeps a raw email input of its own beside it.
    expect(codeOnly(REVIEW)).not.toContain('recipient_email: recipientEmail');
    expect(codeOnly(SIGNING)).not.toContain('notaryEmail');
  });

  it('the picker opens on the partner list, not on a text box', () => {
    const code = codeOnly(PICKER);
    // `typing` starts false: the list is what she sees first.
    expect(code).toContain('const [typing, setTyping] = useState(false)');
    expect(code).toContain('Choose from my partners');
    expect(code).toContain('Someone else');
  });

  it('a signing request suggests notaries without hiding anyone else', () => {
    expect(SIGNING).toContain('suggestCategory="notary"');
    // Suggested-first, everyone-available: a mobile notary filed under
    // "other" three months ago is still the person she wants, and a
    // picker that knows better than her about her own contacts is one
    // she works around.
    expect(PICKER).toContain('Everyone else');
    expect(PICKER).toContain("hits.filter((p) => p.category !== suggestCategory)");
  });

  it('a partner with no email is shown and says why, not filtered out', () => {
    // "Why is Dana missing from this list" is a worse five minutes than
    // a sentence explaining it.
    expect(PICKER).toContain('No email on file');
    expect(PICKER).toContain('disabled={!p.email}');
  });

  it('adding a partner inline reuses the existing path', () => {
    // A fourth partner-creation form is how the category lists diverged.
    expect(PICKER).toContain('QuickAddPartnerModal');
    expect(PICKER).toContain('Add a new partner');
    // And the newly-created partner is selected immediately.
    // FLOW1 reformatted this call across lines when `category` joined it,
    // so the assertion flattens rather than pinning where the formatter
    // chose to break.
    expect(PICKER.replace(/\s+/g, ' ')).toContain('onChange({ email: created.email,');
  });

  it('a partner created without an email does not become a silent recipient', () => {
    expect(PICKER).toContain('setTyping(true);');
  });
});
