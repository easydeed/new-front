/**
 * U1.2 — the Continue banner points at the deed the user LAST TOUCHED.
 *
 * The deeds list arrives created_at DESC; `find(draft)` therefore returned
 * the most recently CREATED draft, so a weeks-old fossil could shadow the
 * draft edited a minute ago. pickInProgressDeed orders by updated_at.
 */
import { describe, expect, it } from '@jest/globals';
import { pickInProgressDeed } from '../lib/latestDraft';

describe('pickInProgressDeed', () => {
  it('picks the draft with the latest updated_at, not the list order', () => {
    const picked = pickInProgressDeed([
      { id: 30, status: 'draft', created_at: '2026-07-25T10:00:00+00:00', updated_at: '2026-07-25T10:00:00+00:00' },
      { id: 20, status: 'completed', created_at: '2026-07-20T10:00:00+00:00', updated_at: '2026-07-20T10:00:00+00:00' },
      { id: 10, status: 'draft', created_at: '2026-07-01T10:00:00+00:00', updated_at: '2026-07-28T09:59:00+00:00' },
    ]);
    // id 30 is first in the list (newest created); id 10 was edited today.
    expect(picked?.id).toBe(10);
  });

  it('ignores completed and deleted-ish rows entirely', () => {
    const picked = pickInProgressDeed([
      { id: 1, status: 'completed', updated_at: '2026-07-28T10:00:00+00:00' },
      { id: 2, status: 'draft', updated_at: '2026-07-01T10:00:00+00:00' },
    ]);
    expect(picked?.id).toBe(2);
  });

  it('falls back to created_at for rows without updated_at', () => {
    const picked = pickInProgressDeed([
      { id: 1, status: 'draft', created_at: '2026-07-10T10:00:00+00:00', updated_at: null },
      { id: 2, status: 'draft', created_at: '2026-07-20T10:00:00+00:00', updated_at: null },
    ]);
    expect(picked?.id).toBe(2);
  });

  it('returns undefined when there is nothing in progress', () => {
    expect(pickInProgressDeed([{ id: 1, status: 'completed' }])).toBeUndefined();
    expect(pickInProgressDeed([])).toBeUndefined();
  });

  it('still finds legacy in_progress rows', () => {
    expect(pickInProgressDeed([{ id: 5, status: 'in_progress' }])?.id).toBe(5);
  });
});
