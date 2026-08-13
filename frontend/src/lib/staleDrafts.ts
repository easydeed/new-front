/**
 * UX2 items 8/9 — the drafts she started and did not finish.
 *
 * ═══ WHY A NUDGE AND NOT A CLEANUP ═══
 *
 * Five drafts at one address is not a mess to tidy. It is somebody
 * trying the same conveyance five times, which usually means four
 * attempts that went wrong and one that is current — and the product
 * has no way to know WHICH one is current. So it does not guess: it
 * says what it sees and offers the action, and she picks.
 *
 * A rule that archived the older ones automatically would be the
 * product deciding which of her attempts was the real one. That is the
 * same objection as auto-applying a legal choice, one floor down.
 *
 * ═══ ARCHIVING IS NOT DELETING ═══
 *
 * Nothing is destroyed and nothing is un-recorded (§9's neighbourhood).
 * The row keeps every column and stops appearing in the list she works
 * from. `?include_archived=true` is how she checks that, which is what
 * makes the promise verifiable rather than a claim.
 */

export interface DraftLike {
  id: number;
  status: string;
  property_address?: string | null;
  created_at?: string | null;
  archived_at?: string | null;
}

/**
 * How many drafts at one address before we say anything.
 *
 * Five, and the number lives here rather than in the screen for the
 * reason DASH1 established for `STALE_AFTER_DAYS`: a threshold typed
 * into a component is a threshold that gets a second value the day
 * another screen wants it.
 */
export const NUDGE_AT = 5;

/**
 * Addresses compared the way a person means them, not the way they were
 * typed.
 *
 * "123 Baseline St" and "123 baseline st." are the same property and
 * five attempts spread across both spellings is exactly the case the
 * nudge exists for. Punctuation and case are noise; the rest is left
 * alone, because normalizing harder (St → Street) starts guessing at
 * addresses and this function has no business doing that.
 */
export function addressKey(address: string | null | undefined): string {
  return (address || '')
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface StaleCluster {
  /** The address as she last typed it — never the normalized key. */
  address: string;
  /** Newest first. The whole cluster, including the current one. */
  drafts: DraftLike[];
  /** The ones the nudge offers to archive: everything but the newest. */
  older: DraftLike[];
}

/**
 * Clusters of unfinished drafts at one address, big enough to mention.
 *
 * Completed deeds are excluded and archived ones are too — a cluster
 * she has already dealt with must not keep asking.
 */
export function staleClusters(deeds: readonly DraftLike[]): StaleCluster[] {
  const byKey = new Map<string, DraftLike[]>();
  for (const d of deeds) {
    if ((d.status || '').trim().toLowerCase() === 'completed') continue;
    if (d.archived_at) continue;
    const key = addressKey(d.property_address);
    if (!key) continue; // An address-less draft belongs to no property.
    byKey.set(key, [...(byKey.get(key) || []), d]);
  }

  const out: StaleCluster[] = [];
  for (const group of byKey.values()) {
    if (group.length < NUDGE_AT) continue;
    // Newest first, and a draft with no date sorts last rather than
    // first: an unknown time is not a recent one.
    const sorted = [...group].sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : -Infinity;
      const bt = b.created_at ? Date.parse(b.created_at) : -Infinity;
      return bt - at;
    });
    out.push({
      address: sorted[0].property_address || '',
      drafts: sorted,
      // THE NEWEST IS NEVER OFFERED. It is the likeliest current
      // attempt, and archiving the thing she is working on is the one
      // outcome that would make this feature worse than nothing.
      older: sorted.slice(1),
    });
  }
  return out;
}

/**
 * The sentence, composed once.
 *
 * States what it sees and what it offers. It does not say the older
 * ones are abandoned, because we do not know that — only that there
 * are five and one of them is newest.
 */
export function nudgeSentence(cluster: StaleCluster): string {
  return `${cluster.drafts.length} unfinished drafts for ${cluster.address}. `
    + `Archive the ${cluster.older.length} older ones? They are kept, `
    + `not deleted — you can bring them back.`;
}
