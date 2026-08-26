/**
 * DEED-POLISH #3 — what a collapsed section says it contains.
 *
 * ═══ THE FINDING, AND IT IS THE STRONGEST ONE THIS TICKET PRODUCED ═══
 *
 * The escrow and title-order fields were reported missing. They were not
 * missing. The path is complete and was complete: inputs in
 * `RecordingSection`, through builder state, through `deedPayload`, the
 * generate proxy, `DeedCreate`, the `extras` bucket, `metadata` JSONB,
 * `build_context_from_row`, and out into twenty-four templates — plus the
 * preview. Built, wired, and pinned end to end.
 *
 * The officer who commissioned it could not find it.
 *
 * The fields sit last in the "Recording Info" section, below a `border-t`
 * divider, in an accordion whose collapsed summary read `state.requestedBy`
 * and nothing else. Fill in the requester and the section reports a value —
 * **so it reads as answered.** Nothing on that line says four other fields
 * are in there, two of them blank.
 *
 * **"Built" and "usable" are different claims, and no gate we own can tell
 * them apart, because every one of our checks knows where to look.** A real
 * officer does exactly what the owner did: concludes the feature is absent
 * and works around it.
 *
 * ═══ THE RULE ═══
 *
 * A section summary reports EVERY populated field it holds, not the first
 * one. One field of five, reported alone, is a claim that the section is
 * done.
 *
 * The corollary matters as much: what a summary omits must be visible as an
 * omission. Listing what is filled makes an absent escrow number legible by
 * contrast, from the collapsed state, without expanding and scrolling past
 * a divider.
 */

export interface RecordingSummaryInput {
  requestedBy?: string;
  requestedByAddress?: string;
  /** '' or the requester's name means requester; 'grantee' means grantee. */
  returnTo?: string;
  titleOrderNo?: string;
  escrowNo?: string;
}

/** Shown when the section holds nothing at all — a prompt, not a summary. */
export const RECORDING_EMPTY = 'Who is requesting recording';

/**
 * Every populated field in Recording Info, in the order the section
 * presents them, joined so the collapsed line mirrors what is inside.
 *
 * Reference numbers are NAMED ("Order", "Escrow") rather than shown bare:
 * two unlabelled identifiers side by side are indistinguishable, and the
 * whole point of surfacing them is that the officer can tell at a glance
 * which one she has not entered.
 */
export function recordingSummary(s: RecordingSummaryInput): string {
  const parts: string[] = [];

  if (s.requestedBy?.trim()) parts.push(s.requestedBy.trim());
  if (s.requestedByAddress?.trim()) parts.push(s.requestedByAddress.trim());

  // The mail-to choice is a DECISION and belongs in the summary even though
  // it is a radio rather than a typed value — it changes where a recorded
  // instrument is posted.
  if (s.returnTo === 'grantee') parts.push('returns to grantee');

  if (s.titleOrderNo?.trim()) parts.push(`Order ${s.titleOrderNo.trim()}`);
  if (s.escrowNo?.trim()) parts.push(`Escrow ${s.escrowNo.trim()}`);

  return parts.length ? parts.join(' · ') : RECORDING_EMPTY;
}
