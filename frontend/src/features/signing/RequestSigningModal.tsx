'use client';

/**
 * NOTARY2 — the officer starts a coordination loop.
 *
 * ═══ WHAT SHE IS ASKED FOR, AND WHAT SHE IS NOT ═══
 *
 * A notary (from her rolodex), and the people who have to be in the room.
 * That is the whole form.
 *
 * She is NOT asked for times. NOTARY1's modal made her propose windows
 * because the notary had no way to speak; §13.1 reversed that, and the
 * notary now posts her own availability — so asking the officer to guess
 * at it first would be asking her to do the work the reversal removed.
 * The field is gone rather than optional: an optional field on a form is
 * a question, and this one has a better answer than any she could give.
 *
 * Location defaults to the property address and the timezone to the
 * property's, because a signing happens at the property far more often
 * than not, and a default that is right most of the time beats a blank
 * that is right none of it.
 *
 * ═══ SIGNER CONTACT IS PER-REQUEST (§13.1) ═══
 *
 * What she types here lands on `signing_participants` and nowhere else —
 * not on the deed, not in the `parties` JSONB, not on a profile — and it
 * is purged on a schedule by a job with a test. The form says so, in
 * plain words, because she is about to type somebody else's client's
 * email into a product they have never heard of.
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Info, Loader2, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { withOffset } from '@/lib/wallClock';
import { PartnerRecipientPicker, Recipient } from '@/features/partners/PartnerRecipientPicker';
import { usePartners } from '@/features/partners/PartnersContext';
import {
  RecipientMismatchNotice,
  filedAsSentence,
} from '@/features/partners/RecipientMismatch';

const MAX_SIGNERS = 6;
const NOTARY_CATEGORY = 'notary';

/** The zones a California title product actually needs. Not the full
 * IANA list — a dropdown of six hundred zones is a worse question than a
 * dropdown of five. */
/** Days, because a signing is arranged over days and a review is read in
 *  hours. Same control, same placement, units that match the thing. */
const EXPIRY_CHOICES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 21, label: '21 days' },
  { days: 30, label: '30 days' },
];

const ZONES = [
  { id: 'America/Los_Angeles', label: 'Pacific' },
  { id: 'America/Denver', label: 'Mountain' },
  { id: 'America/Phoenix', label: 'Arizona (no DST)' },
  { id: 'America/Chicago', label: 'Central' },
  { id: 'America/New_York', label: 'Eastern' },
];

type SignerRow = { name: string; email: string; phone: string };

export function RequestSigningModal({
  deedId,
  propertyAddress,
  suggestedSigners = [],
  preselectNotaryId,
  onClose,
  onCreated,
}: {
  deedId: number;
  /** UX2 item 6 — arrived from a partner row, which knew the notary and
   *  not the deed. Resolved against the rolodex rather than trusted:
   *  an id from a URL is a string somebody could type, and a notary
   *  this officer does not have must not appear as though she does. */
  preselectNotaryId?: string | null;
  propertyAddress?: string;
  /** The deed's party NAMES, as a starting point. Names only — the deed
   * has never held a way to reach anybody and does not start now. */
  suggestedSigners?: string[];
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const [notary, setNotary] = useState<Recipient | null>(null);
  const { partners: rolodex } = usePartners();

  useEffect(() => {
    // Once only, and only onto an empty field: re-running this would
    // undo a change she made after arriving.
    if (!preselectNotaryId || notary) return;
    const found = rolodex.find((p) => p.id === preselectNotaryId);
    if (found) {
      // `partnerId`, not `id`: a Recipient records WHICH ROLODEX ROW it
      // came from, and a typed address has none. Filling it wrongly
      // would make a hand-typed recipient look like a filed one.
      setNotary({
        partnerId: found.id,
        name: found.label,
        email: found.email || '',
        company: found.company_name,
        category: found.category,
      });
    }
  }, [preselectNotaryId, notary, rolodex]);
  const [fallbackAcknowledged, setFallbackAcknowledged] = useState(false);
  const [signers, setSigners] = useState<SignerRow[]>(() =>
    (suggestedSigners.length ? suggestedSigners : ['']).slice(0, MAX_SIGNERS)
      .map((name) => ({ name, email: '', phone: '' })),
  );
  /**
   * FLOW1 item 7 — DISPATCH IS THE DEFAULT, NEGOTIATION IS THE
   * ALTERNATIVE.
   *
   * Owner research into escrow practice: the officer knows when the docs
   * are ready, schedules with the signers directly — usually by phone —
   * and then dispatches a notary for that time, who accepts or declines.
   * The notary is a contractor receiving an assignment.
   *
   * NOTARY2's loop inverted that: notary posts availability, signers
   * converge. That is the right model for FINDING a time among people
   * with no prior contact, and the wrong one for the ordinary case where
   * she already has her clients on the phone and needs somebody to show
   * up. §13.1's reversal is untouched — it was about routing AROUND the
   * signers, and dispatch does not: she talks to them first, which is
   * the leg she was always going to do herself. What changes is who
   * proposes the time, not who is included.
   */
  const [mode, setMode] = useState<'dispatch' | 'availability'>('dispatch');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [signersAgreed, setSignersAgreed] = useState(false);
  const [location, setLocation] = useState(propertyAddress || '');
  const [tz, setTz] = useState(ZONES[0].id);
  /* CANCEL1 item 5 — the expiry was imposed silently. The API has taken
     `expires_in_days` since NOTARY2 and no screen ever sent one, so every
     request got the 21-day default and the officer read the date off the
     agenda afterwards. Reviews have had this control all along; this is
     the same field, in the same place, on the other modal. */
  const [expiresInDays, setExpiresInDays] = useState(21);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: number; links: Array<{ role: string; name: string; link: string }> } | null>(null);

  const ready = useMemo(
    () => !!notary?.email
      && signers.some((s) => s.name.trim() && s.email.trim())
      && (mode === 'availability' || (!!start && !!end)),
    [notary, signers, mode, start, end],
  );

  const setSigner = (i: number, patch: Partial<SignerRow>) =>
    setSigners((prev) => prev.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  // A TYPED address has no filing, so there is nothing to observe and
  // nothing to ask about — `category` is undefined and this stays false.
  const showFallbackNotice =
    !fallbackAcknowledged &&
    !!notary?.category &&
    notary.category !== NOTARY_CATEGORY;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch('/signing-requests/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deed_id: deedId,
          notary_email: notary?.email,
          notary_name: notary?.name || undefined,
          notary_company: notary?.company || undefined,
          notary_partner_id: notary?.partnerId,
          signers: signers
            .filter((s) => s.name.trim() && s.email.trim())
            .map((s) => ({ name: s.name.trim(), email: s.email.trim(),
                           phone: s.phone.trim() || undefined })),
          location: location || undefined,
          tz_name: tz,
          expires_in_days: expiresInDays,
          ...(mode === 'dispatch' && start && end
            ? {
                // withOffset: a bare wall-clock time makes the server
                // guess a zone, which is how a calendar entry lands an
                // hour out and somebody arrives at an empty office.
                proposed_time: { start: withOffset(start), end: withOffset(end) },
                signers_already_agreed: signersAgreed,
              }
            : {}),
        }),
      }, { label: 'Creating the signing request' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Failed (${response.status})`);
      setDone({
        id: data.signing_request_id,
        links: (data.participants || []).map((p: { party_role: string; name: string; link: string }) => ({
          role: p.party_role, name: p.name, link: p.link,
        })),
      });
      onCreated?.(data.signing_request_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the request');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[640px] w-full max-h-[85vh] flex flex-col p-8">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[#7C4DFF]" />
            Request a signing
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 overflow-y-auto">
            <p className="text-slate-700">
              {/* FLOW1: "the times she is free" — about a notary the
                  officer picked out of her rolodex moments ago, whose
                  pronouns this product has never been told. A name is
                  not a pronoun. */}
              {mode === 'dispatch' ? (
                <>
                  The request is on the record. <strong>{notary?.name || 'The notary'}</strong>{' '}
                  has been asked to take the time you proposed. Nothing is booked until
                  they accept — your signers are told when it is.
                </>
              ) : (
                <>
                  The request is on the record. <strong>{notary?.name || 'The notary'}</strong>{' '}
                  posts the times they are free; your signers pick from them. When they all
                  agree on one, it books and you are told.
                </>
              )}
            </p>
            <p className="text-sm text-slate-500">
              You do not have to approve the time — but you can change it later if you
              need to.
            </p>
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
              {done.links.map((p) => (
                <div key={p.link} className="p-3">
                  <div className="text-sm font-medium text-slate-800">
                    {p.name} <span className="text-slate-400 font-normal">· {p.role === 'notary' ? 'notary' : 'signer'}</span>
                  </div>
                  <div className="text-xs text-slate-500 break-all">{p.link}</div>
                </div>
              ))}
            </div>
            <button onClick={onClose}
                    className="w-full px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
            <div className="space-y-5 overflow-y-auto flex-1 pr-1">
              <PartnerRecipientPicker
                value={notary}
                onChange={(r) => { setNotary(r); setFallbackAcknowledged(false); }}
                suggestCategory="notary"
                label="Notary"
              />

              {/* FLOW1 item 5 — THE FALLBACK STAYS, AND STOPS BEING
                  EQUAL-WEIGHT.
                  The picker floats notaries up and hides nobody, which
                  is right: a mobile notary filed under "other" three
                  months ago is still the person she wants. But "hidden
                  from nobody" had become "indistinguishable from
                  anybody", and this field's whole job is to name the
                  person who will take the acknowledgement.
                  So the pick is ACKNOWLEDGED, not prevented — no
                  disabled submit, no removal from the list. */}
              {showFallbackNotice && notary && (
                <RecipientMismatchNotice
                  recipient={notary}
                  headline={filedAsSentence(notary, notary.category!)}
                  question="This request asks them to take the acknowledgement. Send it to them anyway?"
                  onDismiss={() => setFallbackAcknowledged(true)}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => setFallbackAcknowledged(true)}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Yes — send it to them
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotary(null)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                      >
                        Pick someone else
                      </button>
                    </>
                  }
                />
              )}

              {/* FLOW1 item 7 — DISPATCH FIRST, NEGOTIATION SECOND.
                  Not a mode selector wearing equal weight: the two
                  options are ordered, the first is chosen, and the
                  second says what it is for. She reaches the ordinary
                  case by doing nothing. */}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">When</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="signing-mode" className="mt-1"
                           checked={mode === 'dispatch'}
                           onChange={() => setMode('dispatch')} />
                    <span className="text-sm">
                      <span className="font-medium text-slate-800">I have a time</span>
                      <span className="block text-xs text-slate-500">
                        Propose it to the notary — they accept or decline.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="signing-mode" className="mt-1"
                           checked={mode === 'availability'}
                           onChange={() => setMode('availability')} />
                    <span className="text-sm">
                      <span className="font-medium text-slate-800">Ask for availability</span>
                      <span className="block text-xs text-slate-500">
                        The notary posts times, your signers pick one.
                      </span>
                    </span>
                  </label>
                </div>

                {mode === 'dispatch' && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Starts</label>
                        <input type="datetime-local" value={start}
                               onChange={(e) => setStart(e.target.value)} className={input} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Ends</label>
                        <input type="datetime-local" value={end}
                               onChange={(e) => setEnd(e.target.value)} className={input} />
                      </div>
                    </div>
                    {/* THE ASSERTION, ASKED FOR EXPLICITLY.
                        Ticking this writes an answer on the signers'
                        behalf, recorded as HERS — so it is a question
                        with words, not a silent consequence of typing a
                        time. Unticked, the signers still have to answer,
                        which is the safe half of the fork. */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-1" checked={signersAgreed}
                             onChange={(e) => setSignersAgreed(e.target.checked)} />
                      <span className="text-sm">
                        <span className="text-slate-800">
                          I have already agreed this time with the signers
                        </span>
                        <span className="block text-xs text-slate-500">
                          Recorded as your word, not theirs. They can still change it
                          from their own link.
                        </span>
                      </span>
                    </label>
                    <p className="text-xs text-slate-500">
                      Nothing is booked until the notary accepts. Your signers are told
                      when it is.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Who is signing <span className="text-red-500">*</span>
                  </label>
                  {signers.length < MAX_SIGNERS && (
                    <button type="button"
                            onClick={() => setSigners((p) => [...p, { name: '', email: '', phone: '' }])}
                            className="inline-flex items-center gap-1 text-sm text-[#7C4DFF] hover:underline">
                      <Plus className="w-4 h-4" /> Add a signer
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {signers.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                      <input type="text" value={s.name} placeholder="Full name"
                             onChange={(e) => setSigner(i, { name: e.target.value })}
                             className={input} />
                      <input type="email" value={s.email} placeholder="Email"
                             onChange={(e) => setSigner(i, { email: e.target.value })}
                             className={input} />
                      {signers.length > 1 && (
                        <button type="button" aria-label="Remove this signer"
                                onClick={() => setSigners((p) => p.filter((_, n) => n !== i))}
                                className="p-2 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    Your signers get their own link to pick a time. Their details are kept
                    on this request only — never added to the deed or to your contacts —
                    and are deleted automatically after the signing is done.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Where</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                         className={input} placeholder="The property address" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Times shown in</label>
                  <select value={tz} onChange={(e) => setTz(e.target.value)} className={input}>
                    {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Everyone sees times in this zone — the one where the signing happens.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Links expire after
                  </label>
                  <select value={expiresInDays}
                          onChange={(e) => setExpiresInDays(Number(e.target.value))}
                          className={input}>
                    {EXPIRY_CHOICES.map((c) => (
                      <option key={c.days} value={c.days}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {/* What expiry DOES, in the same terms the review
                        dialog uses: the links stop working and the
                        recipient sees a notice. The signing request
                        itself is not cancelled — that is a different act,
                        with different consequences and its own button. */}
                    When the links expire they stop working and everyone sees a
                    notice. The request is not cancelled — nobody is told.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-5 shrink-0">
              <button type="button" onClick={onClose}
                      className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !ready}
                      className="flex-1 px-4 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send to the notary
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
