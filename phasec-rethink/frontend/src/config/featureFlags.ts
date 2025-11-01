// Phase 24-C: add modern wizard V0 flag (non-breaking)
export const FEATURE_FLAGS = {
  // Existing flags…
  NEW_LANDING_PAGE: false,
  NEW_DASHBOARD: false,
  NEW_WIZARD_MODERN_V0: false,   // <— flip to true to enable V0 shell
} as const;
