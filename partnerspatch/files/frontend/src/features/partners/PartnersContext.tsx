// frontend/src/features/partners/PartnersContext.tsx
'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type PartnerOption = { id: string | number; label: string; category?: string; people_count?: number };
type PartnersContextType = {
  partners: PartnerOption[];
  loading: boolean;
  error?: string;
  reload: () => void;
};

const PartnersContext = createContext<PartnersContextType>({
  partners: [], loading: false, reload: () => {}
});

export function PartnersProvider({ children }: { children: React.ReactNode }) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const token = (typeof window !== 'undefined') ? (localStorage.getItem('access_token') || localStorage.getItem('token')) : '';
      const orgId = (typeof window !== 'undefined') ? (localStorage.getItem('organization_id') || localStorage.getItem('org_id') || '') : '';
      const res = await fetch('/api/partners/selectlist', {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        cache: 'no-store'
      });
      if (res.status === 401 || res.status === 403) {
        setPartners([]);
        setError(`auth-${res.status}`);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        setError(`http-${res.status}`);
        console.warn('[PartnersContext] selectlist non-OK:', res.status, t);
        setPartners([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const options = Array.isArray(data) ? data : (data?.options || []);
      setPartners(options);
      setLoading(false);
    } catch (e: any) {
      console.error('[PartnersContext] load error', e);
      setError('exception');
      setLoading(false);
      setPartners([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({ partners, loading, error, reload: load }), [partners, loading, error, load]);
  return <PartnersContext.Provider value={value}>{children}</PartnersContext.Provider>;
}

export function usePartners() { return useContext(PartnersContext); }
