/**
 * U3 — autocomplete secondary labels read "City, CA", not the Google mash
 * ("Santa Monica, Los Angeles County, CA, USA"). County and country are
 * noise in a CA-only product; the officer is picking a street address.
 */
export function formatSuggestionSecondary(secondary: string | undefined): string {
  if (!secondary) return '';
  return secondary
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== 'USA' && !/County$/i.test(part))
    .join(', ');
}
