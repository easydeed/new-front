
'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Partner, PartnerPerson, PartnerSelectItem, PartnerCategory, PartnerRole } from './types';

type Ctx = {
  items: PartnerSelectItem[];
  refresh: () => Promise<void>;
  create: (payload: { name: string; category: PartnerCategory; person?: { name: string; role?: PartnerRole; email?: string; phone?: string } }) => Promise<void>;
};

const PartnersContext = createContext<Ctx | null>(null);

export function PartnersProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PartnerSelectItem[]>([]);

  const refresh = async () => {
    try {
      const res = await fetch('/api/partners/selectlist');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data || []);
      // Also stash to localStorage for Modern flow fallback
      try { localStorage.setItem('partners_select_list', JSON.stringify(data)); } catch {}
    } catch {}
  };

  const create: Ctx['create'] = async (payload) => {
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) await refresh();
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({ items, refresh, create }), [items]);
  return <PartnersContext.Provider value={value}>{children}</PartnersContext.Provider>;
}

export function usePartners() {
  const ctx = useContext(PartnersContext);
  if (!ctx) throw new Error('usePartners must be used within PartnersProvider');
  return ctx;
}
