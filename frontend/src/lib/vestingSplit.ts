/**
 * Doctrine A — a vested-owner string is a name PLUS a characterization.
 *
 * THE TYPESCRIPT HALF. `backend/services/vesting_split.py` is the other
 * half, and neither is the authority: `backend/services/vesting_cases.json`
 * is, and both test suites read it. Two implementations of one rule drift;
 * that is not a risk, it is a schedule, and the corpus is the schedule's
 * only known cure.
 *
 * ═══ THE RULE, AND WHERE IT IS WRITTEN ═══
 *
 * `docs/integrations/H1_CONTRACT.md` §2.2, verbatim:
 *
 *     2.2 — Mixed content is emitted split, never whole.
 *     A vested-owner string such as `JOHN DOE AND JANE DOE, HUSBAND AND
 *     WIFE AS JOINT TENANTS` is a name PLUS a legal characterization.
 *     TitleSense emits the parties as facts and the vesting
 *     characterization as a separate interpreted field. TitleSense never
 *     emits the composite string as a single value in a fact position.
 *     The composite may be carried in `verbatim` for audit, flagged
 *     `mixed_content: true`.
 *
 * That is the WIRE law. This module is the same law inside the product on
 * the SiteX path, so the two cannot drift: a rule enforced only at the
 * boundary is a rule the product breaks internally and exports correctly.
 *
 * ═══ WHY THE HALVES ARE DIFFERENT KINDS OF THING ═══
 *
 *   "JOHN A. DOE AND JANE B. DOE"       → a FACT. Who is named on the
 *                                          instrument. Transcription.
 *   "HUSBAND AND WIFE AS JOINT TENANTS" → an INTERPRETATION. How title is
 *                                          held: a legal characterization
 *                                          with consequences for
 *                                          survivorship, severability and
 *                                          the form of the next deed.
 *
 * The county record hands us both welded together and calls the result
 * `OwnerName`. Landing that in `provenance.owner` asks the officer to
 * CONFIRM a legal conclusion using the same amber affordance she uses to
 * confirm an APN — and the confirmation record then shows her accepting a
 * transcription when what she accepted was a characterization.
 *
 * ═══ THE CHARACTERIZATION WE READ IS THE OLD ONE ═══
 *
 * This string describes how the CURRENT owner holds title. It is not how
 * the grantees will hold title under the deed being drafted. It informs
 * that decision and never makes it, which is why the proposal carries a
 * basis line saying so and why nothing is ever pre-selected from it.
 *
 * ═══ WHEN WE CANNOT TELL ═══
 *
 * A string we cannot confidently split is NOT guessed apart and NOT passed
 * through whole into a fact position. The case that forced the rule:
 *
 *     JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN,
 *     AS TENANTS IN COMMON
 *
 * Splitting at the first marker puts MARY ROE inside the characterization
 * and drops a real owner out of the fact position. A missing grantor is
 * worse than an unsplit string, so a name appearing BETWEEN two markers
 * means we do not split at all — we carry the original, flag it, and ask.
 */
import type { FieldSource, Sourced, VestingProposal } from '@/types/builder';

/**
 * Characterization markers, most specific phrase first inside each family
 * so the longer form wins.
 *
 * MIRRORED, character for character, in backend/services/vesting_split.py
 * (pinned by backend/tests/test_vesting_split.py). Not an attempt to
 * enumerate every possible vesting: an unrecognised string falls through
 * as a plain name and a half-recognised one falls to the flagged path —
 * both safe directions. A list that tried to be exhaustive would fail
 * CONFIDENTLY on the one it got wrong.
 */
export const MARKERS: string[] = [
  'AS COMMUNITY PROPERTY WITH RIGHT[S]? OF SURVIVORSHIP',
  'AS COMMUNITY PROPERTY',
  'AS JOINT TENANTS WITH RIGHT[S]? OF SURVIVORSHIP',
  'AS JOINT TENANTS',
  'AS TENANTS IN COMMON',
  'AS TENANTS BY THE ENTIRETY',
  'AS (?:HIS|HER|THEIR) SOLE AND SEPARATE PROPERTY',
  'AN UNMARRIED (?:MAN|WOMAN|PERSON)',
  'A MARRIED (?:MAN|WOMAN|PERSON)',
  'A SINGLE (?:MAN|WOMAN|PERSON)',
  'A WIDOW(?:ER)?',
  'HUSBAND AND WIFE',
  'WIFE AND HUSBAND',
  'REGISTERED DOMESTIC PARTNERS',
  'TRUSTEE[S]? (?:OF|UNDER)',
  '(?:A|AN) (?:CALIFORNIA |DELAWARE )?(?:LIMITED LIABILITY COMPANY|LIMITED PARTNERSHIP|GENERAL PARTNERSHIP|CORPORATION|PARTNERSHIP|LLC)',
];

// \b at both ends so a marker cannot match inside a longer word — the
// reason 'A MARRIED MAN' must not fire on 'A MARRIED MANAGER'.
const markerSource = `\\b(?:${MARKERS.map((m) => `(?:${m})`).join('|')})\\b`;

/**
 * What may legitimately sit BETWEEN two characterization markers: joining
 * words and punctuation, nothing else. Anything else is a name, and a name
 * there means the string is not ours to split. Mirrored in the Python.
 */
const SEPARATOR_ONLY = /^[\s,;&/()\.-]*(?:\b(?:AND|OR)\b[\s,;&/()\.-]*)*$/i;

const trimEdges = (s: string): string => s.replace(/^[ ,;]+/, '').replace(/[ ,;]+$/, '');

export interface VestedOwnerSplit {
  /** The composite as extracted. Audit only — never a value, never confirmable. */
  verbatim: string;
  /** The FACT half. null when we could not isolate it. */
  parties: string | null;
  /** The INTERPRETATION half. null when we could not isolate it. */
  characterization: string | null;
  mixedContent: boolean;
  /** True when we could not split confidently: nothing is offered as a fact. */
  needsReview: boolean;
}

/**
 * Split a vested-owner string into its fact and its interpretation.
 * Returns null for an empty input — absence is not a candidate (U0).
 */
export function splitVestedOwner(raw: string | null | undefined): VestedOwnerSplit | null {
  if (raw === null || raw === undefined) return null;
  // Runs of whitespace collapse BEFORE matching. A PDF text layer wraps
  // mid-phrase, and a marker that straddles a newline is a marker we never
  // find — which would silently promote a composite to a fact.
  const text = trimEdges(raw.trim().split(/\s+/).join(' '));
  if (!text) return null;

  const matches = [...text.matchAll(new RegExp(markerSource, 'gi'))];
  if (matches.length === 0) {
    // A bare name is a fact, whole. The common and safe case.
    return {
      verbatim: text,
      parties: text,
      characterization: null,
      mixedContent: false,
      needsReview: false,
    };
  }

  // A name sitting between two markers means there are parties on BOTH
  // sides of the first one. Cutting there loses an owner.
  for (let i = 0; i + 1 < matches.length; i += 1) {
    const end = (matches[i].index ?? 0) + matches[i][0].length;
    const start = matches[i + 1].index ?? 0;
    if (!SEPARATOR_ONLY.test(text.slice(end, start))) {
      return {
        verbatim: text,
        parties: null,
        characterization: null,
        mixedContent: true,
        needsReview: true,
      };
    }
  }

  const cut = matches[0].index ?? 0;
  const parties = trimEdges(text.slice(0, cut));
  const characterization = trimEdges(text.slice(cut));

  if (!parties) {
    // The whole string is a characterization with no name in front of it.
    // We have no fact to offer, and inventing one from the characterization
    // would be exactly backwards.
    return {
      verbatim: text,
      parties: null,
      characterization,
      mixedContent: true,
      needsReview: true,
    };
  }

  return { verbatim: text, parties, characterization, mixedContent: true, needsReview: false };
}

/**
 * Whose reading this is, in words the officer sees at decision time.
 *
 * §2.3 makes `basis.claimant` mandatory on the wire because two proposals
 * of equal confidence can carry unequal warrant. The second sentence is
 * not decoration — it is the only thing standing between "how the seller
 * holds title" and "how the buyers will hold title", two different
 * questions answered in the same words.
 *
 * Mirrored in vesting_split.py::basis_for.
 */
export function basisFor(source: FieldSource | string, characterization: string): string {
  const whose: Record<string, string> = {
    prelim: 'The preliminary title report states',
    'titlesense.prelim_extraction': 'The preliminary title report states',
    sitex: 'The county record shows',
    titlepoint: 'The title plant shows',
  };
  const claimant = whose[source] || 'The source document states';
  return (
    `${claimant} the CURRENT owner holds title "${characterization}". ` +
    'That is how title is held today; how the grantees will hold it ' +
    'under this deed is your decision.'
  );
}

/** What the split hands the builder. Mirrors vesting_split.as_candidates. */
export interface OwnerSplitResult {
  /** The composite as extracted. Audit only. */
  verbatim: string;
  mixedContent: boolean;
  /** The FACT candidate — parties only, never the composite. */
  owner?: Sourced<string>;
  /** The INTERPRETATION — violet, unconfirmed, NOT in a fact position. */
  vestingProposal?: VestingProposal;
  /** Set when the string could not be split: nothing above is offered. */
  needsReview?: string;
}

export const UNSPLITTABLE_MESSAGE =
  'This vesting line could not be separated into a name and a vesting ' +
  'characterization. Enter the parties and the vesting yourself, using ' +
  'the original as printed.';

/**
 * The split in candidate shape.
 *
 * A caller that wants "the owner string" gets the parties. There is no
 * accessor that returns the composite as a value, because the composite is
 * not a value — it is two things that were printed together.
 */
export function ownerCandidates(
  raw: string | null | undefined,
  source: FieldSource,
): OwnerSplitResult | null {
  const split = splitVestedOwner(raw);
  if (!split) return null;

  const out: OwnerSplitResult = {
    verbatim: split.verbatim,
    mixedContent: split.mixedContent,
  };

  if (split.parties && !split.needsReview) {
    out.owner = { value: split.parties, source, status: 'candidate' };
  }

  if (split.characterization) {
    out.vestingProposal = {
      value: split.characterization,
      source,
      // NOT 'candidate'. A legal choice is never auto-applied and never
      // sits in candidate state inside the deed — it is proposed, and the
      // officer's acceptance is what writes it.
      status: 'proposed',
      basis: basisFor(source, split.characterization),
    };
  }

  if (split.needsReview) out.needsReview = UNSPLITTABLE_MESSAGE;

  return out;
}
