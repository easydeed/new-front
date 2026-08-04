/**
 * X2.3 — documentary transfer tax breakdown (county + city portions).
 *
 * T-2: the city table and its matching moved to lib/jurisdictions.ts.
 * This file computes; the registry knows places. The old matcher here was
 * `cityLower.includes(known)`, which charged South San Francisco the City
 * of San Francisco's $7.50 and charged unincorporated East Los Angeles
 * the City of LA's $4.50 — read jurisdictions.ts for the full account.
 *
 * RATE PROVENANCE moved with the rates. County $1.10/$1,000 (R&T §11911)
 * stays here because it is statewide, not a place fact — and it too is
 * the owner's escrow review to confirm.
 */
import type { DTTData } from '@/types/builder';
import { cityDttRate, PLACES } from '@/lib/jurisdictions';

/**
 * Back-compat export: the names of places that levy their own DTT,
 * DERIVED from the registry rather than maintained beside it. A second
 * hand-kept list is exactly how the A2 fork survived in a third file.
 */
export const CITIES_WITH_OWN_DTT: string[] = PLACES
  .filter((p) => p.dttRatePer1000 !== null && p.dttRatePer1000 > 0)
  .map((p) => p.city.toLowerCase());

export interface DttBreakdown {
  county: string;
  /** null when the city levies no transfer tax of its own. */
  city: string | null;
  total: string;
  /**
   * T-2. Set when we do not KNOW the city's rate — distinct from knowing
   * it is zero. The UI must ask rather than render a number; a $0 we
   * invented is the same class of error as a $7,500 we invented.
   */
  cityRateUnknown?: boolean;
  /** The place whose rate is unknown, for the officer-facing prompt. */
  unknownPlace?: string;
  /**
   * T-2a. A high-value bracket applies and we deliberately did NOT
   * compute a city portion. Carries the measure's NAME and never a rate —
   * tier schedules move (Measure ULA's thresholds adjust annually) and a
   * stale number that looks confident is the failure being avoided.
   */
  cityTierFlag?: { measure: string; threshold: number; boundaries?: number[] };
}

export function computeDttBreakdown(value: DTTData | null): DttBreakdown | null {
  if (!value || value.isExempt || !value.transferValue) return null;

  const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  const countyTax = (amount / 1000) * 1.1;
  let cityTax = 0;
  let cityRateUnknown = false;
  let unknownPlace: string | undefined;
  let cityTierFlag: DttBreakdown['cityTierFlag'];

  // The city portion applies only where the property actually sits in a
  // city. `areaType` remains the officer's statement about the property.
  if (value.areaType === 'city') {
    const rate = cityDttRate(value.cityName, amount);
    if (rate.state === 'tiered') {
      // No city portion computed. The flag is the answer.
      cityTierFlag = {
        measure: rate.measure, threshold: rate.threshold, boundaries: rate.boundaries,
      };
    } else if (rate.state === 'rated') {
      cityTax = (amount / 1000) * rate.ratePer1000;
    } else if (rate.state === 'unknown') {
      cityRateUnknown = true;
      unknownPlace = rate.place;
    }
    // 'none' → cityTax stays 0, which here is a measured zero.
  }

  return {
    county: countyTax.toFixed(2),
    city: cityTax > 0 ? cityTax.toFixed(2) : null,
    total: (countyTax + cityTax).toFixed(2),
    ...(cityRateUnknown ? { cityRateUnknown, unknownPlace } : {}),
    ...(cityTierFlag ? { cityTierFlag } : {}),
  };
}
