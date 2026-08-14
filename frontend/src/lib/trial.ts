/**
 * The trial length, stated once on this side of the wire.
 *
 * ═══ WHY IT MOVED OUT OF page.tsx ═══
 *
 * It lived as a `const` in the landing page, with a comment saying "one
 * number, stated once per side" — and that was true while the landing
 * page was the only surface that mentioned a trial.
 *
 * The day-one dashboard mentions it too. Retyping 14 there would have
 * made it twice on this side, which is the exact defect TRIAL1's mirror
 * exists to catch: an advertised length and a charged length that
 * differ are discovered by the customer, on the day they are charged.
 *
 * So the number has one home and both surfaces import it.
 * `test_trial1_paid_path.py` reads THIS file and compares it with the
 * server's `TRIAL_PERIOD_DAYS`. Changing it here without changing the
 * server fails that gate, which is the whole arrangement.
 */
export const TRIAL_DAYS = 14
