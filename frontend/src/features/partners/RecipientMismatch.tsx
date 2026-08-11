'use client';

/**
 * FLOW1 items 1 and 5 — "you picked somebody filed under a different
 * category" said out loud, once, in one component.
 *
 * ═══ THE FAILURE THIS ANSWERS ═══
 *
 * The owner sent a notary a REVIEW request. Every piece of that worked as
 * built: the Share icon opens the review flow, the review flow's picker
 * lists every partner with nothing to distinguish them, so the notary
 * arrived at a page with Approve and Request Changes buttons and no way
 * to say when she was free. The defect was that **the review path never
 * asked who it was talking to.**
 *
 * ═══ SUGGEST, NEVER HIDE — AND NEVER BLOCK ═══
 *
 * The picker has always sorted a suggested category first without hiding
 * anybody, because a mobile notary filed under "other" three months ago
 * is still the person she wants. That stays. What is added is a NOTICE
 * after the pick: the flows are not interchangeable, so choosing across
 * them should be a thing she did on purpose rather than a thing she
 * discovers from the recipient's confused reply.
 *
 * Both notices are dismissible and neither disables the submit button.
 * A picker that knows better than the officer about her own contacts is
 * a picker she works around.
 *
 * ═══ THE DOCTRINE CONSTRAINT ON THE WORDING ═══
 *
 * `partnerRegistry.ts` states it and it is load-bearing here:
 *
 *   "A partner's category says how the officer FILES them. It says
 *    nothing about their authority, their licensure, or what they are
 *    permitted to do, and no code may read it as though it did."
 *
 * So the copy is a FILING OBSERVATION and never a capability claim.
 * "Nora is filed as a notary" is a true statement about her rolodex.
 * "Marcus is not a notary" would be a statement about Marcus that this
 * product has no basis for and no business making — he may hold a
 * commission and be filed under his title company. Every string below
 * says *filed*, and the pin in `flowInterrupts.test.ts` keeps it that
 * way.
 */

import { AlertCircle, X } from 'lucide-react';
import { categoryLabel } from '@/lib/partnerRegistry';
import type { Recipient } from './PartnerRecipientPicker';

/**
 * Did she pick somebody filed under a category this flow did not expect?
 *
 * `null` for a typed address on purpose: a one-off recipient has no
 * filing, so there is nothing to observe and nothing to interrupt. And
 * `undefined` expectation means the flow has no expectation.
 */
export function filedCategoryOf(recipient: Recipient | null): string | null {
  return recipient?.category || null;
}

export function RecipientMismatchNotice({
  recipient,
  headline,
  question,
  actions,
  onDismiss,
}: {
  recipient: Recipient;
  /** One sentence stating the FILING. Never a capability claim. */
  headline: string;
  /** What she might have meant instead. */
  question: string;
  actions: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{headline}</p>
          <p className="mt-0.5 text-amber-800">{question}</p>
          <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** "Nora Vasquez is filed as a Notary." — the shared sentence, so the
 * two flows cannot drift into describing a filing two different ways. */
export function filedAsSentence(recipient: Recipient, category: string): string {
  const who = recipient.name?.trim() || recipient.email;
  return `${who} is filed as a ${categoryLabel(category)}.`;
}
