import policy from '../../../backend/services/instrument_availability.json';

export const HELD_INSTRUMENTS = Object.entries(policy.held).map(([slug, hold]) => ({ slug, ...hold }));

export function generationHold(deedType: string | undefined | null) {
  const slug = (deedType ?? '').trim().toLowerCase().replace(/_/g, '-');
  return HELD_INSTRUMENTS.find((hold) => hold.slug === slug || hold.aliases.includes(slug));
}

export function canGenerate(deedType: string | undefined | null): boolean {
  return generationHold(deedType) === undefined;
}
