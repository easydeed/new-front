/**
 * The hero number, and the list it counts.
 *
 * ═══ THE PROMISE, MADE COUNTABLE ═══
 *
 * "Every field confirmed by you before it prints" is what this product
 * sells, and nothing in it reported on that claim. This does.
 *
 * ═══ WHY THE NUMBER IS NOT A COUNT OF UNCONFIRMED FIELDS ═══
 *
 * That was the first design and it would have been inverted. A field
 * with no value has nothing to confirm, so a draft where she typed an
 * address and left reports ZERO, while a draft one click from done
 * reports its last candidate. The most prominent figure on the page
 * would have read lowest for the documents furthest from ready.
 *
 * Owner-ruled: count what stands between the document and being ready —
 * required-and-empty AND unconfirmed. Both come from the server in one
 * pass (`/dashboard/queue`), because both are derived from
 * `required_fields.json` and a stored provenance block, neither of which
 * this screen holds.
 *
 * ═══ AND IT NEVER RENDERS A NUMBER IT DID NOT RECEIVE ═══
 *
 * A zero drawn while the request is in flight is the same lie as the
 * inverted count, arriving earlier. Absent data renders nothing.
 */
'use client';

export interface AccuracyCheck {
  field: string;
  label: string;
  population: 'substance' | 'decision' | 'unconfirmed' | 'disagreement';
  typed?: string;
  record?: string;
}

export interface AccuracyItem {
  deed_id: number;
  deed_type?: string | null;
  property?: string | null;
  checks: AccuracyCheck[];
}

export interface Accuracy {
  fields: number;
  documents: number;
  items: AccuracyItem[];
}

/**
 * What this check is, in her words — one place turns state into English
 * (§13 rule 3), so the resume card and this list cannot drift.
 */
export function checkSentence(check: AccuracyCheck): string {
  if (check.population === 'disagreement') {
    // Reports the difference and NEVER which one is right. Both are
    // legitimate: the record may be stale, she may be conveying from a
    // name it does not carry, or one is a typo.
    return `Names differ — you typed ${check.typed}; the county record says ${check.record}`;
  }
  if (check.population === 'unconfirmed') {
    return `${check.label} — from county records, not yet confirmed by you`;
  }
  if (check.population === 'decision') {
    return `${check.label} — not chosen yet`;
  }
  return `${check.label} — still empty`;
}

const HEADLINE = 'fields still need your eyes';

export default function AccuracySection({ accuracy, onOpen }: {
  accuracy?: Accuracy | null;
  onOpen?: (deedId: number) => void;
}) {
  // Nothing received: say nothing. Not zero — zero is a claim.
  if (!accuracy) return null;

  if (accuracy.fields === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-sm text-emerald-900">
          Every field on every open document is confirmed. Nothing is waiting on your eyes.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="accuracy-heading" className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="text-5xl font-bold leading-none text-slate-900"
             data-testid="accuracy-figure">
          {accuracy.fields}
        </div>
        <h2 id="accuracy-heading" className="pb-1 text-sm text-slate-600">
          {HEADLINE}, across {accuracy.documents}{' '}
          {accuracy.documents === 1 ? 'document' : 'documents'}
        </h2>
      </div>

      <ul className="space-y-3">
        {accuracy.items.map((item) => (
          <li key={item.deed_id}
              className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="font-medium text-slate-800">
              {item.property || 'Untitled document'}
            </div>
            <div className="text-xs text-slate-500">{item.deed_type}</div>
            <ul className="mt-2 space-y-1">
              {item.checks.map((check) => (
                <li key={`${item.deed_id}-${check.field}-${check.population}`}
                    className="text-sm text-slate-700">
                  {checkSentence(check)}
                </li>
              ))}
            </ul>
            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(item.deed_id)}
                className="mt-3 text-sm font-medium text-[#7C4DFF] underline underline-offset-2"
              >
                Open this document
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
