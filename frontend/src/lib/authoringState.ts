/**
 * `deeds.status` is AUTHORING state, and every surface that renders it
 * must say so.
 *
 * ═══ ONE WORD DOING TWO JOBS ═══
 *
 * An external audit found one document reported three ways on three
 * surfaces: badged "Completed" in Recently worked on, listed under
 * "Waiting on a reply" in the queue, and "Out for signing" in its own
 * record. All three were reading real data. Only one of them was
 * answering the question a reader asks.
 *
 * `deeds.status = 'completed'` means THE DOCUMENT WAS GENERATED. It says
 * nothing about whether anybody signed it, whether it was sent, whether
 * a notary answered, or whether it reached a recorder. A deed can be
 * `completed` on its first morning and still be waiting on three people.
 *
 * Rendering that word as "Completed" invites exactly one reading —
 * this transaction is done — which the product has no evidence for and
 * §13 forbids it to assert. **Authoring-complete is not
 * transaction-complete.**
 *
 * ═══ THE RULING ═══
 *
 * The badge says what the column means: the document is PREPARED. Any
 * surface that wants the whole state derives it from
 * `signing_loop.state_label`, which is the authority for workflow and
 * has been since T-5 ("the state, COMPUTED — there is no status column
 * and there must not be").
 *
 * ═══ AND WHY THIS IS A MODULE AND NOT A RENAMED STRING ═══
 *
 * The label existed twice with two vocabularies: the dashboard rendered
 * `{deed.status}` RAW, so the badge read the database's own token, and
 * Past Deeds carried its own `labels` map reading "Completed" / "In
 * Progress". Two surfaces, two answers, neither citing the other — which
 * is the shape §13 rule 3 exists to prevent and the shape §14.3 caught
 * one ticket ago. One place turns this column into English.
 */

/** The statuses `deeds.status` actually holds. */
export type AuthoringStatus = 'draft' | 'in_progress' | 'completed' | string;

/**
 * What the column means, in her words.
 *
 * `completed` is deliberately NOT "Completed". Everything else keeps the
 * plain reading, because "Draft" and "In progress" already describe
 * authoring and are not mistakable for a transaction outcome.
 */
export function authoringStateLabel(status: AuthoringStatus | null | undefined): string {
  switch ((status || '').toLowerCase().trim()) {
    case 'completed':
      // NOT "Completed". The document is prepared; what happens to it
      // afterwards is the queue's subject and state_label's sentence.
      return 'Prepared';
    case 'in_progress':
      return 'In progress';
    case 'draft':
    case '':
      return 'Draft';
    case 'shared':
      return 'Shared';
    case 'pending':
      return 'Pending';
    default:
      // An unknown token is shown as itself rather than mapped to a
      // guess — a status we do not recognise is not evidence of any
      // particular state (§4).
      return status as string;
  }
}

/**
 * The one-line gloss, for surfaces with room for it.
 *
 * Its job is to stop "Prepared" being read as a smaller "Completed". The
 * document exists; nothing here claims anybody has acted on it.
 */
export function authoringStateHint(status: AuthoringStatus | null | undefined): string | null {
  return (status || '').toLowerCase().trim() === 'completed'
    ? 'Document generated — this says nothing about signing or recording'
    : null;
}

/**
 * The column a surface displays a date FROM, named.
 *
 * ═══ DASH-FIX #5 ═══
 *
 * The dashboard renders `updated_at || created_at` and Past Deeds
 * renders `created_at`, both through a bare date with no label. The same
 * document therefore showed 7/29 in one place and 07/28 in the other,
 * and a reader comparing them has no way to learn they are different
 * facts rather than a bug.
 *
 * The dashboard is RIGHT to sort and show `updated_at` — "Recently
 * worked on" is the module's entire purpose. What it may not do is show
 * that date bare, so the label travels with it.
 */
export const LAST_WORKED_ON = 'Last worked on';
export const CREATED = 'Created';
