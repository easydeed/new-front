// frontend/src/lib/wizard/legalShowIf.ts
// Foundation v8: keep Legal Description step ALWAYS in the flow to prevent array shrink.
// Navigation stays stable and users can always go back to edit.
export function shouldShowLegal(_state: any): boolean {
  return true;
}
