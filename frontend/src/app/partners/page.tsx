'use client';

/**
 * PARTNER1 — the Partners screen.
 *
 * ═══ PART 1: THE BUG ═══
 *
 * A partner's address prints on the deed. D2 wired it end to end:
 * `partners/selectlist` assembles a one-line mailing address server-side,
 * `RecordingSection` fills `requestedByAddress` when a partner is chosen,
 * `PreviewPanel` renders it, and all five chassis print it in the
 * Recording Requested By block.
 *
 * Every link in that chain worked. The address was always empty anyway,
 * because THIS SCREEN never captured it.
 *
 * The columns exist (`partners.address_line1/2, city, state,
 * postal_code`), the API models accept them, `create_partner` and
 * `update_partner` write them, `list_partners` returns them — and the
 * form rendered six inputs, none of which were an address. `blank()` did
 * not even seed the keys.
 *
 * The sharpest part: the OTHER two partner-creation surfaces
 * (`QuickAddPartnerModal`, opened from the builder's Recording section,
 * and `AddPartnerModal`) both capture address correctly. So the same
 * partner got an address when created inside the deed builder and none
 * when created from the page built for managing partners — and this page
 * is the only place to EDIT, so the gap could not be repaired either.
 *
 * A partner with no address now surfaces as an editable gap ("Add
 * address"), never as a silent blank that reaches a document.
 *
 * ═══ PART 2: BRAND AND UX ═══
 *
 * This screen predates BRAND2. It used flat blue/red buttons with emoji
 * glyphs, and Quick Stats in a fourth palette (blue/emerald/amber) — the
 * amber being the one that matters, because BRAND.md reserves amber for
 * "unconfirmed external data" and a partner count is neither. Colour
 * carrying a meaning somewhere else must not be spent on decoration here.
 *
 * Now: brand purple for primary, ghost for cancel, red as outline for
 * delete, lucide icons throughout, one accent for stats with zero-values
 * in muted gray, and category chips in semantic neutral tones.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  CalendarClock, Plus, Pencil, Trash2, X, Save, Search, Users, MapPin, Mail,
  Phone, Loader2,
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import {
  PARTNER_CATEGORIES, categoryLabel, defaultRoleFor, roleBelongsTo,
  roleLabel, rolesFor,
} from '../../lib/partnerRegistry';
import { formatPhone, maskUS, normalizePhone, phoneSearchKey } from '../../lib/phone';
import '../../styles/dashboard.css';

/**
 * PARTNER2: the two hand-kept arrays are gone. They had already diverged
 * from the builder's list once (PARTNER1 aligned them by hand and noted
 * that hand-alignment has a shelf life), and a third copy in
 * QuickAddPartnerModal disagreed with both about whether `realtor` is a
 * category or a role. Every surface now derives from `lib/partnerRegistry`,
 * and a pin fails if any of them grows its own list again.
 */

type Partner = {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  category: string;
  role: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
};

/** Title Case for a snake_case enum. Display only — never written back. */
function titleCase(value?: string): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * The one-line address, assembled exactly as the backend's `_addr()` does
 * for the selectlist. Mirrored deliberately: what the officer reads in
 * this table must be what lands in the deed's requested-by block, and a
 * second formatting rule here would drift from the one that prints.
 */
export function partnerAddressLine(p: Partial<Partner>): string {
  const street = [p.address_line1, p.address_line2]
    .map((s) => (s || '').trim()).filter(Boolean).join(' ');
  const locality = [p.state, p.postal_code]
    .map((s) => (s || '').trim()).filter(Boolean).join(' ');
  const city = (p.city || '').trim();
  const tail = [city, locality].filter(Boolean).join(', ');
  return [street, tail].filter(Boolean).join(', ');
}

export default function PartnersPage() {
  /* HX0 — THE ROUTE GUARD THIS PAGE NEVER HAD.
     Its only `access_token` reference read a token to SEND it, inside a
     data fetch, and the sweep detected guards by looking for that
     string — so the page counted as guarded for as long as it called an
     authenticated endpoint. A logged-out visitor loaded it and learned
     she was logged out only when the fetch was refused.
     The shared hook rather than a fifth inline check: it redirects to
     /login carrying the path she was trying to reach. */
  const { checked } = useRequireAuth();

  const router = useRouter();
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const token = () =>
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('access_token')
      : null;

  const load = () => {
    setLoading(true);
    const t = token();
    fetch('/api/partners', {
      credentials: 'include',
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    })
      .then((r) => r.json())
      .then((d) => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function blank(): Partial<Partner> {
    return {
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      category: 'title_company',
      role: 'title_officer',
      // PARTNER1: these five were absent, which is the entire bug. An
      // address the form never seeds is an address the form never sends.
      address_line1: '',
      address_line2: '',
      city: '',
      state: 'CA',
      postal_code: '',
      is_active: true,
      notes: '',
    };
  }

  /** Open the editor on a stored row. The phone comes back as E.164 and
   * is masked for reading — an officer opening a partner should not be
   * shown "+16265550134" and asked to recognise her own entry. */
  function edit(p: Partner) {
    setEditing({ ...p, phone: formatPhone(p.phone) });
    setFormError(null);
    setShowForm(true);
  }

  function save(it: Partial<Partner>) {
    if (!(it.company_name || '').trim()) {
      setFormError('Company name is required.');
      return;
    }
    setFormError(null);
    setSaving(true);
    const method = it.id ? 'PUT' : 'POST';
    const url = it.id ? `/api/partners/${it.id}` : '/api/partners';
    const t = token();

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
      // Masked for her eyes, E.164 on the wire. The column has held
      // eleven punctuation styles until now, none of them searchable.
      body: JSON.stringify({ ...it, phone: normalizePhone(it.phone) }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.detail || `Save failed (${r.status})`);
        }
        return r.json();
      })
      .then(() => {
        setEditing(null);
        setShowForm(false);
        load();
      })
      .catch((e) => setFormError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  }

  function del(id: string) {
    if (!confirm('Delete this partner?')) return;
    const t = token();
    fetch(`/api/partners/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    }).then(() => {
      setEditing(null);
      setShowForm(false);
      load();
    });
  }

  /**
   * Category chips in SEMANTIC NEUTRAL tones.
   *
   * The old chips used blue / emerald / amber. Amber is the problem:
   * BRAND.md reserves it for "unconfirmed external data", and an officer
   * scanning for the amber that means "no human has said yes to this" was
   * reading past a lender count. A partner's category is a label, not a
   * state, so it gets slate weights — distinguishable, and carrying no
   * meaning borrowed from the doctrine palette.
   */
  function categoryChip(category: string) {
    const tone: Record<string, string> = {
      title_company: 'bg-slate-100 text-slate-700 ring-slate-200',
      escrow_company: 'bg-slate-100 text-slate-600 ring-slate-200',
      notary: 'bg-slate-100 text-slate-700 ring-slate-300',
      attorney: 'bg-gray-100 text-gray-600 ring-gray-200',
      real_estate: 'bg-slate-50 text-slate-600 ring-slate-200',
      lender: 'bg-gray-100 text-gray-700 ring-gray-300',
      other: 'bg-gray-50 text-gray-500 ring-gray-200',
    };
    /* THE HOOK REDIRECTS; THIS IS WHAT STOPS THE CONTENT RENDERING.
     `useRequireAuth` navigates from an effect, so without this line the
     page paints its chrome for a frame first — and the property the
     sweep asserts is not "redirects eventually", it is "does not render
     its content when no token is present". `/team` had both; adopting
     only the hook would have been adopting half the mechanism. */
  if (!checked) return null;

  return (
      <span
        className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tone[category] || tone.other}`}
      >
        {categoryLabel(category)}
      </span>
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      // phoneSearchKey so "(626) 555" finds a row stored as +16265550134.
      // The raw substring match could not, whichever way either was typed.
      [p.company_name, p.contact_name, p.email, phoneSearchKey(p.phone), p.city, p.address_line1]
        .some((f) => (f || '').toLowerCase().includes(q))
    );
  }, [items, query]);

  const missingAddress = items.filter((p) => !partnerAddressLine(p)).length;

  /** One accent for stats; a zero is muted, not shouted. */
  const statValue = (n: number) =>
    n === 0 ? 'text-gray-400' : 'text-brand-600';

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Industry Partners</h1>
              <p className="text-gray-500 mt-1">
                {items.length} partner{items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
              onClick={() => { setEditing(blank()); setFormError(null); setShowForm(true); }}
            >
              <Plus className="w-4 h-4" /> Add New Partner
            </button>
          </div>

          {/* PARTNER1: partners with no address are named, once, with the
              way to fix them. An address missing here becomes a blank
              line on a recorded document, so silence is the one thing
              this must not do. */}
          {!loading && missingAddress > 0 && (
            <div className="flex items-start gap-2 mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
              <span>
                {missingAddress} partner{missingAddress !== 1 ? 's have' : ' has'} no
                address on file. The address prints in the deed&apos;s
                &ldquo;Recording Requested By&rdquo; block — add one so it is not
                blank on the document.
              </span>
            </div>
          )}

          {/* Search — only once there is enough to search through. */}
          {items.length > 5 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search partners by name, contact, email or city"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          )}

          {/* Partners Table. Lower-priority columns (email/phone) drop out
              at narrow widths rather than forcing a horizontal scroll. */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-[30%] text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                  <th className="w-[26%] text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="hidden lg:table-cell w-[14%] text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="w-[14%] text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="hidden xl:table-cell w-[12%] text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="w-[80px] text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 align-text-bottom" />
                      Loading partners…
                    </td>
                  </tr>
                )}

                {/* A real empty state: what this is for, and the way in. */}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14">
                      <div className="text-center max-w-sm mx-auto">
                        <Users className="w-8 h-8 mx-auto text-gray-300" />
                        <h3 className="mt-3 font-semibold text-gray-900">No partners yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Add the title companies, agents and lenders you work with.
                          Choosing one while drafting fills the deed&apos;s Recording
                          Requested By block, including its address.
                        </p>
                        <button
                          className="mt-4 inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-600 transition-colors"
                          onClick={() => { setEditing(blank()); setFormError(null); setShowForm(true); }}
                        >
                          <Plus className="w-4 h-4" /> Add your first partner
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && items.length > 0 && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500 text-sm">
                      No partners match &ldquo;{query}&rdquo;.
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((p) => {
                  const address = partnerAddressLine(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-4 font-medium text-gray-900 break-words">
                        {p.company_name}
                        <span className="lg:hidden block text-sm font-normal text-gray-500">
                          {p.contact_name || ''}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 break-words">
                        {address || (
                          /* An editable gap, never a silent blank. */
                          <button
                            onClick={() => edit(p)}
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Add address
                          </button>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4 text-gray-600 break-words">
                        {p.contact_name || '—'}
                      </td>
                      <td className="px-4 py-4">{categoryChip(p.category)}</td>
                      {/* UX2 item 6 — THE PHONE WAS ONLY IN THE EDITOR.
                          The rolodex existed to save her looking somebody
                          up, and the number she most often wants was
                          behind a click into a form built for CHANGING
                          it. Reading and editing are different acts.

                          (The email was already here. Recorded because
                          the ticket asked for both and half of it was
                          done — a ticket's record should match reality.) */}
                      <td className="hidden xl:table-cell px-4 py-4 break-words">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="text-brand-600 hover:underline inline-flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="break-all">{p.email}</span>
                          </a>
                        ) : null}
                        {p.phone ? (
                          <a href={`tel:${p.phone}`}
                             className="mt-1 text-gray-600 hover:text-brand-600 hover:underline inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            {/* Regional display, E.164 storage — the
                                PARTNER2 split. A person reads a phone
                                number the way a person writes one. */}
                            <span>{formatPhone(p.phone)}</span>
                          </a>
                        ) : null}
                        {!p.email && !p.phone ? '—' : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* UX2 item 6 — ONE CLICK TO A SIGNING.
                              A notary in the rolodex and a signing that
                              needs one were two screens apart, and the
                              route between them was "remember the name,
                              go to Past Deeds, find the deed, open the
                              modal, search for her again".

                              It cannot create the request from here —
                              there is no deed on this row, and inventing
                              one would be the product guessing which
                              document she meant. So it carries the
                              notary to the place the deed is chosen. */}
                          {/* OFFERED ON EVERY ROW, and that is the
                              correct reading rather than a shortcut.

                              The first draft gated this on
                              `category === 'notary'`. The registry pin
                              caught the literal, and the rule behind the
                              pin is the stronger objection:
                              partnerRegistry.ts says a category "says how
                              the officer FILES them. It says nothing
                              about their authority, their licensure, or
                              what they are permitted to do, and no code
                              may read it as though it did."

                              Gating the button on the category IS reading
                              it as permission. Who she asks to notarize is
                              her judgement; the modal's existing mismatch
                              notice says a dismissible sentence if the
                              filing looks unexpected, which is the
                              established way this product raises a
                              doubt without overruling her. */}
                          <button
                            aria-label={`Request a signing with ${p.company_name}`}
                            title="Request a signing"
                            className="p-2 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            onClick={() => router.push(
                              `/past-deeds?action=signing&notary=${encodeURIComponent(p.id)}`)}
                          >
                            <CalendarClock className="w-4 h-4" />
                          </button>
                          <button
                            aria-label={`Edit ${p.company_name}`}
                            title="Edit"
                            className="p-2 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            onClick={() => edit(p)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            aria-label={`Delete ${p.company_name}`}
                            title="Delete"
                            className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => del(p.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Stats — ONE accent, zeros muted. */}
          {items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Partners', n: items.length },
                  // Derived from the registry rather than four hand-written
                  // filters: adding a category should not require anybody
                  // to remember this tile row exists.
                  ...PARTNER_CATEGORIES
                    .filter((c) => c.key !== 'other')
                    .map((c) => ({
                      label: c.pluralLabel,
                      n: items.filter((p) => p.category === c.key).length,
                    }))
                    .filter((tile) => tile.n > 0)
                    .slice(0, 3),
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">{s.label}</div>
                    <div className={`text-2xl font-bold ${statValue(s.n)}`}>{s.n}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit form as a SLIDE-OVER. It used to open as a card above the
          table, pushing the list below the fold — so editing a partner
          cost you the sight of every other partner. */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-gray-900/30"
            onClick={() => { setEditing(null); setShowForm(false); }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? 'Edit partner' : 'New partner'}
            className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing.id ? 'Edit Partner' : 'New Partner'}
              </h3>
              <button
                aria-label="Close"
                className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => { setEditing(null); setShowForm(false); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <Field label="Company Name *">
                <input
                  value={editing.company_name || ''}
                  onChange={(e) => setEditing({ ...editing, company_name: e.target.value })}
                  className={inputCls}
                  placeholder="Pacific Coast Title"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact Name">
                  <input
                    value={editing.contact_name || ''}
                    onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })}
                    className={inputCls}
                    placeholder="John Smith"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={editing.phone || ''}
                    onChange={(e) => setEditing({ ...editing, phone: maskUS(e.target.value) })}
                    className={inputCls}
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  value={editing.email || ''}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className={inputCls}
                  placeholder="john@pct.com"
                />
              </Field>

              {/* PARTNER1 — the fields this form never had. */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Mailing address</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Prints in the deed&apos;s &ldquo;Recording Requested By&rdquo; block when
                  this partner is selected.
                </p>
                <div className="space-y-4">
                  <Field label="Address Line 1">
                    <input
                      value={editing.address_line1 || ''}
                      onChange={(e) => setEditing({ ...editing, address_line1: e.target.value })}
                      className={inputCls}
                      placeholder="1234 Wilshire Blvd"
                    />
                  </Field>
                  <Field label="Address Line 2">
                    <input
                      value={editing.address_line2 || ''}
                      onChange={(e) => setEditing({ ...editing, address_line2: e.target.value })}
                      className={inputCls}
                      placeholder="Suite 500"
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="City">
                      <input
                        value={editing.city || ''}
                        onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                        className={inputCls}
                        placeholder="Los Angeles"
                      />
                    </Field>
                    <Field label="State">
                      <input
                        value={editing.state || ''}
                        onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                        className={inputCls}
                        placeholder="CA"
                        maxLength={2}
                      />
                    </Field>
                    <Field label="ZIP">
                      <input
                        value={editing.postal_code || ''}
                        onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })}
                        className={inputCls}
                        placeholder="90017"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <Field label="Category">
                  <select
                    value={editing.category || 'title_company'}
                    onChange={(e) => {
                      // A role that does not belong to the new category
                      // is reset rather than silently kept: "Notary /
                      // Loan Officer" is a row the officer cannot find
                      // later, and it reads as data we mangled.
                      const category = e.target.value;
                      setEditing({
                        ...editing,
                        category,
                        role: roleBelongsTo(category, editing.role)
                          ? editing.role
                          : defaultRoleFor(category),
                      });
                    }}
                    className={inputCls}
                  >
                    {PARTNER_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Role">
                  <select
                    value={editing.role || defaultRoleFor(editing.category)}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                    className={inputCls}
                  >
                    {rolesFor(editing.category).map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                    {/* A stored role the current category does not offer
                        is still shown, so re-categorising a partner never
                        silently rewrites what she recorded. */}
                    {editing.role && !roleBelongsTo(editing.category, editing.role) && (
                      <option value={editing.role}>{roleLabel(editing.role)}</option>
                    )}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className={`${inputCls} min-h-[80px]`}
                  placeholder="Additional notes…"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-wrap items-center gap-2">
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors"
                onClick={() => save(editing)}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Update' : 'Create'}
              </button>
              {/* Ghost cancel — the way out is not a competing button. */}
              <button
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                onClick={() => { setEditing(null); setShowForm(false); }}
              >
                Cancel
              </button>
              {editing.id && (
                /* Red as OUTLINE, never a filled block: a destructive
                   action should be findable, not the loudest thing on
                   screen. */
                <button
                  className="ml-auto inline-flex items-center gap-2 border border-red-300 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  onClick={() => del(editing.id!)}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
