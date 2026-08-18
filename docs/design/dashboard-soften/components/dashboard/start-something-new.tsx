// components/dashboard/start-something-new.tsx
"use client";

import Link from "next/link";

/**
 * Two states, on purpose.
 *
 * While setup is incomplete this renders as a quiet dashed teaser with a
 * GREY button — it must not compete with the violet CTA in the checklist.
 * Once setup is done the checklist unmounts and this becomes the primary
 * card, with the full instrument list.
 */

const FEATURED = ["Grant Deed", "Interspousal Transfer Deed", "Quitclaim Deed"];

export function StartSomethingNew({
  setupComplete,
  countyName,
}: {
  setupComplete: boolean;
  countyName?: string | null;
}) {
  if (!setupComplete) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-700">
            Start something new
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            21 California instruments, ready once your county is set.
          </p>
        </div>
        <Link
          href="/deeds/instruments"
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Peek at the list
        </Link>
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900">Start something new</h2>
      {countyName && (
        <p className="mt-1 text-sm text-gray-500">
          Recording in {countyName} County.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2.5">
        {FEATURED.map((name) => (
          <Link
            key={name}
            href={`/deeds/new?type=${encodeURIComponent(name)}`}
            className="rounded-xl border border-[#E4DDFF] bg-gradient-to-b from-white to-[var(--color-brand-light)] px-3.5 py-2.5 text-[13.5px] font-semibold text-[var(--color-brand-hover)] transition hover:border-[var(--color-brand)]"
          >
            {name}
          </Link>
        ))}
      </div>
      <Link
        href="/deeds/instruments"
        className="mt-3 inline-block text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
      >
        Browse all 21 California instruments →
      </Link>
    </section>
  );
}
