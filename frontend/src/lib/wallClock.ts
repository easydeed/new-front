/**
 * `withOffset` — a wall-clock string, stamped with the browser's zone.
 *
 * ═══ WHY THIS EXISTS AT ALL ═══
 *
 * An `<input type="datetime-local">` yields `2026-09-01T10:00`: a time
 * with no zone attached. Sending that to the server makes the server
 * guess, and the guess is UTC. NOTARY1 shipped exactly that, and the
 * consequence was not an off-by-one in a log — it was a calendar file up
 * to eight hours out, on the one artifact whose entire job is to be at
 * the right moment. `parse_windows()` now REFUSES a naive time rather
 * than assuming one, so this is the client's half of that contract.
 *
 * ═══ WHY IT IS A MODULE ═══
 *
 * FLOW1 item 7 needed it in a second place — the officer's dispatch form
 * — and the first instinct was to copy the eight lines. That is how
 * `phoneSearchKey` came to be wrong in one language and right in the
 * other, and how the partner category list ended up with four
 * divergent copies. A rule that exists twice is a rule that will
 * eventually disagree with itself.
 */

/**
 * Append the local UTC offset to a `datetime-local` value.
 *
 * An unparseable value is returned UNCHANGED rather than defaulted: the
 * server refuses a time it cannot read, which is a better outcome than a
 * client quietly inventing one.
 */
export function withOffset(local: string): string {
  if (!local) return local;
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return local;
  const minutes = -parsed.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
