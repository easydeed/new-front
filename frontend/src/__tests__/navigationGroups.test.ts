/**
 * DASH1 item 6 — the sidebar, grouped, with the waiting-signal on it.
 *
 * ═══ WHY GROUPS ═══
 *
 * A flat list of seven destinations says they are all the same kind of
 * visit. They are not. WORK is where she makes and finds documents;
 * TRACKING is where she checks what other people owe her; SETUP is where
 * she goes twice a year. The grouping tells her where to look before she
 * has read a single label.
 *
 * ═══ WHY BADGES ON TRACKING ONLY ═══
 *
 * Ambient waiting-signal does more for at-a-glance awareness than
 * anything the dashboard carried before DASH1, because she sees it from
 * every page rather than only from the one she starts on. It belongs on
 * the two pages that hold other people's replies and nowhere else — a
 * badge on Past Deeds would be counting documents, which is the trivia
 * this ticket removed from the tiles.
 *
 * ═══ AND THE COUNT COMES FROM THE SERVER ═══
 *
 * Same reason `needs_attention` does: the sidebar filtering the queue
 * itself would be a second opinion about what counts as waiting.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const SIDEBAR = fs.readFileSync(path.join(SRC, 'components', 'Sidebar.tsx'), 'utf8');
const CODE = codeOnly(SIDEBAR);

describe('DASH1 item 6 — three groups, in the order she works', () => {
  it('groups Work, Tracking and Setup', () => {
    for (const title of ["title: 'Work'", "title: 'Tracking'", "title: 'Setup'"]) {
      expect(CODE).toContain(title);
    }
    expect(CODE.indexOf("title: 'Work'"))
      .toBeLessThan(CODE.indexOf("title: 'Tracking'"));
    expect(CODE.indexOf("title: 'Tracking'"))
      .toBeLessThan(CODE.indexOf("title: 'Setup'"));
  });

  it('loses nobody in the regrouping', () => {
    // The flat list had seven items. A group structure that quietly
    // dropped one would be a page that still exists and cannot be
    // reached — the same defect as a dead button, arriving by omission.
    for (const href of ['/dashboard', '/deed-builder', '/past-deeds',
                        '/signings', '/shared-deeds', '/partners',
                        '/account-settings']) {
      expect(CODE).toContain(`href: '${href}'`);
    }
  });

  it('keeps admin gated and out of the standing groups', () => {
    expect(CODE).toContain('ADMIN_ITEM');
    expect(CODE).toContain('isAdmin');
  });
});

describe('DASH1 item 6 — the waiting-signal is ambient and honest', () => {
  it('badges only the two tracking destinations', () => {
    const badges = CODE.match(/badge: '(\w+)'/g) || [];
    expect(badges.sort()).toEqual(["badge: 'shared_deeds'", "badge: 'signings'"]);
  });

  it('takes the counts from the server rather than counting itself', () => {
    expect(CODE).toContain("apiFetch('/dashboard/queue'");
    expect(CODE).toContain('?.badges');
    // No local filtering of the queue — a second opinion about what
    // counts as waiting is two numbers answering one question.
    expect(CODE).not.toContain('.filter(');
  });

  it('renders nothing at zero', () => {
    // A badge saying "0" is a thing to read that says there is nothing
    // to read.
    expect(CODE).toContain('count > 0 &&');
  });

  it('a badge that cannot load is absent, not an error banner', () => {
    // The one place in this codebase where silence is right, and it is
    // deliberate: a badge is an enrichment, not a claim. An error banner
    // in the navigation of every page, because one background request
    // failed, is noise she cannot act on and cannot dismiss. The pages
    // themselves report their own failures loudly.
    expect(CODE).toContain('silent: true');
    expect(SIDEBAR).toContain('a badge that cannot load is a badge that is absent');
  });
});
