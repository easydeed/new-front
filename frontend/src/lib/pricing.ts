/**
 * PRICING1 — the ONE place a price is written.
 *
 * ═══ WHY A CONFIG AND NOT TWO LISTS ═══
 *
 * The same plan was advertised at two prices on two surfaces at the same
 * time: the marketing page said Professional **$149/month**, the billing
 * tab said **$29**. Neither was what Stripe would have charged, because
 * the amount actually billed comes from a Stripe price ID in an
 * environment variable and had no relationship to either number.
 *
 * Three sources of truth for one price is not a typo, it is a structure —
 * and the structure produces a customer who is quoted one figure and
 * charged another. So the surfaces derive, and a pin asserts that no
 * second hardcoded price string exists anywhere in the product.
 *
 * ═══ THE PRICE, AND THE REASONING ═══
 *
 * Professional is **$99/user/month**, owner-ruled.
 *
 *   - The category floor for small-firm title tools is ~$79–$149 per
 *     user per month. Mid-tier runs ~$200. SoftPro-class is $500+.
 *   - Escrow offices already bill around **$75 per document** for
 *     standalone doc prep, so $99 is under one and a half document fees
 *     for a 21-instrument catalog.
 *   - $29 signalled hobbyware to a professional buyer. $149 invited
 *     procurement. $99 is a number one person can approve.
 *
 * ═══ WHAT IS SOLD AND WHAT IS NOT ═══
 *
 * `purchasable: false` is load-bearing, not decorative. Business is
 * priced and visible because knowing where the ladder goes is part of
 * evaluating the rung you are on — but it cannot be bought, because the
 * multi-user org model it implies (RED-S5) is deferred by decision and
 * does not exist. `deeds` carries one `user_id` and every query is
 * scoped to it. Selling a seat we cannot create is the failure mode this
 * whole engagement keeps removing.
 *
 * Enterprise was deleted outright. Its differentiators were SSO/SAML and
 * custom branding: zero files, not a stub, and now banned outright by
 * `scripts/check_banned_claims.py`.
 */

import { INSTRUMENT_COUNT } from './formRegistry';

export type TierKey = 'free' | 'professional' | 'business';

export interface Tier {
  key: TierKey;
  name: string;
  /** USD per user per month. The single source; surfaces format it. */
  priceMonthly: number;
  cadence: string;
  /** False = shown, not sellable. Nothing may render a buy control. */
  purchasable: boolean;
  badge?: string;
  blurb: string;
  features: string[];
}

const TRUE_OF_EVERY_TIER = [
  `${INSTRUMENT_COUNT} recordable California instruments`,
  'PCOR and BOE forms filled from the deed',
  'Every field confirmed by you before it prints',
  'Immutable, hash-stamped PDFs',
  'Corrections with full lineage to the superseded document',
];

export const TIERS: Tier[] = [
  {
    key: 'free',
    name: 'Free',
    priceMonthly: 0,
    cadence: 'forever',
    purchasable: true,
    blurb: 'The whole product, on real files. Nothing is held back.',
    // Accurate as of PRICING1: nothing in the product is gated by plan.
    // check_plan_limits has no call sites and plan_limits is never
    // seeded, so "the full product" is a description, not a promise we
    // are hoping to keep.
    features: TRUE_OF_EVERY_TIER,
  },
  {
    key: 'professional',
    name: 'Professional',
    priceMonthly: 99,
    cadence: '/user/month',
    purchasable: true,
    blurb: 'For the officer who drafts every day.',
    features: [...TRUE_OF_EVERY_TIER, 'Priority support'],
  },
  {
    key: 'business',
    name: 'Business',
    priceMonthly: 249,
    cadence: '/month',
    purchasable: false,
    badge: 'Coming soon',
    blurb:
      'Shared files across an office — an assistant preps, an officer reviews, ' +
      'and cover carries when someone is out.',
    features: [
      ...TRUE_OF_EVERY_TIER,
      'Shared matter list across the office',
      'Priority support',
    ],
  },
];

export const PROFESSIONAL = TIERS.find((t) => t.key === 'professional')!;

/**
 * `$99/user/month` / `$249/month` — the price WITH the unit it is charged in.
 *
 * ═══ HOME2 ═══
 *
 * `priceLabel` returns the figure alone, and the surfaces that render two
 * tiers side by side were showing "$99" beside "$249" with no unit on
 * either — while the registry itself says one is per USER per month and
 * the other is per month. A reader comparing them was comparing different
 * things and had nothing on screen telling them so.
 *
 * The cadence has always been on the tier. Nothing was missing except a
 * formatter that used it.
 */
export function priceWithCadence(tier: Tier): string {
  return tier.priceMonthly === 0 ? priceLabel(tier) : `${priceLabel(tier)}${tier.cadence}`;
}

/** `$0` / `$99`. The only place a dollar sign meets a plan price. */
export function priceLabel(tier: Tier): string {
  return `$${tier.priceMonthly}`;
}

export function tier(key: TierKey): Tier {
  const found = TIERS.find((t) => t.key === key);
  if (!found) throw new Error(`unknown pricing tier: ${key}`);
  return found;
}
