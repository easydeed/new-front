/**
 * The sentence the officer reads before she cancels a signing.
 *
 * IT LIVES HERE SO IT CAN BE PINNED, and because a `page.tsx` may export
 * only its default — Next's own type check rejects anything else, which
 * is how this function's first home failed the build.
 *
 * ═══ WHY THE COPY CARRIES THE WEIGHT ═══
 *
 * Cancelling a BOOKED signing is allowed, deliberately and without a
 * state guard (owner-ruled, CANCEL1). A booked signing is the one most
 * likely to need cancelling — the deal falls out, the closing moves, the
 * buyer reschedules — so refusing there would fail the officer at the
 * exact moment she needs the product most.
 *
 * Cancelling a booked signing is not a different capability. It is a
 * heavier moment, and the weight belongs in this sentence rather than in
 * a rule that says no.
 *
 * ═══ AND IT NAMES ITS OBJECT ═══
 *
 * The same rule as the delete confirmation on Past Deeds: a confirm that
 * reads identically every time is the one that gets read past. It
 * confirms that SOMETHING is being cancelled without ever confirming
 * WHICH. So this one names the property, and when a time is agreed it
 * names who agreed and what it costs them.
 *
 * The booked sentence itself comes from the SERVER (`state_label`) and is
 * interpolated verbatim. This file formats no signing time — §13 rule 3:
 * one place turns a scheduling state into English, and it is not a
 * screen.
 */

export interface CancelSubject {
  state: string;
  /** The server's sentence about this request's state. Rendered as-is. */
  summary: string;
  property_address: string | null;
}

export function cancelWarning(subject: CancelSubject, agreed: string[]): string {
  const where = subject.property_address || 'this deed';
  if (subject.state === 'booked') {
    const who = agreed.length ? agreed.join(' and ') : 'everyone involved';
    return `${subject.summary} Cancelling notifies ${who} and voids their links. ${where}.`;
  }
  return `Cancel the signing request for ${where}? Everyone invited is told, `
       + 'and every link they were sent stops working.';
}
