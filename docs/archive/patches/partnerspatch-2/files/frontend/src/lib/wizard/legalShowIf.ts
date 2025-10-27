// frontend/src/lib/wizard/legalShowIf.ts
// Keep legal description step visible until value is sufficiently edited.
// - Treat "Not available" (case-insensitive) as invalid.
// - Keep visible while user is actively editing (state.__editing_legal).
export function shouldShowLegal(state: any): boolean {
  try {
    const legal = (state?.legalDescription ?? '').toString();
    const norm = legal.trim().toLowerCase();
    const hasValid = norm !== '' && norm !== 'not available' && legal.length >= 12;
    if (state?.__editing_legal) return true;
    return !hasValid;
  } catch {
    return true;
  }
}
