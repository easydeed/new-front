'use client';

/**
 * The deed page — the thing every surface has been linking around.
 *
 * ═══ THE ORDER IS THE DESIGN ═══
 *
 * Ranked by how likely each element is to change what she does next:
 *
 *   1. Whether this page may exist at all (superseded / deleted).
 *   2. The state, and the one obvious action — the question she arrived
 *      with.
 *   3. What changed since she was last here.
 *   4. One level out: the other documents on this file.
 *   5. The instrument. She made it; she does not need to read it.
 *
 * ═══ WHAT THIS FILE DOES NOT DO ═══
 *
 * It composes no sentence about state. Every such string was written in
 * `services/deed_page.py` and is rendered verbatim (§13 rule 3). A
 * screen that writes its own account of a state is the second opinion,
 * and the second opinion is the one nobody updates.
 *
 * It also fetches ONCE. The disqualification and the content it would
 * replace arrive together, because a page that learns it is invalid on a
 * second round-trip shows the working version first — and a second is
 * long enough to click.
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Building2, Clock, Download,
  FileText, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ShareForReviewModal } from '@/features/signing/ShareForReviewModal';
import { RequestSigningModal } from '@/features/signing/RequestSigningModal';
import { SigningDetail } from '@/features/signing/SigningDetail';
import {
  DeedDetail, isRecordedAct, knownState, renders,
} from '@/features/deed/deedDetail';
import '@/styles/dashboard.css';

export default function DeedPage() {
  // A deed is somebody's document. The route-guard pin caught this
  // missing on the first draft of this page — which is the pin doing
  // exactly its job: a new authenticated route is precisely where the
  // guard gets forgotten, because everything renders fine without it
  // until the fetch 401s.
  const { checked } = useRequireAuth();
  if (!checked) return null;

  return (
    <Suspense fallback={null}>
      <PartnersProvider>
        <DeedPageInner />
      </PartnersProvider>
    </Suspense>
  );
}

function DeedPageInner() {
  const params = useParams();
  const router = useRouter();
  const deedId = String(params.id);

  const [detail, setDetail] = useState<DeedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showSigning, setShowSigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/deeds/${deedId}/detail`, {}, { label: 'Deed' });
      if (!res.ok) {
        // A failed load says so. The alternative — an empty page — reads
        // as a deed with nothing on it, which is a different and much
        // worse claim than "we could not load this".
        const body = await res.json().catch(() => ({}));
        setFailed(String(body.detail || `Could not load this deed (${res.status}).`));
        return;
      }
      setDetail(await res.json());
      setFailed(null);
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        setFailed('Could not reach the server.');
      }
    } finally {
      setLoading(false);
    }
  }, [deedId]);

  useEffect(() => { void load(); }, [load]);

  const download = async () => {
    const res = await apiFetch(`/deeds/${deedId}/download`, {}, { label: 'Download' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(String(body.detail || 'The instrument could not be served.'),
                  { duration: 12000 });
      return;
    }
    const url = window.URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `deed-${deedId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const act = (kind: string) => {
    if (kind === 'resume') router.push(`/create-deed?resume=${deedId}`);
    else if (kind === 'share_for_review') setShowShare(true);
    // `open_signing` scrolls to the panel that is already on the page —
    // it never opens the CREATE modal. Offering "request a signing" on a
    // deed that already has one is an invitation to make a second, which
    // is three more emails and two notaries who each think they have it.
    else if (kind === 'open_signing') {
      document.getElementById('the-signing')?.scrollIntoView({ behavior: 'smooth' });
    }
    else if (kind === 'download') void download();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <div className="max-w-3xl mx-auto">
          {loading && <p className="text-slate-500">Loading this deed…</p>}

          {!loading && failed && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="font-semibold text-red-800">{failed}</p>
              <button onClick={() => { setLoading(true); void load(); }}
                      className="mt-3 underline font-medium text-red-700">
                Try again
              </button>
            </div>
          )}

          {/* ══ 1. THE DISQUALIFICATION ═══════════════════════════════
              It REPLACES the page. Not a banner above a working page —
              the working page is what must not be here. Offering a next
              action on a superseded deed invites work on the wrong
              document, and she has no way to know it is the wrong one
              except by us not offering. */}
          {detail?.disqualified && (
            <div data-testid="disqualified"
                 className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-amber-900">
                    {detail.disqualified.headline}
                  </h1>
                  <p className="mt-2 text-amber-800">{detail.disqualified.sentence}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {detail.disqualified.go_to_deed_id && (
                      <Link href={`/deeds/${detail.disqualified.go_to_deed_id}`}
                            className="inline-flex items-center gap-2 bg-amber-700 text-white font-semibold px-4 py-2.5 rounded-lg">
                        Go to the replacement
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                    <Link href="/past-deeds"
                          className="inline-flex items-center gap-2 border-2 border-amber-700 text-amber-800 font-semibold px-4 py-2.5 rounded-lg">
                      Back to all deeds
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {renders(detail) && detail && (
            <>
              {/* ══ 2. STATE, AND THE ONE OBVIOUS ACTION ═══════════════ */}
              <section data-testid="state" className="mb-10">
                <p className="text-sm text-slate-500">
                  {detail.instrument.property_address || 'This deed'}
                </p>
                {knownState(detail.state.state) ? (
                  <>
                    <h1 className="text-3xl font-bold text-slate-900 mt-1">
                      {detail.state.headline}
                    </h1>
                    <p className="mt-2 text-slate-700">{detail.state.sentence}</p>
                  </>
                ) : (
                  /* A state this screen has never heard of renders as a
                     visible gap, never as a confident guess. */
                  <p className="mt-2 text-slate-700">
                    This deed is in a state this page does not recognise yet.
                  </p>
                )}
                {detail.state.next_action && detail.state.next_action.kind !== 'none' && (
                  <button
                    onClick={() => act(detail.state.next_action!.kind)}
                    className="mt-5 inline-flex items-center gap-2 bg-[#7C4DFF] text-white font-semibold px-5 py-3 rounded-lg"
                  >
                    {detail.state.next_action.label}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </section>

              {/* THE SIGNING, IN FULL — the panel that used to expand
                  inside the agenda row. It moved here rather than
                  closing, so cancelling still exists; the ruling's named
                  cost was an extra navigation, not a lost action. Same
                  component, not a second copy. */}
              {detail.state.signing_request_id && (
                <section id="the-signing" data-testid="the-signing"
                         className="mb-10 rounded-xl border border-slate-200 bg-white">
                  <SigningDetail
                    requestId={detail.state.signing_request_id}
                    onCancelled={() => void load()}
                  />
                </section>
              )}

              {/* ══ 3. WHAT CHANGED SINCE SHE WAS LAST HERE ═══════════ */}
              <section data-testid="activity" className="mb-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
                  <Clock className="w-5 h-5 text-slate-400" /> Activity
                </h2>
                {detail.activity.length === 0 ? (
                  /* Thin is the honest answer. Padding it is the whole
                     defect deed_activity.py was written to refuse. */
                  <p className="text-sm text-slate-500">
                    Nothing recorded on this deed yet.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {detail.activity.map((e, i) => (
                      <li key={`${e.source}-${e.at}-${i}`}
                          className="flex items-baseline gap-3 text-sm">
                        {/* An EVENT is something somebody did whose record
                            survives. A DERIVED entry is a column that
                            merely carries a time. The API separated them
                            so a screen could not flatten them back out —
                            so they do not get the same weight. */}
                        <span className={isRecordedAct(e)
                          ? 'w-2 h-2 rounded-full bg-[#7C4DFF] shrink-0 translate-y-1'
                          : 'w-2 h-2 rounded-full border border-slate-300 shrink-0 translate-y-1'} />
                        <span className={isRecordedAct(e)
                          ? 'text-slate-800' : 'text-slate-500'}>
                          {e.sentence}
                        </span>
                        <span className="ml-auto text-slate-400 shrink-0">
                          {new Date(e.at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {/* ══ PARTICIPANTS, SPLIT ═══════════════════════════════
                  Two headings, and the split is not cosmetic. Grantor and
                  grantee are TEXT ON AN INSTRUMENT: no contact details,
                  no actions, by design — they are not users of this
                  product and never consented to anything. The rule is
                  enforced in Python (`deed_page.refuse_contact`), because
                  a rule enforced by a component is a rule the next
                  component does not have. */}
              <section data-testid="participants" className="mb-10 grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                    <FileText className="w-4 h-4" /> On the document
                  </h2>
                  {detail.on_the_document.length === 0 ? (
                    <p className="text-sm text-slate-400">Not named yet.</p>
                  ) : (
                    <ul data-testid="on-the-document" className="space-y-2">
                      {detail.on_the_document.map((p) => (
                        <li key={p.role} className="text-sm">
                          <span className="text-slate-500">{p.role}: </span>
                          <span className="text-slate-800 font-medium">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                    <Users className="w-4 h-4" /> Working on it
                  </h2>
                  {detail.working_on_it.length === 0 ? (
                    <p className="text-sm text-slate-400">Nobody yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.working_on_it.map((p, i) => (
                        <li key={`${p.role}-${p.name}-${i}`} className="text-sm">
                          <span className="text-slate-500">{p.role}: </span>
                          <span className="text-slate-800 font-medium">{p.name}</span>
                          <span className="block text-slate-500">{p.sentence}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* ══ 4. ONE LEVEL OUT ══════════════════════════════════ */}
              {detail.matter && (
                <section data-testid="matter" className="mb-10">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    File {detail.matter.key.value}
                  </h2>
                  {detail.matter.documents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      This is the only document on this file.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.matter.documents.map((d) => (
                        <li key={d.id} className="text-sm">
                          <Link href={`/deeds/${d.id}`}
                                className="font-medium text-[#7C4DFF] hover:underline">
                            #{d.id} {d.deed_type?.replace(/[-_]/g, ' ')}
                          </Link>
                          <span className="text-slate-500"> · {d.status}</span>
                          {!!d.parties.length && (
                            <span className="text-slate-500"> · {d.parties.join(', ')}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* ══ 5. THE INSTRUMENT — a named line, not a frame ══════
                  She made this document. Embedding a viewer would put the
                  least decision-changing element in the most space. */}
              <section data-testid="instrument"
                       className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {(detail.instrument.deed_type || 'Deed').replace(/[-_]/g, ' ')}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {[detail.instrument.county && `${detail.instrument.county} County`,
                      detail.instrument.apn && `APN ${detail.instrument.apn}`]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                {detail.instrument.available ? (
                  <button onClick={() => void download()}
                          className="inline-flex items-center gap-2 border-2 border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg">
                    <Download className="w-4 h-4" /> Download
                  </button>
                ) : (
                  /* No link on a draft. A download offered before the
                     bytes exist is a 404 she reads as a lost document. */
                  <span className="text-sm text-slate-400">
                    Not generated yet
                  </span>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* #178's fix, now reachable: Share opens the dialog in place
          rather than navigating to another screen to ask again. */}
      {showShare && (
        <ShareForReviewModal
          deedId={Number(deedId)}
          onClose={() => { setShowShare(false); void load(); }}
          // FLOW1's interrupt has somewhere to go here: this page has a
          // signing flow, so "did you mean a signing?" can be acted on
          // rather than merely asked.
          onSwitchToSigning={() => { setShowShare(false); setShowSigning(true); }}
        />
      )}
      {showSigning && (
        <RequestSigningModal
          deedId={Number(deedId)}
          propertyAddress={detail?.instrument.property_address || undefined}
          // NAMES ONLY, and specifically the ON-THE-DOCUMENT names —
          // which is the whole point of the split. That list is
          // structurally incapable of carrying a way to reach anybody,
          // so a starting point drawn from it cannot leak one.
          suggestedSigners={(detail?.on_the_document || []).map((p) => p.name)}
          onClose={() => { setShowSigning(false); void load(); }}
        />
      )}
    </div>
  );
}
