/**
 * U1.2 — the dashboard's "Continue where you left off?" banner must point
 * at the deed the user actually last touched. The deeds list arrives
 * created_at DESC, so `find(...)` returned the most recently CREATED
 * draft — a fossil draft from weeks ago could shadow the one edited a
 * minute ago. Pick by updated_at (falling back to created_at for rows
 * that predate updated_at stamping).
 */

interface DraftishDeed {
  id: number;
  status?: string;
  updated_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

function lastTouched(d: DraftishDeed): number {
  const ts = d.updated_at || d.created_at;
  const parsed = ts ? Date.parse(ts) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function pickInProgressDeed<T extends DraftishDeed>(deeds: T[]): T | undefined {
  return deeds
    .filter((d) => d.status === 'draft' || d.status === 'in_progress')
    .sort((a, b) => lastTouched(b) - lastTouched(a))[0];
}
