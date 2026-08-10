'use client';

/**
 * PARTNER2 / Part B — pick a recipient from the rolodex she already built.
 *
 * ═══ THE COMPLAINT THIS ANSWERS ═══
 *
 * Both share flows asked for a typed email address. The officer has a
 * partners screen, she has filled it in, her notary and her title
 * officers are in it with their addresses — and every time she shared a
 * deed the product asked her to type an email from memory. She built a
 * rolodex; the product ignored it.
 *
 * So the list is the DEFAULT and typing is the FALLBACK, which is the
 * inversion this component exists to perform. "Someone else" is still
 * there, because a one-off recipient is real and forcing her to create a
 * partner row for a person she will email once would be the product
 * being tidy at her expense.
 *
 * ═══ WHY IT FILTERS BUT DOES NOT RESTRICT ═══
 *
 * A signing request suggests notaries first, because that is who a
 * signing request goes to. It does not HIDE the rest: a mobile notary
 * filed under "other" three months ago is still the person she wants,
 * and a picker that knows better than her about her own contacts is a
 * picker she works around. Suggested-first, everyone-available.
 *
 * ═══ A PARTNER WITH NO EMAIL IS SHOWN, AND SAYS SO ═══
 *
 * Rather than filtered out. She stored them for a reason, and "why is
 * Dana missing from this list" is a worse five minutes than an inline
 * note saying no address is on file.
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Mail, Plus, Search, UserPlus } from 'lucide-react';
import { PartnerOption, usePartners } from './PartnersContext';
import { QuickAddPartnerModal } from './QuickAddPartnerModal';
import { categoryLabel, roleLabel } from '@/lib/partnerRegistry';

export interface Recipient {
  email: string;
  name: string;
  /** NOTARY2: the notary's company appears on the SIGNER surface — a
   * consumer told a stranger is coming to their home should know who and
   * from where (owner ruling 2). So it travels with the pick rather than
   * being looked up again later from an id that may be null. */
  company?: string;
  /** Set when she picked from the rolodex; absent for a typed address. */
  partnerId?: string;
}

export function PartnerRecipientPicker({
  value,
  onChange,
  suggestCategory,
  label = 'Send to',
}: {
  value: Recipient | null;
  onChange: (r: Recipient | null) => void;
  /** Category floated to the top. Never used to hide anyone. */
  suggestCategory?: string;
  label?: string;
}) {
  const { partners, loading, refresh } = usePartners();
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    if (!partners.length) refresh?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (p: PartnerOption) =>
      !q ||
      [p.label, p.contact_name, p.email, categoryLabel(p.category)]
        .some((f) => (f || '').toLowerCase().includes(q));
    const hits = partners.filter(matches);
    if (!suggestCategory) return hits;
    // Suggested first, everyone still present.
    return [
      ...hits.filter((p) => p.category === suggestCategory),
      ...hits.filter((p) => p.category !== suggestCategory),
    ];
  }, [partners, query, suggestCategory]);

  const suggestedCount = suggestCategory
    ? partners.filter((p) => p.category === suggestCategory).length
    : 0;

  const choose = (p: PartnerOption) => {
    if (!p.email) return;
    onChange({
      email: p.email,
      name: p.contact_name || p.company_name || p.label,
      company: p.company_name || (p.contact_name ? p.label : undefined),
      partnerId: p.id,
    });
    setOpen(false);
    setQuery('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>

      {typing ? (
        <div className="space-y-2">
          <input
            type="email"
            autoFocus
            value={value?.email || ''}
            onChange={(e) => onChange({ email: e.target.value, name: value?.name || '' })}
            placeholder="name@example.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
          />
          <input
            type="text"
            value={value?.name || ''}
            onChange={(e) => onChange({ email: value?.email || '', name: e.target.value })}
            placeholder="Their name (optional)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF]"
          />
          <button
            type="button"
            onClick={() => { setTyping(false); onChange(null); }}
            className="text-sm text-[#7C4DFF] hover:underline"
          >
            ← Choose from my partners instead
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-lg text-left hover:bg-slate-50"
          >
            {value ? (
              <span className="min-w-0">
                <span className="block font-medium text-slate-800 truncate">{value.name || value.email}</span>
                <span className="block text-xs text-slate-500 truncate">{value.email}</span>
              </span>
            ) : (
              <span className="text-slate-500">
                {loading ? 'Loading your partners…' : 'Choose from my partners'}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your partners"
                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-[#7C4DFF]"
                  />
                </div>
              </div>

              {ordered.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">
                  {partners.length === 0
                    ? 'No partners yet — add one below, or type an address.'
                    : 'Nobody matches that.'}
                </p>
              )}

              {ordered.map((p, i) => {
                const isSuggested = !!suggestCategory && p.category === suggestCategory;
                const firstOther = !!suggestCategory && i === suggestedCount && suggestedCount > 0 && !query;
                return (
                  <div key={p.id}>
                    {firstOther && (
                      <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50">
                        Everyone else
                      </div>
                    )}
                    {isSuggested && i === 0 && !query && (
                      <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50">
                        {categoryLabel(suggestCategory)}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!p.email}
                      onClick={() => choose(p)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:hover:bg-white disabled:cursor-not-allowed"
                    >
                      <span className="block text-sm font-medium text-slate-800 truncate">
                        {p.contact_name ? `${p.contact_name} — ${p.label}` : p.label}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {p.email ? (
                          <>
                            <Mail className="inline w-3 h-3 mr-1 -mt-0.5" />
                            {p.email}
                          </>
                        ) : (
                          // Shown, not hidden — "why is Dana missing" is a
                          // worse five minutes than this sentence.
                          <span className="text-amber-700">No email on file — add one on the Partners page</span>
                        )}
                        {p.role ? ` · ${roleLabel(p.role)}` : ''}
                      </span>
                    </button>
                  </div>
                );
              })}

              <div className="sticky bottom-0 bg-white border-t border-slate-100 flex">
                <button
                  type="button"
                  onClick={() => { setQuickAdd(true); setOpen(false); }}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-[#7C4DFF] hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" /> Add a new partner
                </button>
                <button
                  type="button"
                  onClick={() => { setTyping(true); setOpen(false); onChange(null); }}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 border-l border-slate-100"
                >
                  <UserPlus className="w-4 h-4" /> Someone else
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline creation, reusing the existing path rather than a second
          create form — a fourth partner-creation surface is how the
          category lists diverged in the first place. */}
      <QuickAddPartnerModal
        isOpen={quickAdd}
        onClose={() => setQuickAdd(false)}
        initialCategory={suggestCategory}
        onCreated={(created) => {
          setQuickAdd(false);
          if (created.email) {
            onChange({ email: created.email, name: created.label, partnerId: created.id });
          } else {
            // Created without an address: say so instead of selecting a
            // recipient we cannot reach.
            setTyping(true);
            onChange({ email: '', name: created.label });
          }
          refresh?.();
        }}
      />
    </div>
  );
}
