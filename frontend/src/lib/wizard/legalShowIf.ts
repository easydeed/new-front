// frontend/src/lib/wizard/legalShowIf.ts
// ALWAYS show legal description step to prevent dynamic step filtering.
// Dynamic filtering causes step indices to shift mid-flow, breaking navigation.
// The step is either empty (needs filling) or filled (user might want to edit).
export function shouldShowLegal(state: any): boolean {
  // Always return true to keep step in flow
  // This prevents the step from disappearing after filling,
  // which would cause step count to change (e.g., 5→4) and break navigation
  return true;
}
