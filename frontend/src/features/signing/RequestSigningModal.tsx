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

import { useMemo, useState } from 'react';
import { CalendarClock, Info, Loader2, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { PartnerRecipientPicker, Recipient } from '@/features/partners/PartnerRecipientPicker';

const MAX_SIGNERS = 6;

/** The zones a California title product actually needs. Not the full
 * IANA list — a dropdown of six hundred zones is a worse question than a
 * dropdown of five. */
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
  onClose,
  onCreated,
}: {
  deedId: number;
  propertyAddress?: string;
  /** The deed's party NAMES, as a starting point. Names only — the deed
   * has never held a way to reach anybody and does not start now. */
  suggestedSigners?: string[];
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const [notary, setNotary] = useState<Recipient | null>(null);
  const [signers, setSigners] = useState<SignerRow[]>(() =>
    (suggestedSigners.length ? suggestedSigners : ['']).slice(0, MAX_SIGNERS)
      .map((name) => ({ name, email: '', phone: '' })),
  );
  const [location, setLocation] = useState(propertyAddress || '');
  const [tz, setTz] = useState(ZONES[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: number; links: Array<{ role: string; name: string; link: string }> } | null>(null);

  const ready = useMemo(
    () => !!notary?.email && signers.some((s) => s.name.trim() && s.email.trim()),
    [notary, signers],
  );

  const setSigner = (i: number, patch: Partial<SignerRow>) =>
    setSigners((prev) => prev.map((s, n) => (n === i ? { ...s, ...patch } : s)));

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
              The request is on the record. <strong>{notary?.name || 'The notary'}</strong> posts
              the times she is free; your signers pick from them. When they all agree on
              one, it books and you are told.
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
                onChange={setNotary}
                suggestCategory="notary"
                label="Notary"
              />

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
