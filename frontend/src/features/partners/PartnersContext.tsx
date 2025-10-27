// frontend/src/features/partners/PartnersContext.tsx
// FINAL FIX: Enhanced diagnostics + better error handling
'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
    
    console.log('[PartnersContext] Loading partners…', { 
      hasToken: !!token, 
      hasOrgId: !!orgId,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      timestamp: new Date().toISOString()
    });
    
    try {
      const url = '/api/partners/selectlist';
      console.log('[PartnersContext] Fetching:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        cache: 'no-store'
      });
      
      console.log('[PartnersContext] Response:', { 
        status: res.status, 
        statusText: res.statusText,
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        fallback: res.headers.get('x-partners-fallback'),
        backendStatus: res.headers.get('x-backend-status')
      });
      
      // Check for fallback header (route returned empty array due to backend error)
      const isFallback = res.headers.get('x-partners-fallback');
      if (isFallback) {
        console.warn('[PartnersContext] Using fallback (backend error), partners will be empty');
        setPartners([]);
        setError(`fallback-${isFallback}`);
        setLoading(false);
        return;
      }
      
      // Handle auth errors
      if (res.status === 401 || res.status === 403) {
        setPartners([]);
        const t = await res.text().catch(()=>'');
        setError(`auth-${res.status}`);
        console.error('[PartnersContext] Auth error:', res.status, t);
        setLoading(false);
        return;
      }
      
      // Handle other errors
      if (!res.ok) {
        const t = await res.text().catch(()=>'');
        setPartners([]);
        setError(`http-${res.status}`);
        console.error('[PartnersContext] HTTP error:', res.status, t);
        setLoading(false);
        return;
      }
      
      // Parse response
      const data = await res.json().catch((e)=>{
        console.error('[PartnersContext] JSON parse error:', e);
        return null;
      });
      
      if (!data) {
        setPartners([]);
        setError('parse-error');
        setLoading(false);
        return;
      }
      
      const raw = Array.isArray(data) ? data : (data?.options || []);
      console.log('[PartnersContext] Raw data:', { 
        isArray: Array.isArray(data),
        rawLength: raw?.length ?? 0,
        firstItem: raw[0] ? { id: raw[0].id, name: raw[0].name, label: raw[0].label } : 'none'
      });
      
      // Transform: backend uses "name", PrefillCombo expects "label"
      const options = raw.map((p: any) => ({
        id: p.id,
        label: p.name || p.label || '',  // Map "name" to "label"
        category: p.category,
        people_count: p.people_count
      }));
      
      console.log('[PartnersContext] Transformed options:', { 
        length: options?.length ?? 0,
        firstLabel: options[0]?.label || 'none'
      });
      
      setPartners(options);
      
    } catch (e: any) {
      console.error('[PartnersContext] Exception:', {
        name: e.name,
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 3)
      });
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
