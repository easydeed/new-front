/**
 * The dashboard's accuracy surface, RENDERED.
 *
 * ═══ WHY RENDERED ═══
 *
 * The hero number is the product's promise made countable, and its
 * failure modes are all things a source pin cannot see: a zero drawn
 * before the data arrives, a count that disagrees with the list beneath
 * it, a thumbnail that says settled while the sentence says outstanding.
 *
 * For a page the fix is rendering — the seventh time this suite has
 * needed that rule.
 */
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

import AccuracySection, { checkSentence } from '@/features/dashboard/AccuracySection';
import type { AccuracyCheck } from '@/features/dashboard/AccuracySection';
import ResumeCard from '@/features/dashboard/ResumeCard';
import StartSomethingNew from '@/features/dashboard/StartSomethingNew';

const check = (over: Partial<AccuracyCheck> = {}): AccuracyCheck => ({
  field: 'apn', label: 'APN', population: 'unconfirmed', ...over,
});

describe('the hero number', () => {
  it('never renders a figure it did not receive', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR. A zero drawn while the request is in
     * flight is the same lie as the inverted count, arriving earlier —
     * it tells her nothing is outstanding before anything has been
     * counted.
     */
    const { container } = render(<AccuracySection accuracy={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says how many fields across how many documents', () => {
    render(<AccuracySection accuracy={{
      fields: 7, documents: 4, open_documents: 9,
      items: [{ deed_id: 1, property: '1358 5th St', checks: [check()] }],
    }} />);
    expect(screen.getByTestId('accuracy-figure')).toHaveTextContent('7');
    expect(screen.getByText(/across 4 documents/)).toBeInTheDocument();
  });

  it('says so plainly when nothing is outstanding', () => {
    /** Zero is a real answer once it has been counted — and it is worth
     *  saying, because "no list" and "nothing left" look identical.
     *
     *  Nine open documents and none of them outstanding: the sentence is
     *  EARNED here, which is why the card survives at all. */
    render(<AccuracySection accuracy={{
      fields: 0, documents: 0, open_documents: 9, items: [],
    }} />);
    expect(screen.getByText(/Every field is confirmed on the documents you are still preparing/))
      .toBeInTheDocument();
  });

  it('says nothing about what is or is not waiting', () => {
    /**
     * THE PIN THE AUDIT EARNED.
     *
     * The card read "…Nothing is waiting on your eyes." and rendered
     * directly above "What's waiting", which was listing five items.
     * This module counts FIELDS; the queue counts REQUESTS; a document
     * can be field-perfect and workflow-stuck. Borrowing the other
     * module's vocabulary made a true count into a false claim.
     */
    render(<AccuracySection accuracy={{
      fields: 0, documents: 0, open_documents: 9, items: [],
    }} />);
    expect(document.body.textContent).not.toMatch(/waiting/i);
  });

  it('does not claim to speak for every open document', () => {
    /**
     * The half that was nearly missed. "Every OPEN document" means, in
     * the query, `status NOT IN ('completed','deleted')` — still being
     * PREPARED. To a reader it means "not finished". The audit's
     * document sat in that gap: authoring-complete, so invisible here,
     * and in the queue with an unanswered signing request. The card was
     * excluding it while appearing to speak for everything.
     */
    render(<AccuracySection accuracy={{
      fields: 0, documents: 0, open_documents: 9, items: [],
    }} />);
    expect(document.body.textContent).not.toMatch(/every open document/i);
    expect(document.body.textContent).toMatch(/still preparing/i);
  });

  it('says nothing at all when there are no documents to say it about', () => {
    /**
     * OWNER-RULED, and the reason the field above exists. `documents` is
     * zero in two unrelated situations — every document confirmed, and
     * no documents — and this component was congratulating a brand-new
     * officer for the state of work she had not started.
     *
     * A claim about a set is not a claim when the set is empty.
     */
    const { container } = render(<AccuracySection accuracy={{
      fields: 0, documents: 0, open_documents: 0, items: [],
    }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('withholds rather than guesses when the payload predates the field', () => {
    /** An older server sends no `open_documents`. Falling back to the
     *  old behaviour would restore the vacuous sentence for exactly the
     *  officer it was removed for; withholding costs a true sentence for
     *  a deploy window. */
    const { container } = render(<AccuracySection accuracy={{
      fields: 0, documents: 0, items: [],
    }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('what each check says', () => {
  it('reports a name difference without saying which is right', () => {
    /**
     * §0. Both are legitimate — the record may be stale, she may be
     * conveying from a name it does not carry, or one is a typo.
     */
    const sentence = checkSentence(check({
      field: 'grantor', population: 'disagreement',
      typed: 'MARIA L. RUIZ', record: 'RUIZ, MARIA LUCIA',
    }));
    expect(sentence).toContain('MARIA L. RUIZ');
    expect(sentence).toContain('RUIZ, MARIA LUCIA');
    for (const claim of [/should be/i, /correct/i, /wrong/i, /instead/i]) {
      expect(sentence).not.toMatch(claim);
    }
  });

  it('distinguishes never-answered from not-yet-confirmed', () => {
    /**
     * A blank grantee is a field nobody filled in; an unconfirmed APN is
     * a county value she has not vouched for. Same count, different act,
     * and collapsing them would tell her to type where she should read.
     */
    expect(checkSentence(check({ population: 'substance', label: 'Grantee stated' })))
      .toMatch(/still empty/);
    expect(checkSentence(check({ population: 'unconfirmed' })))
      .toMatch(/not yet confirmed by you/);
    expect(checkSentence(check({ population: 'decision', label: 'Transfer tax decided' })))
      .toMatch(/not chosen yet/);
  });
});

describe('the resume card', () => {
  const target = {
    deed_id: 9, deed_type: 'Interspousal Transfer', property: '4420 Cahuenga Blvd',
    escrow_no: '24-0902',
    checks: [check({ field: 'legal_description', label: 'Legal description',
                     population: 'unconfirmed' }),
             check({ field: 'dtt', label: 'Transfer tax decided',
                     population: 'decision' })],
  };

  it('names the remaining checks rather than only counting them', () => {
    render(<ResumeCard target={target} />);
    expect(screen.getByText(/Legal description — from county records/)).toBeInTheDocument();
    expect(screen.getByText(/Transfer tax decided — not chosen yet/)).toBeInTheDocument();
    expect(screen.getByText(/Continue — 2 checks left/)).toBeInTheDocument();
  });

  it('marks the thumbnail from the same list as the sentences', () => {
    /**
     * The picture and the words cannot disagree, because they are one
     * source. A thumbnail drawn from separate state is a thumbnail that
     * eventually says settled while the line beneath says outstanding.
     */
    render(<ResumeCard target={target} />);
    expect(screen.getByTestId('thumb-legal_description'))
      .toHaveAttribute('data-state', 'outstanding');
    expect(screen.getByTestId('thumb-dtt'))
      .toHaveAttribute('data-state', 'outstanding');
    expect(screen.getByTestId('thumb-grantor'))
      .toHaveAttribute('data-state', 'confirmed');
  });

  it('counts one check in the singular', () => {
    render(<ResumeCard target={{ ...target, checks: [check()] }} />);
    expect(screen.getByText(/Continue — 1 check left/)).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to resume', () => {
    const { container } = render(<ResumeCard target={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('start something new', () => {
  it('orders by what she files and shows the count with its period', () => {
    render(<StartSomethingNew instruments={[
      { deed_type: 'grant-deed', count: 31, period: 'this year' },
      { deed_type: 'interspousal-transfer', count: 14, period: 'this year' },
    ]} />);
    expect(screen.getByText('most used')).toBeInTheDocument();
    expect(screen.getByText('14 this year')).toBeInTheDocument();
  });

  it('offers the catalog on day one instead of an empty list', () => {
    /**
     * A frequency-ordered list is useless before there is any frequency,
     * and must not become the only way in.
     */
    render(<StartSomethingNew instruments={[]} />);
    /* Asserted on the LABEL, not the slug. This read `getByText
       ('grant-deed')` — the pin was holding our storage key as though
       it were the product's vocabulary, so it passed while the screen
       showed her a string she never chose. UX2 item 3 fixed that
       vocabulary on three surfaces; this was the fourth, and its own
       test was pinning the defect in place. */
    expect(screen.getByText('Grant Deed')).toBeInTheDocument();
    expect(screen.queryByText('grant-deed')).not.toBeInTheDocument();
    expect(screen.queryByText('most used')).not.toBeInTheDocument();
  });
});
