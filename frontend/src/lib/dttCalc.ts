/**
 * X2.3 — documentary transfer tax breakdown (county + city portions).
 *
 * One opaque total hid what was being declared. And the old inline math
 * fabricated a generic $2.20/$1,000 "city tax" for ANY city — including
 * cities with no municipal transfer tax at all — a wrong number headed
 * for a legal declaration. City portion now applies only to cities on
 * the own-DTT list.
 *
 * RATE PROVENANCE (owner/legal to verify against current schedules):
 * county $1.10/$1,000 (R&T §11911). City rates are APPROXIMATIONS of
 * tiered schedules: LA $4.50, SF $7.50, Oakland $15.00, other listed
 * cities $2.20 per $1,000.
 */
import type { DTTData } from '@/types/builder';

// Cities with their own documentary transfer tax.
export const CITIES_WITH_OWN_DTT = [
  'los angeles',
  'san francisco',
  'oakland',
  'berkeley',
  'san jose',
  'sacramento',
  'riverside',
  'pomona',
  'culver city',
  'santa monica',
  'redondo beach',
  'inglewood',
  'long beach',
  'pasadena',
];

export interface DttBreakdown {
  county: string;
  /** null when the city levies no transfer tax of its own. */
  city: string | null;
  total: string;
}

export function computeDttBreakdown(value: DTTData | null): DttBreakdown | null {
  if (!value || value.isExempt || !value.transferValue) return null;

  const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  const countyTax = (amount / 1000) * 1.1;

  let cityTax = 0;
  const cityLower = (value.cityName || '').toLowerCase();
  const hasOwnDtt = CITIES_WITH_OWN_DTT.some((c) => cityLower.includes(c));
  if (value.areaType === 'city' && hasOwnDtt) {
    if (cityLower.includes('los angeles')) {
      cityTax = (amount / 1000) * 4.5;
    } else if (cityLower.includes('san francisco')) {
      cityTax = (amount / 1000) * 7.5;
    } else if (cityLower.includes('oakland')) {
      cityTax = (amount / 1000) * 15.0;
    } else {
      cityTax = (amount / 1000) * 2.2;
    }
  }

  return {
    county: countyTax.toFixed(2),
    city: cityTax > 0 ? cityTax.toFixed(2) : null,
    total: (countyTax + cityTax).toFixed(2),
  };
}
