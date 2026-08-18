// app/dashboard/page.tsx  (App Router — server component)
//
// Drop-in replacement for the current dashboard body. Data fetching is
// stubbed at `getDashboardData` — wire it to whatever you already use.

import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { DeedHeaderPreview } from "@/components/dashboard/deed-header-preview";
import { StartSomethingNew } from "@/components/dashboard/start-something-new";
import { EmailNotice } from "@/components/dashboard/email-notice";
import { isSetupComplete, type SetupState } from "@/components/dashboard/setup-steps";
import Link from "next/link";

export default async function DashboardPage() {
  const d = await getDashboardData();

  const setup: SetupState = {
    company_name: Boolean(d.companyName),
    recording_county: Boolean(d.county),
    business_address: Boolean(d.mailToAddress),
    first_deed: d.deedCount > 0,
  };
  const complete = isSetupComplete(setup);

  return (
    <div className="mx-auto max-w-6xl">
      {!d.emailConfirmed && (
        <EmailNotice email={d.email} onResend={resendConfirmation} />
      )}

      <h1 className="mt-5 text-xl font-bold text-gray-900">
        {greeting()}, {d.firstName}.
      </h1>
      {/* Subhead states the next move, not the abstract state of things.
          "Here's where your deeds stand" is false on day one — they have none. */}
      <p className="mt-1 text-sm text-gray-500">
        {complete
          ? "Here's where your deeds stand."
          : "One quick thing, then you can make your first deed."}
      </p>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[2fr,1fr]">
        <div>
          <SetupChecklist
            state={setup}
            values={{ company_name: d.companyName ?? undefined }}
          />
          <StartSomethingNew setupComplete={complete} countyName={d.county} />
        </div>

        <div>
          <DeedHeaderPreview
            companyName={d.companyName}
            mailToAddress={d.mailToAddress}
            county={d.county}
          />

          {/* Plan card demoted to one line. It was a third competing CTA and
              its "Recording county: Not set" row duplicated step 2 — in
              orange, which read as an error. */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
            <span>
              {d.plan === "free"
                ? "Free plan · Professional is free for 14 days"
                : "Professional plan"}
            </span>
            <Link
              href="/settings/plan"
              className="shrink-0 font-semibold text-[var(--color-brand)] hover:underline"
            >
              Compare
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* ---- replace these two with your real data layer ---- */

async function getDashboardData() {
  return {
    firstName: "Jaxxon",
    email: "info@modernagent.io",
    emailConfirmed: false,
    companyName: "All Good Escrow" as string | null,
    mailToAddress: null as string | null,
    county: null as string | null,
    deedCount: 0,
    plan: "free" as "free" | "professional",
  };
}

async function resendConfirmation() {
  "use server";
  // POST /api/auth/resend-confirmation
}
