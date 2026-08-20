/**
 * The time-of-day greeting, and the one thing that survived `AIGreeting`.
 *
 * GUIDE1: `AIGreeting.tsx` held a component with no render site and this
 * helper, which DASH3 uses on the dashboard headline. The component is
 * gone; the helper was never about a model and does not belong in a file
 * named for one.
 *
 * §14.3 — ONE DECLARATION. This is the only place the product decides
 * what hour it is in words, which is why DASH3 imported it rather than
 * writing a second `if (hour < 12)`.
 *
 * MOVED BY COPYING, THEN CHECKED AGAINST THE ORIGINAL — and the check
 * earned its keep: I retyped the afternoon boundary as 18 when the
 * original is 17, which would have moved "Good evening" back an hour for
 * everyone and broken nothing that any test or type could see. A move is
 * not a rename; it is a rewrite unless the bytes are compared.
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
