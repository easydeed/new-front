/**
 * DASH-FIX #2 — two modules, two populations, one screen.
 *
 * ═══ THE FINDING, FROM AN EXTERNAL AUDIT ═══
 *
 * "Every field on every open document is confirmed. Nothing is waiting
 * on your eyes." rendered directly above "What's waiting", which was
 * listing five items.
 *
 * Neither module was lying about its own data. They count different
 * things over different sets:
 *
 *   accuracy   FIELDS, over documents where
 *              `status NOT IN ('completed','deleted') AND archived_at IS NULL`
 *   queue      REQUESTS, over signing_requests and deed_shares joined to
 *              deeds with NO status filter at all
 *
 * So a document that is authoring-complete is invisible to the first and
 * present in the second — which is exactly the document the audit found,
 * sitting in the queue with an unanswered signing request while the card
 * above it reported that everything was confirmed.
 *
 * ═══ AND THE SAME SPLIT HID THE #203 RULINGS ═══
 *
 * `ResumeCard` — named checks, thumbnail drawn from the same list —
 * returns null unless the accuracy list has a first row. On an account
 * whose accuracy list was empty it rendered nothing, and a PRE-#203
 * `AICard` filled the space from a THIRD population, saying "You have a
 * deed in progress" and naming neither the document nor what was left.
 *
 * One defect wearing three faces. Fixed together, and pinned together.
 */
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { readFileSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';
import AccuracySection from '../features/dashboard/AccuracySection';
import ResumeCard from '../features/dashboard/ResumeCard';

const SRC = join(__dirname, '..');
const dashboard = () => codeOnly(
  readFileSync(join(SRC, 'app', 'dashboard', 'page.tsx'), 'utf8'));

describe('no module claims an absence of waiting work', () => {
  it('the accuracy card never uses the queue vocabulary', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR.
     *
     * "What's waiting" is the queue's heading. Any sentence in the
     * accuracy module asserting that nothing is waiting is a claim about
     * a population it cannot see — and it renders on the same screen,
     * inches away, as the list contradicting it.
     */
    for (const fields of [0, 3]) {
      const { unmount } = render(<AccuracySection accuracy={{
        fields,
        documents: fields ? 1 : 0,
        open_documents: 4,
        items: fields
          ? [{ deed_id: 1, property: '1358 5th St',
               checks: [{ field: 'apn', label: 'APN', population: 'unconfirmed' }] }]
          : [],
      }} />);
      expect(document.body.textContent).not.toMatch(/nothing is waiting/i);
      unmount();
    }
  });

  it('the sentence is held in one place, so it cannot drift back', () => {
    const src = codeOnly(readFileSync(
      join(SRC, 'features', 'dashboard', 'AccuracySection.tsx'), 'utf8'));
    // Declared as a constant with its reasoning above it, rather than
    // typed inline where the next edit rewrites it without reading why.
    expect(src).toMatch(/const CONFIRMED = /);
    expect(src).not.toMatch(/Nothing is waiting on your eyes/);
  });
});

describe('the resume card takes every document it is given', () => {
  it('names the checks when there are checks (the #203 design)', () => {
    render(<ResumeCard target={{
      deed_id: 7, property: '1358 5th St', deed_type: 'Grant Deed',
      checks: [{ field: 'apn', label: 'APN', population: 'unconfirmed' }],
    }} />);
    expect(screen.getByText(/APN/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 check left/ })).toBeInTheDocument();
  });

  it('handles a draft with nothing outstanding instead of going dark', () => {
    /**
     * The case that was falling through. A fully confirmed but unfinished
     * draft is absent from the accuracy list by construction, so the
     * ruled card had nothing to render and the pre-ruling one spoke
     * instead. It renders now, and it does NOT say "0 checks left".
     */
    render(<ResumeCard target={{
      deed_id: 7, property: '1358 5th St', deed_type: 'Grant Deed', checks: [],
    }} />);
    expect(screen.getByText(/waiting on you to finish it/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/0 checks/);
  });

  it('still renders nothing when there is no document at all', () => {
    const { container } = render(<ResumeCard target={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the pre-#203 card is gone', () => {
  it('leaves no in-progress banner behind the ruled one', () => {
    const src = dashboard();
    expect(src).not.toContain('You have a deed in progress');
    expect(src).not.toContain('AICard');
    expect(() => readFileSync(join(SRC, 'components', 'ui', 'AICard.tsx')))
      .toThrow();
  });

  it('kept the capability it carried', () => {
    /** Deleting the card must not delete resuming a clean draft — that
     *  was Ticket R's, and it moved into ResumeCard rather than out of
     *  the product. */
    expect(dashboard()).toContain('inProgressDeed');
    expect(dashboard()).toContain('checks: [],');
  });

  it('prefers the accuracy row when there is one', () => {
    /** #203's ruling stands wherever it applies: the fallback is a
     *  fallback, not a replacement. */
    const src = dashboard();
    const target = src.slice(src.indexOf('const resumeTarget'));
    expect(target.indexOf('queue?.accuracy?.items[0]') >= 0
        || target.indexOf('queue.accuracy.items[0]') >= 0).toBe(true);
  });
});
