// components/dashboard/deed-header-preview.tsx
"use client";

/**
 * Replaces "Where your company lands" + the "Recording county: Not set" row
 * in the plan card.
 *
 * The old version restated the checklist in different words, so a new user
 * read the same three facts twice. This version shows the ACTUAL artifact
 * being assembled, and each line fills in as its step completes — the card
 * turns from redundant noise into feedback.
 *
 * Empty lines are grey and say which step fills them. They are never red or
 * amber: nothing is wrong, the user just hasn't got there yet.
 */

interface Props {
  companyName?: string | null;
  mailToAddress?: string | null;
  county?: string | null;
  /** Set when a value landed this session — plays a one-off highlight. */
  justFilled?: "companyName" | "mailToAddress" | "county" | null;
}

export function DeedHeaderPreview({
  companyName,
  mailToAddress,
  county,
  justFilled = null,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 className="text-sm font-bold text-gray-900">Your deed header</h2>

      <dl className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 text-[12.5px] leading-relaxed">
        <Line
          label="RECORDING REQUESTED BY"
          value={companyName}
          fallback="fills in at step 1"
          highlight={justFilled === "companyName"}
        />
        <Line
          label="AND WHEN RECORDED MAIL TO"
          value={mailToAddress}
          fallback="fills in at step 3"
          highlight={justFilled === "mailToAddress"}
        />
        <Line
          label="COUNTY"
          value={county}
          fallback="fills in at step 2"
          highlight={justFilled === "county"}
        />
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        This block prints at the top of every deed you make.
      </p>
    </section>
  );
}

function Line({
  label,
  value,
  fallback,
  highlight,
}: {
  label: string;
  value?: string | null;
  fallback: string;
  highlight?: boolean;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <dt className="text-[9.5px] font-bold tracking-[0.09em] text-gray-400">
        {label}:
      </dt>
      <dd
        className={
          value
            ? `-mx-1 rounded px-1 font-semibold text-gray-900 ${
                highlight
                  ? "bg-[var(--color-brand-light)] text-[var(--color-brand)] motion-safe:animate-pulse"
                  : ""
              }`
            : "italic text-gray-400"
        }
      >
        {value || fallback}
      </dd>
    </div>
  );
}
