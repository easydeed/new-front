// components/dashboard/setup-steps.ts
//
// Single source of truth for onboarding. The dashboard, the settings page and
// any "you still need to…" nudge should all read from this — so copy never
// drifts between surfaces.

export type SetupStepId =
  | "company_name"
  | "recording_county"
  | "business_address"
  | "first_deed";

export interface SetupStep {
  id: SetupStepId;
  /** Short label. Used when the step is collapsed. Keep under ~28 chars. */
  title: string;
  /** Longer label, shown only while the step is the active one. */
  activeTitle: string;
  /**
   * Why this matters, in deed terms. ONE sentence, max ~20 words.
   * Only ever rendered for the active step — see the accordion rule below.
   */
  why: string;
  cta: string;
  href: string;
}

export const SETUP_STEPS: SetupStep[] = [
  {
    id: "company_name",
    title: "Company name",
    activeTitle: "Add your company name",
    why: "Prints on the RECORDING REQUESTED BY line at the top of every deed.",
    cta: "Add company name",
    href: "/settings/company",
  },
  {
    id: "recording_county",
    title: "Recording county",
    activeTitle: "Set your recording county",
    why: "Becomes the default on every new deed. You can change it on any single one.",
    cta: "Set county",
    href: "/settings/county",
  },
  {
    id: "business_address",
    title: "Business address",
    activeTitle: "Add your business address",
    why: "Where the recorder mails the document back after it records.",
    cta: "Add address",
    href: "/settings/address",
  },
  {
    id: "first_deed",
    title: "Make your first deed",
    activeTitle: "Make your first deed",
    why: "Start from an address — APN, legal description and owner come back from county records.",
    cta: "Start a deed",
    href: "/deeds/new",
  },
];

export type SetupState = Record<SetupStepId, boolean>;

/** The first incomplete step, in declared order. `null` once setup is done. */
export function activeStep(state: SetupState): SetupStep | null {
  return SETUP_STEPS.find((s) => !state[s.id]) ?? null;
}

export function completedCount(state: SetupState): number {
  return SETUP_STEPS.filter((s) => state[s.id]).length;
}

export function isSetupComplete(state: SetupState): boolean {
  return completedCount(state) === SETUP_STEPS.length;
}
