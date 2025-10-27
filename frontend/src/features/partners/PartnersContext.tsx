// frontend/src/features/partners/PartnersContext.tsx
'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
const DIAG = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DIAG === '1';
import { dlog } from '@/lib/diag/log';

type PartnerOption = { id: string | number; label: string; category?: string; people_count?: number };
type PartnersContextType = { partners: PartnerOption[]; loading: boolean; error?: string; reload: () => void };

const PartnersContext = createContext<PartnersContextType>({ partners: [], loading: false, reload: () => {} });

export function PartnersProvider({ children }: { children: React.ReactNode }) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    const token = (typeof window !== 'undefined') ? (localStorage.getItem('access_token') || localStorage.getItem('token')) : '';
    const orgId = (typeof window !== 'undefined') ? (localStorage.getItem('organization_id') || localStorage.getItem('org_id') || '') : '';
    dlog('PartnersContext', 'Loading partners…', { hasToken: !!token, hasOrgId: !!orgId });
    try {
      const res = await fetch('/api/partners/selectlist', {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        cache: 'no-store'
      });
      dlog('PartnersContext', 'Response', res.status, res.statusText);
      if (res.status === 401 || res.status === 403) {
        setPartners([]);
        const t = await res.text().catch(()=>'');
        setError(`auth-${res.status}`);
        dlog('PartnersContext', 'Auth error', res.status, t);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(()=>'');
        setPartners([]);
        setError(`http-${res.status}`);
        dlog('PartnersContext', 'Non-OK', res.status, t);
        setLoading(false);
        return;
      }
      const data = await res.json().catch(()=>null);
      const raw = Array.isArray(data) ? data : (data?.options || []);
      dlog('PartnersContext', 'Raw options', raw?.length ?? 0);
      
      // Transform: backend uses "name", PrefillCombo expects "label"
      const options = raw.map((p: any) => ({
        id: p.id,
        label: p.name || p.label || p.company_name || p.displayName || '',  // Map "name" to "label"
        category: p.category,
        people_count: p.people_count
      }));
      
      dlog('PartnersContext', 'Transformed options', options?.length ?? 0);
      console.log('[PARTNERS] Successfully loaded', options?.length, 'partners. First:', options?.[0]);
      setPartners(options);
    } catch (e: any) {
      dlog('PartnersContext', 'Exception', String(e));
      setPartners([]);
      setError('exception');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({ partners, loading, error, reload: load }), [partners, loading, error, load]);
  return <PartnersContext.Provider value={value}>{children}</PartnersContext.Provider>;
}

export function usePartners() { return useContext(PartnersContext); }
