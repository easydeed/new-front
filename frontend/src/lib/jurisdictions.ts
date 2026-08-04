/**
 * T-2 — THE JURISDICTIONS REGISTRY. One place identity, one set of facts.
 *
 * ═══ WHY THIS EXISTS ═══
 *
 * Three separate defects, all from the same root: place was a STRING that
 * code pattern-matched, rather than an IDENTITY the system looked up.
 *
 * 1. SUBSTRING MATCHING PUT WRONG DOLLARS ON A DECLARATION.
 *    dttCalc matched with `cityLower.includes(known)`, so:
 *      South San Francisco (San Mateo County) → matched "san francisco"
 *        → charged $7.50/$1,000. On a $1M transfer, $7,500 of invented tax.
 *      East Los Angeles (UNINCORPORATED) → matched "los angeles"
 *        → charged the City of LA's $4.50. Unincorporated areas levy no
 *          municipal transfer tax at all.
 *      Lake Los Angeles (unincorporated) → same.
 *      West Sacramento (Yolo County) → charged Sacramento's rate.
 *
 * 2. THE A2 FORK WAS NEVER FULLY KILLED. A2 unified the partner API's
 *    table with dttCalc's and pinned them — but a THIRD copy survived in
 *    services/propertyPrefill.ts with a DIFFERENT list of 27 cities. It
 *    included Hayward, Richmond, Alameda, Palo Alto and a dozen more that
 *    dttCalc has never heard of, and it OMITTED Inglewood, Long Beach and
 *    Pasadena, which dttCalc rates. Because that list decides `areaType`,
 *    a Long Beach property prefilled as "unincorporated" and its city tax
 *    was skipped entirely — the mirror image of defect 1, undercharging
 *    instead of over.
 *
 * 3. TWO DIFFERENT FACTS WERE ONE FIELD. `inferDTTAreaType` returned
 *    "unincorporated" for any city not on its list — so Glendale, an
 *    incorporated city, was labelled unincorporated because it happens to
 *    levy no DTT. Incorporation and taxation are independent facts and
 *    are separate fields here.
 *
 * ═══ THE RULE THAT REPLACES THEM ═══
 *
 * Matching is EXACT on a normalized name. Never substring. A place we do
 * not have is UNKNOWN, and unknown surfaces as "rate unknown — enter
 * manually". It is never silently zero and never a guessed rate: a $0 we
 * invented is the same class of error as a $7,500 we invented, it just
 * costs the other party.
 *
 * ═══ RATE SEMANTICS — read before adding an entry ═══
 *
 *   dttRatePer1000 > 0    the place levies its own DTT at this rate
 *   dttRatePer1000 === 0  AFFIRMATIVE: we know it levies none
 *   dttRatePer1000 null   we do not know. The UI asks the officer.
 *
 * The difference between `0` and `null` is the whole point. Absence of
 * knowledge must not render as a fact.
 *
 * ═══ RATE PROVENANCE — OWNER'S ESCROW REVIEW PENDING ═══
 *
 * Every non-null rate below is carried forward UNCHANGED from the
 * pre-T-2 tables. None of them were verified by this ticket. They are
 * approximations of tiered municipal schedules and remain the owner's
 * escrow review to confirm against current published schedules — the
 * open ledger item. Entries marked `null` are the honest gaps that
 * review should fill; they are not omissions to be "fixed" by guessing.
 */

export interface RecorderPrefs {
  /** Free-text notes an officer would otherwise keep in their head. */
  notes?: string;
}

export interface PcorRouting {
  /** Which office receives the PCOR filed concurrently with the deed. */
  office: string;
  notes?: string;
}

export interface County {
  name: string;
  recorderPrefs?: RecorderPrefs;
  pcorRouting?: PcorRouting;
}

export interface Place {
  /** Canonical display name. */
  city: string;
  county: string;
  incorporated: boolean;
  /** See RATE SEMANTICS above. `null` means unknown, never zero. */
  dttRatePer1000: number | null;
}

/** The merged view a caller gets back: place facts + its county's facts. */
export interface Jurisdiction extends Place {
  recorderPrefs?: RecorderPrefs;
  pcorRouting?: PcorRouting;
}

export const COUNTIES: Record<string, County> = {
  'los angeles': {
    name: 'Los Angeles',
    // The registry's first pcorRouting datum, and a real piece of local
    // knowledge: LA County's PCOR goes to the Registrar-Recorder/County
    // Clerk with the deed — not to the Assessor separately. It is why the
    // county publishes the form at lavote.gov rather than on the
    // assessor's site, which surprises officers new to the county.
    pcorRouting: {
      office: 'Los Angeles County Registrar-Recorder/County Clerk',
      notes: 'Filed concurrently with the deed at the recorder, not sent separately to the Assessor.',
    },
  },
};

/**
 * LA County first — launch scope. Non-LA entries exist only because they
 * already carried rates before T-2 and dropping them would have been a
 * silent behavior change.
 */
export const PLACES: Place[] = [
  // ── Los Angeles County — incorporated, rate carried forward ─────────
  { city: 'Los Angeles', county: 'Los Angeles', incorporated: true, dttRatePer1000: 4.50 },
  { city: 'Culver City', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Santa Monica', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Redondo Beach', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Inglewood', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Long Beach', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Pasadena', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Pomona', county: 'Los Angeles', incorporated: true, dttRatePer1000: 2.20 },

  // ── Los Angeles County — UNINCORPORATED. Structural fact, not a rate
  //    lookup: unincorporated territory levies no municipal transfer tax,
  //    so 0 here is affirmative knowledge. Both of these were charged the
  //    City of Los Angeles' $4.50 by substring matching.
  { city: 'East Los Angeles', county: 'Los Angeles', incorporated: false, dttRatePer1000: 0 },
  { city: 'Lake Los Angeles', county: 'Los Angeles', incorporated: false, dttRatePer1000: 0 },

  // ── Collision guards: real places whose names CONTAIN a rated place's
  //    name. Listed with null rather than omitted, so the lookup answers
  //    "I know this place and I do not know its rate" instead of falling
  //    through to a neighbour's number.
  { city: 'South Pasadena', county: 'Los Angeles', incorporated: true, dttRatePer1000: null },
  { city: 'South San Francisco', county: 'San Mateo', incorporated: true, dttRatePer1000: null },
  { city: 'West Sacramento', county: 'Yolo', incorporated: true, dttRatePer1000: null },

  // ── Outside LA County — rates carried forward from the pre-T-2 table ─
  { city: 'San Francisco', county: 'San Francisco', incorporated: true, dttRatePer1000: 7.50 },
  { city: 'Oakland', county: 'Alameda', incorporated: true, dttRatePer1000: 15.00 },
  { city: 'Berkeley', county: 'Alameda', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'San Jose', county: 'Santa Clara', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Sacramento', county: 'Sacramento', incorporated: true, dttRatePer1000: 2.20 },
  { city: 'Riverside', county: 'Riverside', incorporated: true, dttRatePer1000: 2.20 },

  // ── Recovered from the propertyPrefill fork (defect 2). That list
  //    asserted these levy their own DTT; dttCalc had never heard of them
  //    and charged $0. One of the two was wrong and we do not know which
  //    rate is right, so they are `null` — the honest state — and they are
  //    the most useful rows for the owner's escrow review to fill in.
  { city: 'Hercules', county: 'Contra Costa', incorporated: true, dttRatePer1000: null },
  { city: 'Hayward', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'Richmond', county: 'Contra Costa', incorporated: true, dttRatePer1000: null },
  { city: 'Alameda', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'Albany', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'Emeryville', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'Piedmont', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'San Leandro', county: 'Alameda', incorporated: true, dttRatePer1000: null },
  { city: 'San Pablo', county: 'Contra Costa', incorporated: true, dttRatePer1000: null },
  { city: 'Mountain View', county: 'Santa Clara', incorporated: true, dttRatePer1000: null },
  { city: 'Palo Alto', county: 'Santa Clara', incorporated: true, dttRatePer1000: null },
  { city: 'Petaluma', county: 'Sonoma', incorporated: true, dttRatePer1000: null },
  { city: 'Santa Rosa', county: 'Sonoma', incorporated: true, dttRatePer1000: null },
  { city: 'Sebastopol', county: 'Sonoma', incorporated: true, dttRatePer1000: null },
  { city: 'Cotati', county: 'Sonoma', incorporated: true, dttRatePer1000: null },
  { city: 'Cloverdale', county: 'Sonoma', incorporated: true, dttRatePer1000: null },
];

/**
 * Normalize for comparison ONLY — never for display. Case, surrounding
 * whitespace and internal runs collapse; nothing else. Deliberately not
 * stripping direction words ("South", "West"), because those words are
 * the entire difference between two different cities in two different
 * counties.
 */
export function normalizePlace(name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const BY_NAME = new Map<string, Place>(PLACES.map((p) => [normalizePlace(p.city), p]));

export type JurisdictionLookup =
  | { known: true; jurisdiction: Jurisdiction }
  | { known: false; place: string };

/**
 * EXACT lookup. A place we do not hold comes back `known: false`, and the
 * caller must ask rather than assume — that is the contract.
 */
export function lookupJurisdiction(city: string | null | undefined): JurisdictionLookup {
  const key = normalizePlace(city || '');
  const place = key ? BY_NAME.get(key) : undefined;
  if (!place) return { known: false, place: (city || '').trim() };
  const county = COUNTIES[normalizePlace(place.county)];
  return {
    known: true,
    jurisdiction: {
      ...place,
      recorderPrefs: county?.recorderPrefs,
      pcorRouting: county?.pcorRouting,
    },
  };
}

export type CityRate =
  /** Known and levies its own DTT. */
  | { state: 'rated'; ratePer1000: number }
  /** Known and affirmatively levies none. */
  | { state: 'none' }
  /** We do not know — the officer is asked. NEVER rendered as a number. */
  | { state: 'unknown'; place: string };

export function cityDttRate(city: string | null | undefined): CityRate {
  const hit = lookupJurisdiction(city);
  // Narrow explicitly: `hit.place` only exists on the not-known arm, and
  // the discriminant has to be read as `=== false` for TS to see it.
  if (hit.known === false) return { state: 'unknown', place: hit.place };
  const rate = hit.jurisdiction.dttRatePer1000;
  if (rate === null) return { state: 'unknown', place: hit.jurisdiction.city };
  if (rate === 0) return { state: 'none' };
  return { state: 'rated', ratePer1000: rate };
}

/** Incorporation is its OWN fact — not "does it tax". See defect 3. */
export function isIncorporated(city: string | null | undefined): boolean | null {
  const hit = lookupJurisdiction(city);
  return hit.known ? hit.jurisdiction.incorporated : null;
}
