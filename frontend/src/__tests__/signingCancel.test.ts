/**
 * CANCEL1 — the screen half.
 *
 * ═══ WHY THIS FILE EXISTS SEPARATELY FROM THE PYTHON SUITE ═══
 *
 * The Python suite pins that the SERVER decides which states are over
 * (`signing_loop.is_live`) and that the agenda sends the verdict. This
 * file pins the other half: the screen holds no list of its own.
 *
 * The split is not tidiness. The first draft of that pin lived in Python
 * and read `signings/page.tsx` through `code_only`, which parses PYTHON —
 * so it matched the comment explaining the removal and became the
 * sixteenth comment-trip in this codebase. #15 already ruled the shape:
 * a TypeScript comment stripper on the Python side would be a third
 * opinion about what a comment is. Each language's pin uses the stripper
 * that speaks it.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { cancelWarning } from '../lib/signingCopy';

const SIGNINGS = codeOnly(
  fs.readFileSync(path.join(__dirname, '..', 'features', 'signing', 'SigningAgenda.tsx'), 'utf8'));
/** DEEDDETAIL: the agenda's expanding panel — the only place cancelling
 *  has ever lived — became its own component, rendered on the deed page.
 *  The pins about the PANEL read it here. */
const PANEL = codeOnly(
  fs.readFileSync(path.join(__dirname, '..', 'features', 'signing', 'SigningDetail.tsx'), 'utf8'));
const DEED_PAGE = codeOnly(
  fs.readFileSync(path.join(__dirname, '..', 'app', 'deeds', '[id]', 'page.tsx'), 'utf8'));

describe('which states are over is the server’s judgement', () => {
  it('the screen holds no terminal-state list', () => {
    /**
     * `['cancelled', 'expired'].includes(r.state)` lived here — the same
     * disease as the deleted `STUCK_AFTER_DAYS`, one layer up. A list of
     * terminal states in TypeScript is the copy that gets missed the day
     * a seventh state is added to the Python vocabulary.
     */
    expect(SIGNINGS).not.toContain("'cancelled', 'expired'");
    expect(SIGNINGS).not.toContain("'expired', 'cancelled'");
  });

  it('renders the verdict the payload carries', () => {
    /* The grouping moved into `signingSummary.groupSignings` and is
       pinned there BY CALL (officerTrackers.test.ts). What matters here
       is that the agenda reads `live` and holds no list of its own. */
    expect(SIGNINGS).toContain('groupSignings');
    expect(SIGNINGS).not.toMatch(/state === '(cancelled|expired)'/);
  });
});

describe('the cancel confirmation names what is being cancelled', () => {
  const unbooked = {
    state: 'windows_posted',
    summary: 'Waiting on signers',
    property_address: '1358 5th Street, Coronado, CA',
  };
  const booked = {
    state: 'booked',
    summary: 'Nora and both signers agreed on Thursday, September 3, 2026, 2:00 PM.',
    property_address: '1358 5th Street, Coronado, CA',
  };

  it('names the property on an ordinary request', () => {
    const text = cancelWarning(unbooked, []);
    expect(text).toContain('1358 5th Street, Coronado, CA');
    expect(text).toContain('stops working');
  });

  it('carries the booking’s weight when a time is agreed', () => {
    /**
     * Owner-ruled: cancelling a booked signing is ALLOWED — the deal
     * falls out, the closing moves, the buyer reschedules, and refusing
     * there would fail the officer at the exact moment she needs the
     * product. So the weight lands in the sentence instead: who agreed,
     * to what, and what cancelling costs them.
     */
    const text = cancelWarning(booked, ['Nora Notary', 'Sam Signer']);
    expect(text).toContain('Nora Notary and Sam Signer');
    expect(text).toContain('voids their links');
    expect(text).toContain('1358 5th Street, Coronado, CA');
  });

  it('reads differently for a booked request than an unbooked one', () => {
    /**
     * THE WHOLE POINT, and the same rule as the Past Deeds delete
     * confirm: a sentence that reads identically every time is the one
     * that gets read past. If these two ever converge, the heavier case
     * has stopped being heavier.
     */
    expect(cancelWarning(booked, ['Nora Notary']))
      .not.toEqual(cancelWarning(unbooked, ['Nora Notary']));
  });

  it('takes the booked sentence from the server verbatim', () => {
    /** §13 rule 3: one place turns a scheduling state into English, and
     * it is not a screen. This file formats no signing time. */
    expect(cancelWarning(booked, [])).toContain(booked.summary);
    const copy = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'signingCopy.ts'), 'utf8');
    expect(codeOnly(copy)).not.toMatch(/toLocaleString|toLocaleTimeString|Intl\./);
  });

  it('degrades to a name rather than a blank when the address is missing', () => {
    expect(cancelWarning({ ...unbooked, property_address: null }, []))
      .toContain('this deed');
  });
});

describe('the panel that had no controls', () => {
  it('offers the cancel, behind a confirmation', () => {
    expect(PANEL).toContain('Cancel this signing request');
    expect(PANEL).toContain('cancelWarning');
    expect(PANEL).toContain('Keep it');
  });

  it('does not compose its own scheduling sentence', () => {
    expect(PANEL).not.toMatch(/scheduled for/i);
    expect(PANEL).not.toMatch(/will (happen|take place)/i);
    // The agenda row never did either, and still must not.
    expect(SIGNINGS).not.toMatch(/scheduled for/i);
  });

  it('shows a cancelled request rather than hiding it', () => {
    /** T-5: a cancelled request that HAD a booked time still had one.
     * The row moves to the closed list and keeps saying what happened. */
    expect(PANEL).toContain('detail.cancelled_at');
  });

  it('AND IT IS STILL REACHABLE — the panel moved, it did not close', () => {
    /**
     * The pin this retarget exists for.
     *
     * Collapsing the agenda row to a link removed the only surface that
     * had ever offered cancelling. Retargeting the three pins above to
     * the extracted component proves the CODE survived; it does not
     * prove anything RENDERS it, and a component nothing mounts is the
     * same as a deleted one.
     *
     * The named cost of the ruling was an extra navigation. A silently
     * unreachable cancel would not have been a cost, it would have been
     * a removed feature.
     */
    expect(DEED_PAGE).toContain('<SigningDetail');
    expect(DEED_PAGE).toContain('requestId={detail.state.signing_request_id}');
  });
});
