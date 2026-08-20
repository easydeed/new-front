/**
 * GUIDE2 — WHAT AN R&T EXEMPTION COVERS, so its basis is legible.
 *
 * ═══ THE DISTINCTION THIS DEPENDS ON (Doctrine B) ═══
 *
 * EXPLAIN YES, SELECT NO. Nothing here says an exemption applies to her
 * transfer, which one to claim, or that a recorder will accept it. Each
 * entry states what the SECTION covers — statute scope, which is a fact
 * about California law and not about her file.
 *
 * A proposed exemption already records the basis shown at decision time
 * (`LegalChoiceRecord.basis`). `dttSuggestions.ts` explains why we are
 * proposing it FROM HER FACTS. This file supplies the other half — what
 * the section itself reaches — so she can judge whether her facts fall
 * inside it. **That is the basis being made legible, not an inference
 * added on top of it.**
 *
 * ═══ THE GAP THAT MADE THIS WORTH BUILDING ═══
 *
 * The violet proposal block already carries a code section, a title and
 * an explanation. **The MANUAL path carries none of it.** An officer who
 * opens the exemption dropdown and picks "R&T 11923 — Court Order /
 * Decree" is told nothing at all about what 11923 covers — and that is
 * precisely the officer who most needs it, because no suggestion is
 * guiding her and she has chosen to decide unaided.
 *
 * Help concentrated on the path where the software is already confident
 * is help pointed away from the person who needs it.
 *
 * ═══ WHY COPY AND NOT A MODEL ═══
 *
 * Statute scope does not change between page loads. It is copy: free,
 * instant, pinnable, and incapable of hallucinating a section number.
 * A model asked the same question would be right most of the time, which
 * is a worse property than being fixed and reviewable.
 *
 * ═══ MAINTENANCE ═══
 *
 * Keyed by the exact `value` strings in `TransferTaxSection`'s
 * `EXEMPTION_REASONS`, and a test pins that every one of them has an
 * entry — so adding a dropdown option without explaining it fails rather
 * than shipping a silent blank.
 *
 * These summarize the sections as they stood when written and are NOT a
 * substitute for reading them. They deliberately describe scope in the
 * statute's own terms rather than paraphrasing toward any fact pattern.
 */
export interface ExemptionScope {
  /** What the section reaches. One or two sentences, scope only. */
  covers: string;
  /** What it does NOT reach, where that is the common confusion. */
  limit?: string;
}

export const EXEMPTION_SCOPE: Record<string, ExemptionScope> = {
  'R&T 11911': {
    covers:
      'Exempts a transfer where no consideration passes — a genuine gift. '
      + 'The tax is measured by consideration, so where there is none there '
      + 'is nothing to measure.',
    limit:
      'An existing loan the grantee takes subject to, or assumes, is '
      + 'consideration. A transfer described as a gift can still be taxable '
      + 'on the balance of encumbrances remaining on the property.',
  },
  'R&T 11927': {
    covers:
      'Exempts transfers between spouses or registered domestic partners, '
      + 'including transfers made to divide community property in a '
      + 'dissolution or legal separation.',
    limit:
      'It is about the relationship between the parties, not the form of the '
      + 'deed. The instrument used does not by itself establish the exemption.',
  },
  'R&T 11930': {
    covers:
      'Exempts a transfer into or out of a revocable trust where the '
      + 'beneficial ownership does not change — the same people own the '
      + 'property before and after.',
    limit:
      'A change in who benefits is a change in beneficial ownership. An '
      + 'irrevocable trust, or a trust with different beneficiaries, is a '
      + 'different question.',
  },
  'R&T 11923': {
    covers:
      'Exempts transfers made to carry out a court order or judicial decree, '
      + 'where the transfer is ordered rather than bargained for.',
  },
  'R&T 11925': {
    covers:
      'Exempts transfers to a beneficiary or mortgagee in foreclosure, or by '
      + 'deed in lieu of foreclosure, to the extent of the debt satisfied.',
    limit:
      'Consideration above the debt satisfied is not covered by this section.',
  },
  'R&T 11922': {
    covers:
      'Exempts conveyances to governmental entities and their agencies and '
      + 'instrumentalities — the tax does not reach the government as grantee.',
  },
  'R&T 11926': {
    covers:
      'Exempts a deed given to confirm or correct a transfer already made and '
      + 'already taxed. The earlier transfer is the taxable event; this deed '
      + 'only fixes the record of it.',
  },
  Other: {
    covers:
      'A section not listed here. Enter the section you are claiming — what '
      + 'is recorded is the section YOU name, and the basis is yours.',
  },
};

export function exemptionScope(codeSection: string | undefined | null) {
  if (!codeSection) return undefined;
  return EXEMPTION_SCOPE[codeSection.trim()];
}
