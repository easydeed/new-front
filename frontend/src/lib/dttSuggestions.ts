/**
 * Deterministic transfer-tax exemption detection (Ticket TT).
 *
 * Pattern-matches builder state against clearly recognizable CA R&T
 * exemption fact patterns. Detection PROPOSES only — nothing here writes
 * builder state. The explanation must cite the specific builder facts that
 * triggered the match. If nothing matches confidently, return null — never
 * guess. No LLM involved: the treatment logic is fully deterministic.
 */
import type { DTTData, DeedBuilderState } from '@/types/builder';

export interface DttSuggestion {
  codeSection: string;      // e.g. 'R&T 11927'
  title: string;
  explanation: string;      // grounded in the actual builder facts
  /** The treatment applied to state ONLY if the officer accepts. */
  proposed: Pick<DTTData, 'isExempt' | 'exemptReason'>;
}

const overlapName = (a: string, b: string): string | null => {
  const parts = a.toUpperCase().replace(/,/g, ' ').split(/\s+/).filter(w => w.length > 2 && w !== 'AND' && w !== 'THE');
  return parts.find(w => b.toUpperCase().includes(w)) ?? null;
};

export function detectDttSuggestion(
  deedType: string,
  grantor: string,
  grantee: string,
): DttSuggestion | null {
  const g1 = (grantor || '').trim();
  const g2 = (grantee || '').trim();

  // ── Interspousal transfer: the deed type itself is the fact pattern ──
  if (deedType === 'interspousal-transfer') {
    return {
      codeSection: 'R&T 11927',
      title: 'Interspousal transfer exemption',
      explanation:
        'This deed is an Interspousal Transfer Deed. Transfers between spouses ' +
        'are exempt from documentary transfer tax under Revenue & Taxation Code ' +
        '§11927. This suggestion is based solely on the deed type you selected.',
      proposed: { isExempt: true, exemptReason: 'R&T 11927' },
    };
  }

  // ── Transfer into the grantor's own revocable trust ──────────────────
  if (g1 && g2 && (g2.toUpperCase().includes('TRUST') || g2.toUpperCase().includes('TRUSTEE'))) {
    const shared = overlapName(g1, g2);
    if (shared) {
      return {
        codeSection: 'R&T 11930',
        title: 'Transfer to own revocable trust',
        explanation:
          `The grantee "${g2}" is a trust, and it shares the name "${shared}" with ` +
          `the grantor "${g1}". A transfer by a grantor into their own revocable ` +
          'trust is exempt under Revenue & Taxation Code §11930 because beneficial ' +
          'ownership does not change.',
        proposed: { isExempt: true, exemptReason: 'R&T 11930' },
      };
    }
    return null; // trust grantee without a name link: not confident — never guess
  }

  // ── Transfer out of a trust to a same-named beneficiary ───────────────
  if (g1 && g2 && (g1.toUpperCase().includes('TRUST') || g1.toUpperCase().includes('TRUSTEE'))) {
    const shared = overlapName(g2, g1);
    if (shared) {
      return {
        codeSection: 'R&T 11930',
        title: 'Distribution from trust to beneficiary',
        explanation:
          `The grantor "${g1}" is a trust sharing the name "${shared}" with the ` +
          `grantee "${g2}". A distribution from a revocable trust back to the ` +
          'trustor/beneficiary is exempt under Revenue & Taxation Code §11930.',
        proposed: { isExempt: true, exemptReason: 'R&T 11930' },
      };
    }
    return null;
  }

  // ── Identical grantor and grantee: no change in ownership ─────────────
  if (g1 && g2 && g1.toUpperCase() === g2.toUpperCase()) {
    return {
      codeSection: 'R&T 11911',
      title: 'No change in ownership',
      explanation:
        `The grantor and grantee are identical ("${g1}"), indicating a name ` +
        'correction or confirmation with no consideration. Zero-consideration ' +
        'transfers have no documentary transfer tax basis under Revenue & ' +
        'Taxation Code §11911.',
      proposed: { isExempt: true, exemptReason: 'R&T 11911' },
    };
  }

  return null;
}

/**
 * A suggestion is "pending" when it was surfaced but the officer has neither
 * accepted it, dismissed it, nor overridden it with a manual entry (any
 * manual DTT edit records a dttDecision). The generation panel surfaces this
 * as a decision to make — never as a confirm-all item.
 */
export function isDttSuggestionPending(
  state: Pick<DeedBuilderState, 'deedType' | 'grantor' | 'grantee' | 'dttDecision' | 'dttSuggestionDismissed'>,
): boolean {
  return (
    !!detectDttSuggestion(state.deedType, state.grantor, state.grantee) &&
    !state.dttDecision &&
    !state.dttSuggestionDismissed
  );
}
