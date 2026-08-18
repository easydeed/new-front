// components/dashboard/email-notice.tsx
"use client";

import { useState } from "react";

/**
 * Was: a full amber alert banner, top of page, before the user has done
 * anything wrong. Amber is reserved for real problems (a rejected recording,
 * a failed signature) — spend it there, not here.
 *
 * Now: a neutral strip with a single amber dot, and copy that states the
 * consequence rather than the state.
 */
export function EmailNotice({
  email,
  onResend,
}: {
  email: string;
  onResend: () => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13.5px]">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-gray-500">
        Confirm your email so signing invites can reach you.
        <span className="hidden text-gray-400 sm:inline"> ({email})</span>
      </span>
      <button
        type="button"
        disabled={status !== "idle"}
        onClick={async () => {
          setStatus("sending");
          await onResend();
          setStatus("sent");
        }}
        className="shrink-0 font-semibold text-[var(--color-brand)] hover:underline disabled:opacity-60"
      >
        {status === "sent" ? "Sent ✓" : status === "sending" ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}
