'use client';

/**
 * The officer's own company, from the one column that holds it.
 *
 * `users.company_name` is canonical (owner-ruled) — the same value the
 * Settings page writes and `GET /users/profile` returns. The builder
 * reads it here so that correcting your company in Settings corrects
 * what pre-fills Recording Requested By, which was not true while the
 * pre-fill read a second copy in `user_profiles`.
 *
 * ═══ A FAILED FETCH IS NOT AN EMPTY COMPANY ═══
 *
 * Both come back as "no default offered", because there is nothing
 * honest to put in the box either way. The difference matters to the
 * caller only in that this hook never invents a company and never
 * retries into a loop: one ask per mount, and the officer's own typing
 * is unaffected by the answer.
 *
 * It is deliberately silent. This is a convenience default on a field
 * with a visible, editable control — a toast about a background profile
 * read would be noise on a screen where nothing is broken.
 */
import { useEffect, useState } from 'react';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';

export interface OwnCompany {
  companyName: string;
  /**
   * The business address, so recording under your own company fills the
   * address line the same way selecting a partner does. Both come from
   * the record; neither is typed twice.
   */
  companyAddress: string;
  /** True until the profile answers, so callers can avoid a flash. */
  loading: boolean;
}

export function useOwnCompany(): OwnCompany {
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await apiFetch('/users/profile', {}, {
          label: 'Profile', silent: true,
        });
        if (!live) return;
        if (res.ok) {
          const body = await res.json();
          setCompanyName((body?.company_name || '').trim());
          setCompanyAddress((body?.business_address || '').trim());
        }
      } catch (err) {
        if (!(err instanceof SessionExpiredError)) {
          console.warn('[own-company] profile read failed:', err);
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  return { companyName, companyAddress, loading };
}
