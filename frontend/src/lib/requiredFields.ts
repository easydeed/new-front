/**
 * REQUIRED1 — what a valid instrument must carry. The TypeScript reader.
 *
 * `backend/services/required_fields.json` is the AUTHORITY. This module
 * and `backend/services/required_fields.py` both read it, and both test
 * suites assert against it. Neither implementation is the source of
 * truth — the arrangement `vestingSplit.ts` already uses, for the reason
 * stated there: two implementations of one rule drift, and that is not a
 * risk, it is a schedule.
 *
 * ═══ THREE DEFINITIONS WERE LIVE AT ONCE ═══
 *
 *     deeds_crud.py     grantor, grantee, legal description
 *     partner API       + transfer_tax, vesting per type
 *     this browser gate + vesting AND a transfer-tax decision
 *
 * `POST /deeds` accepted an instrument this gate refuses to generate and
 * the partner API rejects. The gate runs in the browser, so anything
 * calling the endpoint directly skipped both legal decisions.
 *
 * Owner ruling: the stricter set wins.
 */
import corpus from '../../../backend/services/required_fields.json';

export type Population = 'substance' | 'decision';

export interface Requirement {
  id: string;
  field: string;
  label: string;
  population: Population;
  section: string;
  unless?: string;
}

type Corpus = {
  families: Record<string, { note?: string; required: Requirement[] }>;
  types: Record<string, Record<string, unknown>>;
};

const CORPUS = corpus as unknown as Corpus;

/** Per-instrument exceptions — `fixed_vesting` and friends. */
export function typeFlags(deedType: string): Record<string, unknown> {
  const types = CORPUS.types || {};
  return (types[(deedType || '').trim()] as Record<string, unknown>) || {};
}

/** What this instrument must carry, exceptions already applied. */
export function requirements(family: string, deedType: string): Requirement[] {
  const fam = CORPUS.families?.[family];
  if (!fam) return [];
  const flags = typeFlags(deedType);
  return fam.required.filter((r) => {
    // `unless` names a flag that REMOVES the requirement. A fixed-vesting
    // form does not default its vesting — its template refuses to read
    // one, so demanding it would demand a field with nowhere to go.
    if (r.unless && flags[r.unless]) return false;
    return true;
  });
}

/**
 * Is this field answered?
 *
 * The decision fields are not strings. A transfer tax declared as "not
 * exempt, full value" IS a decision — she said so — and treating a falsy
 * value as absent would re-ask a question she already answered.
 */
export function isPresent(field: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (field === 'parties') {
    return typeof value === 'object'
      && Object.values(value as Record<string, unknown>)
        .some((v) => typeof v === 'string' && v.trim() !== '');
  }
  if (field === 'dtt') {
    if (typeof value !== 'object') return String(value).trim() !== '';
    const d = value as Record<string, unknown>;
    return Boolean(d.isExempt || d.is_exempt)
      || String(d.basis ?? '').trim() !== ''
      || String(d.transferValue ?? d.transfer_value ?? '').trim() !== '';
  }
  return String(value).trim() !== '';
}

/**
 * The corpus names a field once; the two shapes that carry it spell two
 * of them differently. Builder state says `grantor`; a deed row says
 * `grantor_name`. Mirrors `ROW_ALIASES` in `required_fields.py`, and a
 * pin holds the two equal.
 */
const ROW_ALIASES: Record<string, string[]> = {
  grantor: ['grantor', 'grantor_name'],
  grantee: ['grantee', 'grantee_name'],
};

function read(field: string, data: Record<string, unknown>): unknown {
  for (const name of ROW_ALIASES[field] ?? [field]) {
    if (name in data) return data[name];
  }
  return undefined;
}

/** Every requirement this data does not yet satisfy. */
export function missingRequired(
  family: string,
  deedType: string,
  data: Record<string, unknown>,
): Requirement[] {
  return requirements(family, deedType)
    .filter((r) => !isPresent(r.field, read(r.field, data)));
}
