/**
 * What a Past Deeds row offers about signing.
 *
 * ═══ WHY THIS IS A FUNCTION AND NOT A TERNARY IN THE PAGE ═══
 *
 * It was a ternary in the page first, and the pin written for it asserted
 * that the strings "Open signing request" and "/signings?focus=" appeared
 * in the source. Then the probe: `{liveSignings[deed.id] ? (` → `{false ? (`,
 * disabling the feature entirely. **The pin stayed green.** Both strings
 * were still in the file, inside a branch that could never run.
 *
 * That is the "green and meaningless" state this codebase keeps naming,
 * arrived at from a new direction: a string-presence pin cannot tell
 * REACHABLE from PRESENT. `sitexProperty.ts` says the same thing about
 * its own extraction — a rule you can only test through a UI is a rule
 * you do not test.
 *
 * So the decision lives here, where a test can call it with both inputs
 * and read the answer.
 *
 * ═══ THE DECISION ITSELF ═══
 *
 * A deed with a live signing request must not offer to create a second
 * one. Two requests on one deed is three more emails, two notaries who
 * each believe they have the appointment, and two sets of links to
 * whichever signers were invited twice.
 *
 * Which states count as "live" is NOT decided here. That is
 * `services/signing_loop.is_live`, the payload carries the verdict, and
 * this function is handed the already-filtered map.
 */

export interface LiveSigning {
  id: number;
  /** The server's sentence about this request. Rendered verbatim. */
  summary: string;
}

export type SigningRowAction =
  | { kind: 'open'; href: string; label: string; summary: string }
  | { kind: 'create'; label: string };

export function signingRowAction(
  deedId: number,
  live: Record<number, LiveSigning>,
): SigningRowAction {
  const existing = live[deedId];
  if (existing) {
    return {
      kind: 'open',
      href: `/signings?focus=${existing.id}`,
      label: 'Open signing request',
      summary: existing.summary,
    };
  }
  return { kind: 'create', label: 'Request signing' };
}
