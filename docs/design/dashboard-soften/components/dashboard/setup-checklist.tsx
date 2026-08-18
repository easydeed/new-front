// components/dashboard/setup-checklist.tsx
"use client";

import Link from "next/link";
import {
  SETUP_STEPS,
  activeStep,
  completedCount,
  type SetupState,
  type SetupStep,
} from "./setup-steps";

/**
 * THE ONE RULE THIS COMPONENT ENFORCES:
 * exactly one step is expanded, and it is the first incomplete one.
 *
 * Completed steps collapse to a single line with a green check.
 * Later steps render as title-only, muted, with no body copy and no button.
 * If you add a second primary (violet) button anywhere on this page, the
 * hierarchy breaks and you're back to the old dashboard.
 */

interface Props {
  state: SetupState;
  /** e.g. { company_name: "All Good Escrow" } — shown as a chip on done rows. */
  values?: Partial<Record<SetupStep["id"], string>>;
}

export function SetupChecklist({ state, values = {} }: Props) {
  const active = activeStep(state);
  const done = completedCount(state);
  const total = SETUP_STEPS.length;
  const pct = Math.round((done / total) * 100);

  if (!active) return null; // setup finished — render nothing, free the space

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6"
      aria-labelledby="setup-heading"
    >
      <h2 id="setup-heading" className="text-lg font-bold text-gray-900">
        Getting set up
      </h2>

      {/* Progress lives at the TOP. "1 of 4 done" buried at the bottom is a
          reward the user never sees. */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${done} of ${total} setup steps complete`}
        >
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-gray-500">
          {done} of {total}
        </span>
      </div>

      <ol className="mt-3 space-y-2">
        {SETUP_STEPS.map((step, i) => {
          if (state[step.id]) {
            return (
              <DoneRow key={step.id} step={step} value={values[step.id]} />
            );
          }
          if (step.id === active.id) {
            return <ActiveRow key={step.id} step={step} index={i + 1} />;
          }
          return <PendingRow key={step.id} step={step} index={i + 1} />;
        })}
      </ol>

      {/* The reassurance line the old design put at the top, where it competed
          with the steps. It belongs after them, as a footnote. */}
      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        Every step here is something the deed itself prints — none of it is
        profile decoration.
      </p>
    </section>
  );
}

/* ---------- rows ---------- */

function DoneRow({ step, value }: { step: SetupStep; value?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3.5 py-3 opacity-70">
      <span
        className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-600"
        aria-hidden
      >
        ✓
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700">
        {step.title}
        <span className="sr-only"> — done</span>
      </span>
      {value && (
        <span className="max-w-[45%] truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-600">
          {value}
        </span>
      )}
    </li>
  );
}

function ActiveRow({ step, index }: { step: SetupStep; index: number }) {
  return (
    <li
      className="flex items-start gap-3 rounded-xl border border-[#E4DDFF] bg-[var(--color-brand-light)] p-4"
      aria-current="step"
    >
      <span
        className="mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[11.5px] font-bold text-white"
        aria-hidden
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15.5px] font-semibold text-gray-900">
          {step.activeTitle}
        </h3>
        {/* The ONLY body copy on the card. */}
        <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-[#4B3B7A]">
          {step.why}
        </p>
        <Link
          href={step.href}
          className="mt-3 inline-flex items-center rounded-lg bg-[var(--color-brand)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--color-brand-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          {step.cta}
        </Link>
      </div>
    </li>
  );
}

function PendingRow({ step, index }: { step: SetupStep; index: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3.5 py-3">
      <span
        className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11.5px] font-bold text-gray-400"
        aria-hidden
      >
        {index}
      </span>
      {/* No `why`, no button. Deliberately. */}
      <span className="flex-1 text-sm font-medium text-gray-700">
        {step.title}
      </span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11.5px] font-semibold text-gray-400">
        next
      </span>
    </li>
  );
}
