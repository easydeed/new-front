'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, ChevronRight, FileText, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { FormTypeConfig, SITUATION_GROUP_ORDER, formConfig } from '@/lib/formRegistry';
import { groupedForms, searchForms } from '@/lib/formSearch';
import { apiFetch } from '@/lib/apiClient';

// CAT1 — the catalog's front door, three registry-driven layers:
// search (situation words), grouped browse (desk taxonomy), recents.
// ORGANIZATION ONLY, deliberately: no wizard, no "we picked for you" —
// choosing the instrument is the OFFICER'S legal decision (Flag-3
// doctrine: the instrument choice is the decision its recitals assert).
// The picker translates situations into a scannable catalog; the officer
// selects.

export default function DeedBuilderSelectPage() {
  // HX0: internal tool — no session, no shell.
  const { checked } = useRequireAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [SITUATION_GROUP_ORDER[0]]: true,
  });
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  // Recents: this account's most-generated types, from the existing
  // deeds list (no new backend route). Silent — a picker without a
  // recents strip is fine; a toast about it is noise.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await apiFetch('/deeds', {}, { label: 'Loading recent types', silent: true });
        if (!resp.ok) return;
        const body = await resp.json();
        const counts = new Map<string, number>();
        for (const d of body.deeds ?? []) {
          if (d.deed_type && formConfig(d.deed_type)) {
            counts.set(d.deed_type, (counts.get(d.deed_type) ?? 0) + 1);
          }
        }
        const top = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([slug]) => slug);
        if (alive) setRecentSlugs(top);
      } catch {
        /* silent: recents are a convenience, never a blocker */
      }
    })();
    return () => { alive = false; };
  }, []);

  const results = useMemo(() => (query.trim() ? searchForms(query) : null), [query]);
  const groups = useMemo(() => groupedForms(), []);

  const select = (slug: string) => router.push(`/deed-builder/${slug}`);

  if (!checked) return null;

  const card = (f: FormTypeConfig) => (
    <button
      key={f.slug}
      onClick={() => select(f.slug)}
      className="group relative flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
          <FileText className="w-5 h-5 text-brand-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{f.label}</h3>
          {f.popular && (
            <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
              Popular
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm mt-0.5">{f.description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Document</h1>
            <p className="text-gray-600">
              Search by situation or browse the catalog. You choose the instrument.
            </p>
          </div>

          {/* Layer 1 — search first */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter selects the top hit — the catalog's first match,
                // shown on screen; never a hidden "best guess".
                if (e.key === 'Enter' && results && results.length > 0) {
                  select(results[0].slug);
                }
              }}
              placeholder='Try "death", "corporation", "trust", "homestead"…'
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-gray-900"
            />
          </div>

          {results ? (
            /* Search results — flat, registry order */
            <div className="grid gap-3">
              {results.length === 0 ? (
                <p className="text-gray-500 text-sm px-1">
                  No matching document types. Try a different word, or browse by clearing the search.
                </p>
              ) : (
                results.map(card)
              )}
            </div>
          ) : (
            <>
              {/* Layer 3 — recents on top */}
              {recentSlugs.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Recently used
                  </h2>
                  <div className="grid gap-2">
                    {recentSlugs.map((slug) => {
                      const f = formConfig(slug);
                      return f ? card(f) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Layer 2 — grouped browse, desk taxonomy */}
              <div className="space-y-3">
                {groups.map(({ group, forms }) => {
                  const open = !!expanded[group];
                  return (
                    <div key={group} className="bg-white rounded-xl border border-gray-200">
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [group]: !open }))}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                      >
                        <span className="font-semibold text-gray-900">
                          {group}
                          <span className="ml-2 text-sm font-normal text-gray-400">
                            {forms.length}
                          </span>
                        </span>
                        {open ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {open && <div className="px-4 pb-4 grid gap-2">{forms.map(card)}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="text-sm text-brand-800">
              The Document Builder shows a live preview as you fill in the details.
              Property information is auto-filled from county records when possible.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
