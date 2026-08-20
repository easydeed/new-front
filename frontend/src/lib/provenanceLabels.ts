/**
 * GUIDE2 — WHERE AN UNCONFIRMED VALUE CAME FROM, SAID ACCURATELY.
 *
 * ═══ THE DEFECT THIS FIXES ═══
 *
 * `ConfirmableField` showed one hardcoded sentence on every unconfirmed
 * field: **"From county records — confirm"**. `FieldSource` has six
 * values, and that sentence is only defensible for two of them.
 *
 *   · `google`        — Google Places autocomplete. An address someone
 *                       typed into a search box. NOT a county record.
 *   · `prelim`        — a preliminary title report. A title company's
 *                       work product. NOT a county record.
 *   · `ai_suggested`  — a value this software PROPOSED. Displaying that
 *                       as "from county records" is the most serious of
 *                       the six: it launders a suggestion into an
 *                       official-sounding source.
 *   · `sitex`,
 *     `titlepoint`    — data vendors that aggregate county records.
 *                       Close, but the vendor is who we actually heard
 *                       it from, and if it is wrong it is wrong at the
 *                       vendor.
 *   · `user`          — she typed it. Never needs a provenance claim.
 *
 * This is the amber rule's own failure mode. Amber means "unconfirmed
 * external data, tell her where it came from", and the label was telling
 * her something we did not know.
 *
 * ═══ WHY THIS IS COPY AND NOT A MODEL (GUIDE0) ═══
 *
 * A field explanation that never changes is copy, not inference. It is
 * cheaper, faster, pinnable, reviewable by someone who knows recording
 * practice, and it cannot invent a citation. There is no request here and
 * nothing that can drift.
 *
 * ═══ ONE DECLARATION (§13 rule 3) ═══
 *
 * This is the only place a `FieldSource` becomes English. A second map
 * somewhere else is how "From county records" got to be wrong in the
 * first place — a sentence written next to the markup that renders it,
 * where nobody compares it against the union it is describing.
 */
import type { FieldSource } from '@/types/builder';

export interface ProvenanceLabel {
  /** The badge, beside the amber marker. Short — it sits on one line. */
  badge: string;
  /** What this source IS, for the officer who has not met it before. */
  detail: string;
}

/**
 * EVERY member of `FieldSource` appears here, and the test pins that.
 * A source added to the union without an entry here would otherwise fall
 * back to something generic, which is exactly the defect above: a
 * plausible sentence standing in for one we do not have.
 */
export const PROVENANCE: Record<FieldSource, ProvenanceLabel> = {
  sitex: {
    badge: 'From SiteX — confirm',
    detail:
      'SiteX is a property-data vendor that aggregates county assessor and '
      + 'recorder data. We are showing you what the vendor returned, not the '
      + 'county record itself — if it disagrees with the record, the record '
      + 'governs.',
  },
  titlepoint: {
    badge: 'From TitlePoint — confirm',
    detail:
      'TitlePoint is a title-data vendor. We are showing you what the vendor '
      + 'returned, not the county record itself — if it disagrees with the '
      + 'record, the record governs.',
  },
  prelim: {
    badge: 'From the preliminary report — confirm',
    detail:
      'This came from a preliminary title report on this file. A prelim is '
      + 'the title company’s work product; it is not itself a recorded '
      + 'document, and it can be superseded by a later one.',
  },
  google: {
    badge: 'From address lookup — confirm',
    detail:
      'This came from the address search, which is a mapping service and not '
      + 'a records source. It is a starting point for finding the parcel, not '
      + 'evidence about it.',
  },
  ai_suggested: {
    badge: 'Suggested by this software — confirm',
    detail:
      'Nothing outside this application provided this value. The software '
      + 'proposed it from the other facts on this deed, and it is worth no '
      + 'more than those facts are.',
  },
  user: {
    badge: 'You entered this',
    detail:
      'This value was typed here rather than fetched, so there is nothing to '
      + 'compare it against but the record itself.',
  },
};

/**
 * The label for a source, and a LOUD fallback if one is ever missing.
 *
 * §14.8 — an absent label is not a neutral absence, it is a source we
 * cannot describe. Saying so is honest; substituting a confident sentence
 * about the county is how this file came to be needed.
 */
export function provenanceLabel(source: FieldSource): ProvenanceLabel {
  return PROVENANCE[source] ?? {
    badge: 'Source unrecorded — confirm',
    detail:
      'This value’s origin was not recorded, so we cannot tell you where '
      + 'it came from. Check it against the record before confirming.',
  };
}
