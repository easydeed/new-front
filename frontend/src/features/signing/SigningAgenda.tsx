'use client';

/**
 * Every signing, across every file — the agenda, as a component.
 *
 * ═══ AN AGENDA, NOT A MONTH GRID (owner-accepted cut) ═══
 *
 * A list sorted by date answers "what is coming up and what is stuck"
 * completely. The grid is the attractive version of the same facts, it
 * cost a day, and no workflow depended on it.
 *
 * ═══ THE STUCK SIGNAL LEADS ═══
 *
 * Which is the whole design. A booked signing needs nothing from her; a
 * request nobody has answered in five days needs a phone call, and it is
 * invisible on a date-sorted list because its date has not happened yet.
 * So stuck items are counted at the top and marked in the row, and the
 * amber that marks them is BRAND2's "unconfirmed / needs a human", which
 * is what this is — not decoration borrowed for emphasis.
 *
 * ═══ WHY IT IS A COMPONENT NOW ═══
 *
 * The Requests merge folded reviews and signings into one page, and
 * `/signings` became a permanent alias. This was the agenda's page; it
 * is now the signings half of `/requests`, unchanged.
 *
 * Unchanged is the point. The merged page renders TWO ROW SHAPES and
 * must: a review is a row in a table of recipients and responses, a
 * signing is a card with a notary, a set of times and an expandable
 * detail. They were briefly the same shape — signings were squeezed into
 * the reviews table's eight columns, filling five of them honestly, and
 * offering a button to "Open in Signings" that this merge would have
 * left pointing at nothing.
 *
 * Read-only aggregation apart from cancellation. No availability engine,
 * and no date formatting for a scheduling state: every such time shown
 * is the server's own label, rendered in the REQUEST's timezone.
 */

import Link from 'next/link';
import { AlertCircle, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import {
  SigningSummary, STATE_LABEL, groupSignings, isStuck,
} from './signingSummary';

export function SigningAgenda({
  rows,
  error,
  staleAfterDays,
  focusId,
}: {
  rows: SigningSummary[];
  /** The signings half failing must not blank the reviews half. The
   *  merged page owns the fetch and hands the failure down. */
  error: string | null;
  /** The threshold travels with the queue payload, so the sentence
   *  explaining the amber banner can say the number without knowing it. */
  staleAfterDays: number | null;
  /** `?kind=signings&focus=<id>` still points at a row — it marks it
   *  rather than expanding it, now that the panel is a link. */
  focusId: number | null;
}) {
  const groups = groupSignings(rows);
  const stuck = rows.filter(isStuck);

  const section = (title: string, items: SigningSummary[], dimmed = false) =>
    items.length > 0 && (
      <>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-3 first:mt-0">
          {title}
        </h2>
        <div className={`space-y-3 ${dimmed ? 'opacity-70' : ''}`}>
          {items.map((r) => (
            <SigningRow key={r.id} row={r} focused={focusId === r.id} />
          ))}
        </div>
      </>
    );

  return (
    <div>
      {stuck.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {stuck.length} {stuck.length === 1 ? 'signing has' : 'signings have'} gone quiet
          </p>
          <p className="text-sm text-amber-800 mt-1">
            No movement in {staleAfterDays ?? 5} days or more. Nothing has expired —
            these are worth a phone call.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No signings arranged yet.</p>
        </div>
      )}

      {section('Booked', groups.booked)}
      {section('Being arranged', groups.arranging)}
      {section('Closed', groups.closed, true)}
    </div>
  );
}

/**
 * FLOW1 item 4 — THE CARD OPENS THE SIGNING.
 *
 * It used to `router.push('/past-deeds')`. Every card. So pressing the
 * row for a signing that had gone quiet took her to a list of deeds with
 * no indication of which one she had just been looking at — the one
 * gesture on this page threw away the only context the page had.
 *
 * There is no officer-facing route for a single signing (`/deeds/{id}`
 * and its neighbours all 404 — ledgered as DEEDDETAIL), so the row
 * EXPANDS rather than navigating: same page, same scroll position, and
 * the detail comes from `GET /signing-requests/v2/{id}`, which already
 * returns the participants, their links, whether each has opened theirs,
 * and every window with who is still outstanding on it.
 */
function SigningRow({ row, focused }: {
  row: SigningSummary;
  /* `?kind=signings&focus=<id>` still points at a row; it just marks it
     rather than expanding it. */
  focused: boolean;
}) {
  const stuck = isStuck(row);
  const booked = row.state === 'booked';
  const age = row.days_waiting;

  return (
    <div className={`bg-white rounded-xl border ${
      focused ? 'border-[#7C4DFF] ring-2 ring-[#7C4DFF]/20'
      : stuck ? 'border-amber-300' : 'border-slate-200'}`}>
      {/* THE PANEL COLLAPSED TO A LINK.
          This row used to expand in place and fetch one signing's
          participants, times and Cancel. That answers a single-deed
          question in the middle of a screen whose job is the cross-deed
          one — scanning what has gone quiet across every file, which is
          the question this list can answer and the deed page structurally
          cannot.
          State, summary and the stuck marking stay inline, because those
          are what scanning needs. Everything else is one navigation away,
          and cancelling costs a click more on purpose. */}
      <Link
        href={`/deeds/${row.deed_id}`}
        className="block w-full text-left p-4 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {row.property_address || `Deed #${row.deed_id}`}
            </p>
            <p className="text-sm text-slate-500 truncate">
              {row.notary_name || 'No notary named'} · {row.signers} signer{row.signers === 1 ? '' : 's'}
            </p>
            {/* The server's sentence, verbatim — this screen never composes
                its own account of a scheduling state (§13 rule 3). */}
            <p className="text-sm text-slate-600 mt-2">{row.summary}</p>
            {/* FLOW1 item 4: THE DATES ARE ON THE ROW. The subtitle
                claimed an order and nothing on screen carried a date to
                justify it. A booked signing shows when; one being
                arranged shows how long she has been waiting, which is
                the fact it actually has. */}
            <p className="text-xs text-slate-400 mt-1">
              {booked && row.booked_at
                ? `Booked for ${new Date(row.booked_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}`
                : age === null
                  ? 'Requested — date unknown'
                  : age === 0
                    ? 'Requested today'
                    : `Requested ${age} day${age === 1 ? '' : 's'} ago`}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            stuck ? 'bg-amber-100 text-amber-800'
            : booked ? 'bg-slate-100 text-slate-700'
            : 'bg-slate-50 text-slate-600'
          }`}>
            {stuck ? <AlertCircle className="w-3.5 h-3.5" />
              : booked ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />}
            {stuck ? 'Gone quiet' : STATE_LABEL[row.state] || row.state}
          </span>
        </div>
      </Link>
    </div>
  );
}

