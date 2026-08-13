/**
 * DEEDDETAIL Unit 2 — the deed page, in the ruled order.
 *
 * ═══ THE RULE THE PAGE IS ORGANISED AROUND ═══
 *
 * A fact that invalidates the page cannot be rendered as an item on the
 * page. A superseded deed is one she should not be working on; a "next
 * action" offered beside a warning invites work on the wrong document,
 * and she has no way to know it is the wrong one except by us not
 * offering.
 *
 * So the disqualification is not a banner above a working page. The
 * working page is what must not be there.
 *
 * ═══ AND THE ONE ABOUT WHO SAYS THINGS ═══
 *
 * §13 rule 3: one place turns state into English, and it is Python.
 * Every sentence an officer reads about this deed's STATE was composed
 * in `services/deed_page.py`. A screen that writes its own account is
 * the second opinion, and the second opinion is the one nobody updates
 * when a state is added.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  ACTION_KINDS, DEED_DETAIL_KEYS, DEED_STATES, isRecordedAct, knownState,
  renders,
} from '../features/deed/deedDetail';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const PAGE = codeOnly(read('app', 'deeds', '[id]', 'page.tsx'));
const AGENDA = codeOnly(read('features', 'signing', 'SigningAgenda.tsx'));
const PAST_DEEDS = codeOnly(read('app', 'past-deeds', 'page.tsx'));
const DASHBOARD = codeOnly(read('app', 'dashboard', 'page.tsx'));

const PY = fs.readFileSync(
  path.join(SRC, '..', '..', 'backend', 'services', 'deed_page.py'), 'utf8');

describe('the disqualification replaces the page', () => {
  it('renders() is false whenever the deed is disqualified', () => {
    expect(renders({ disqualified: null })).toBe(true);
    expect(renders({
      disqualified: { kind: 'superseded', headline: '', sentence: '', go_to_deed_id: 9 },
    })).toBe(false);
    // A payload that never arrived is not a page either.
    expect(renders(null)).toBe(false);
  });

  it('the page gates its whole body on it, not just a banner', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR. The state block, the activity, the
     * participants, the matter and the instrument all sit inside ONE
     * `renders(detail)` guard — so there is no arrangement of the JSX in
     * which a next action appears beside a supersession warning.
     */
    expect(PAGE).toContain('renders(detail) && detail && (');
    // And exactly one such guard: a second one is a second chance to get
    // the nesting wrong.
    expect((PAGE.match(/renders\(detail\)/g) || []).length).toBe(1);
  });

  it('the disqualified block offers no next action', () => {
    const at = PAGE.indexOf('data-testid="disqualified"');
    expect(at).toBeGreaterThan(-1);
    const block = PAGE.slice(at, PAGE.indexOf('renders(detail)'));
    expect(block).not.toContain('next_action');
    expect(block).not.toContain('act(');
  });

  it('and always offers a way out', () => {
    const at = PAGE.indexOf('data-testid="disqualified"');
    const block = PAGE.slice(at, PAGE.indexOf('renders(detail)'));
    expect(block).toContain('go_to_deed_id');
    expect(block).toContain('/past-deeds');
  });
});

describe('the page fetches once', () => {
  it('one call carries the disqualification and what it would replace', () => {
    /**
     * A screen that fetched lineage separately would render the working
     * page first and swap it out when lineage landed. That is the same
     * defect wearing a smaller hat — for a second she is looking at an
     * action on a document she must not act on, and a second is long
     * enough to click.
     */
    expect(PAGE).toContain('/detail');
    for (const separate of ['/lineage', '/matter', '/activity']) {
      expect(PAGE).not.toContain(`${separate}\``);
    }
  });

  it('a failed load says so rather than rendering an empty deed', () => {
    // An empty page reads as "a deed with nothing on it", which is a
    // different and much worse claim than "we could not load this".
    expect(PAGE).toContain('Could not load this deed');
    expect(PAGE).toContain('Try again');
  });
});

describe('no sentence about state is composed here', () => {
  it('the page renders the server strings verbatim', () => {
    expect(PAGE).toContain('{detail.state.headline}');
    expect(PAGE).toContain('{detail.state.sentence}');
    expect(PAGE).toContain('{detail.state.next_action.label}');
  });

  it('and holds no state vocabulary of its own', () => {
    /**
     * The failure this prevents: a screen that switches on state names
     * to pick its own wording. The moment a state is added, the screen's
     * switch silently has no arm for it.
     */
    for (const state of DEED_STATES) {
      if (state === 'draft') continue; // `?resume=` lives on the action, not a label
      expect(PAGE).not.toContain(`'${state}'`);
    }
  });

  it('an unknown state is a visible gap, never a confident guess', () => {
    expect(knownState('signing')).toBe(true);
    expect(knownState('recorded_by_county')).toBe(false);
    expect(PAGE).toContain('knownState(detail.state.state)');
    expect(PAGE).toContain('does not recognise yet');
  });
});

describe('both languages declare the same contract', () => {
  it('the state vocabulary matches DEED_STATES in Python', () => {
    /**
     * The merged tracker declared eleven fields against an endpoint that
     * sent fourteen, and the three it did not declare were the three
     * that mattered. A screen cannot render what it never named, and
     * nothing failed. This is the referee.
     */
    const block = PY.slice(PY.indexOf('DEED_STATES = frozenset({'));
    const python = (block.slice(0, block.indexOf('})')).match(/"([a-z_]+)"/g) || [])
      .map((s) => s.replace(/"/g, ''));
    expect([...DEED_STATES].sort()).toEqual(python.sort());
  });

  it('the action kinds match', () => {
    const block = PY.slice(PY.indexOf('ACTION_KINDS = frozenset({'));
    const python = (block.slice(0, block.indexOf('})')).match(/"([a-z_]+)"/g) || [])
      .map((s) => s.replace(/"/g, ''));
    expect([...ACTION_KINDS].sort()).toEqual(python.sort());
  });

  it('the payload key set matches', () => {
    const block = PY.slice(PY.indexOf('DEED_PAGE_KEYS = frozenset({'));
    const python = (block.slice(0, block.indexOf('})')).match(/"([a-z_]+)"/g) || [])
      .map((s) => s.replace(/"/g, ''));
    expect([...DEED_DETAIL_KEYS].sort()).toEqual(python.sort());
  });
});

describe('the ready state offers both, ranked (owner-ruled)', () => {
  it('the page renders a secondary action when there is one', () => {
    /**
     * The first build offered review alone, and starting a signing was
     * reachable only through the share modal's "did you mean a
     * signing?" switch — FLOW1 item 1's affordance problem one screen
     * over. "One obvious action" means do not present a wall of equal
     * choices, not hide the second most common move.
     */
    expect(PAGE).toContain('detail.state.secondary_action');
    expect(PAGE).toContain('data-testid="secondary-action"');
    expect(PAGE).toContain("act(detail.state.secondary_action!.kind)");
  });

  it('and renders it as subordinate, not as a twin', () => {
    // Ranked rather than equal. Two identical buttons is the wall.
    const at = PAGE.indexOf('data-testid="secondary-action"');
    const block = PAGE.slice(at, at + 500);
    expect(block).not.toContain('bg-[#7C4DFF] text-white');
    expect(block).toContain('border-2 border-slate-300');
  });

  it('starting a signing and opening one are different verbs', () => {
    // Collapsing them is how a deed with a live signing gets a second
    // one — CANCEL1 item 4, one screen over.
    expect(PAGE).toContain("kind === 'request_signing'");
    expect(PAGE).toContain("kind === 'open_signing'");
  });

  it('there is no third action, in either language', () => {
    // Singular by construction. A list would grow.
    expect(PAGE).not.toContain('secondary_actions');
    const block = PY.slice(PY.indexOf('STATE_BLOCK_KEYS = frozenset({'));
    expect(block.slice(0, block.indexOf('})'))).toContain('"secondary_action"');
    expect(block.slice(0, block.indexOf('})'))).not.toContain('"secondary_actions"');
  });
});

describe('the matter section stays (a proposed cut was overruled)', () => {
  it('it is still rendered', () => {
    /**
     * The ranking argument for cutting it was accepted; the conclusion
     * was not. An officer arriving cold from a notification is the case
     * this page exists for, and "which file is this on" is the question
     * she has before she has any other.
     *
     * The success page's matter block is not a substitute: it serves
     * somebody who just MADE the deed. This serves somebody RETURNING.
     */
    expect(PAGE).toContain('data-testid="matter"');
    expect(PAGE).toContain('detail.matter.documents.map');
  });

  it('and it links each sibling to its own deed page', () => {
    // The orphan resolved one more way: a file is only navigable if the
    // documents on it are.
    expect(PAGE).toContain('href={`/deeds/${d.id}`}');
  });

  it('the ruling is recorded where somebody would go to cut it', () => {
    // A decision that lives only in a PR body is one the next reader
    // re-derives from scratch.
    const raw = read('app', 'deeds', '[id]', 'page.tsx');
    expect(raw).toContain('OWNER-RULED TO STAY');
  });
});

describe('the activity keeps the distinction the API went to trouble over', () => {
  it('an event and a derived timestamp are told apart', () => {
    expect(isRecordedAct({ kind: 'event' })).toBe(true);
    expect(isRecordedAct({ kind: 'derived' })).toBe(false);
  });

  it('and the page renders them with different weight', () => {
    // If the screen flattens them, the API's structural split bought
    // nothing — and the first person to add "expired" will do it because
    // everything already looked like an event.
    expect((PAGE.match(/isRecordedAct\(e\)/g) || []).length).toBeGreaterThan(1);
  });

  it('an empty feed says nothing happened rather than inventing', () => {
    expect(PAGE).toContain('Nothing recorded on this deed yet');
  });
});

describe('the participants split', () => {
  it('two headings, and the document one carries no action', () => {
    expect(PAGE).toContain('On the document');
    expect(PAGE).toContain('Working on it');
    const at = PAGE.indexOf('data-testid="on-the-document"');
    expect(at).toBeGreaterThan(-1);
    const block = PAGE.slice(at, at + 600);
    expect(block).not.toContain('onClick');
    expect(block).not.toContain('href');
  });

  it('the signing modal is seeded from the list that cannot hold contacts', () => {
    // Names only — and specifically the on-the-document names, which are
    // structurally incapable of carrying a way to reach anybody.
    expect(PAGE).toContain('suggestedSigners={(detail?.on_the_document || []).map((p) => p.name)}');
  });
});

describe('the orphan is resolved', () => {
  it('Past Deeds links every row to its deed', () => {
    expect(PAST_DEEDS).toContain('href={`/deeds/${deed.id}`}');
  });

  it('the dashboard queue lands on the deed, not the tracker', () => {
    expect(DASHBOARD).toContain('router.push(`/deeds/${r.deed_id}`)');
  });

  it('idle drafts still go straight to the builder', () => {
    // Deliberate: a draft has exactly one action, and the deed page
    // would offer that same action one navigation later.
    expect(DASHBOARD).toContain('?resume=${r.id}`)');
  });

  it("#178's Share fix is reachable — the dialog opens in place", () => {
    expect(PAGE).toContain('<ShareForReviewModal');
    expect(PAGE).toContain('onSwitchToSigning');
    // Not a navigation to another screen to ask the same question again.
    expect(PAGE).not.toContain('/past-deeds?id=');
  });
});

describe('the agenda panel collapsed to a link', () => {
  it('the row navigates instead of expanding', () => {
    expect(AGENDA).toContain('href={`/deeds/${row.deed_id}`}');
    expect(AGENDA).not.toContain('<SigningDetail');
    expect(AGENDA).not.toContain('aria-expanded');
  });

  it('state, summary and the stuck marking stay inline', () => {
    // These are what scanning across every file needs, and that is the
    // question this list can answer and the deed page cannot.
    expect(AGENDA).toContain('{row.summary}');
    expect(AGENDA).toContain('Gone quiet');
    expect(AGENDA).toContain('STATE_LABEL[row.state]');
  });

  it('cancelling MOVED rather than disappearing', () => {
    /**
     * The named cost — cancel goes from one click to navigate-plus-click
     * — was accepted. Cancel ceasing to exist was not, and deleting the
     * panel without a home for it would have done exactly that.
     *
     * One component, rendered in the new place. Not a second copy.
     */
    const detail = read('features', 'signing', 'SigningDetail.tsx');
    expect(detail).toContain('export function SigningDetail');
    expect(detail).toContain('Cancel this signing request');
  });
});
