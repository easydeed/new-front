/**
 * NOTIF1 — what happened, kept out of the queue that says what needs her.
 *
 * ═══ THE FINDING ═══
 *
 * The worklist selects the two UNDECIDED share statuses, because a
 * worklist shows outstanding work and an approval is the END of
 * outstanding work. So when a reviewer approves, the row does not change
 * state — it DISAPPEARS.
 *
 * **A disappearance is not a notification.** A vanished row is
 * indistinguishable from one she handled herself, one that expired, one
 * that was revoked, and from nothing at all. Until this strip, the email
 * was the only thing that told her — which is exactly the failure E1
 * named when it started writing the in-app record: *"a transport failure
 * erased the event from the owner's world entirely."*
 *
 * ═══ WHY IT IS NOT A WORKLIST BAND (owner-ruled) ═══
 *
 * The hero counts ROWS and promises "things that need you". An approval
 * needs nothing. A fourth band would inflate that number with finished
 * work — the metric-vs-worklist error DASH3 spent itself removing.
 *
 * An approval is NEWS, not a task, and the two do not share a container.
 *
 * ═══ QUIETER THAN THE QUEUE, AND DISMISSIBLE (owner-ruled) ═══
 *
 * No card, no border, no spine — the worklist owns those. This is a line
 * of text with a dismiss. A "what happened" strip that accumulates
 * forever becomes wallpaper, so it shows only UNREAD items, dismissing
 * is one press, and what it cannot fit it SAYS rather than trimming.
 */
'use client';

export interface NewsRow {
  id: number;
  kind: string;
  say: string;
  when: string;
  href: string;
  deed_id: number | null;
  /** The document this is about. Rendered as a LINK, never a button. */
  property: string;
}

export interface News {
  items: NewsRow[];
  /** Unread events beyond what one render shows. NAMED, not trimmed. */
  more: number;
}

export default function RecentlyResolved({ news, onOpen, onDismiss }: {
  news?: News | null;
  onOpen?: (href: string) => void;
  onDismiss?: (ids: number[]) => void;
}) {
  // Nothing to report renders NOTHING — and that is right here, unlike
  // the worklist below it. An empty queue is a RESULT she needs told
  // ("Nothing needs you"); an absence of news is not a result, because
  // "nothing happened since you last looked" is the ordinary case and
  // saying it every morning is how a strip becomes wallpaper.
  if (!news || !news.items.length) return null;

  return (
    <section aria-label="Recently resolved"
             className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Since you last looked
      </span>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {news.items.map((row) => (
          <li key={row.id} className="flex items-center gap-1.5">
            {/* THE SENTENCE IS TEXT, NOT A CONTROL. It reports; the
                property beside it is the way in. Making the sentence
                pressable too gave the strip two affordances for one
                destination and made a statement look like a prompt —
                task-free means the news reads as news. Server-composed
                verbatim (§13 rule 3). */}
            <span className="text-[13px] text-gray-600">{row.say}</span>
            {row.property && (
              /* THE PROPERTY IS NAVIGATION, NOT AN ACTION (owner-ruled).
                 The gap this closes is real: she learns her reviewer
                 approved and would otherwise have to go find the deed.
                 The fix is NOT a "Review it" button — that would turn
                 news into a task, which is the exact collapse the
                 separate-strip ruling exists to prevent. She presses the
                 property because she wants to see it, not because the
                 strip told her to do something. */
              <a href={row.href}
                 onClick={(e) => { e.preventDefault(); onOpen?.(row.href) }}
                 className="text-[12.5px] font-medium text-gray-500 underline
                            decoration-gray-300 underline-offset-2
                            transition hover:text-[var(--color-brand)]">
                {row.property}
              </a>
            )}
            <span className="text-[11.5px] text-gray-400">{row.when}</span>
          </li>
        ))}
      </ul>
      {news.more > 0 && (
        /* WHAT IS NOT SHOWN IS SAID. A strip that silently truncates
           tells her she has seen everything when she has not. */
        <span className="text-[11.5px] text-gray-400">
          +{news.more} more
        </span>
      )}
      <button type="button"
              onClick={() => onDismiss?.(news.items.map((r) => r.id))}
              className="ml-auto text-[11.5px] font-medium text-gray-400
                         transition hover:text-gray-700">
        Dismiss
      </button>
    </section>
  );
}
