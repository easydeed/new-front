/**
 * Phase 15 v5: Partners Context Provider
 * Purpose: Centralized state management for industry partners
 * Features: Auto-refresh, localStorage fallback, create partners inline
 */

'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PartnerSelectItem, PartnerCategory, PartnerRole, PartnerCreate } from './types';

type PartnersContextType = {
  items: PartnerSelectItem[];
  refresh: () => Promise<void>;
  create: (payload: PartnerCreate) => Promise<void>;
  loading: boolean;
};

const PartnersContext = createContext<PartnersContextType | null>(null);

export function PartnersProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PartnerSelectItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partners/selectlist', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!res.ok) {
        console.warn('[PartnersContext] Failed to fetch partners:', res.status);
        return;
      }
      
      const data = await res.json();
      setItems(data || []);
      
      // Cache to localStorage for fallback
      try {
        localStorage.setItem('partners_select_list', JSON.stringify(data));
      } catch (e) {
        console.warn('[PartnersContext] Failed to cache partners:', e);
      }
    } catch (error) {
      console.error('[PartnersContext] Error fetching partners:', error);
      
      // Fallback to localStorage cache
      try {
        const cached = localStorage.getItem('partners_select_list');
        if (cached) {
          setItems(JSON.parse(cached));
          console.log('[PartnersContext] Using cached partners');
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const create: PartnersContextType['create'] = async (payload) => {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`Failed to create partner: ${res.status}`);
      }
      
      // Refresh list after creation
      await refresh();
    } catch (error) {
      console.error('[PartnersContext] Error creating partner:', error);
      throw error;
    }
  };

  // Initial load
  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ items, refresh, create, loading }), [items, loading]);
  
  return <PartnersContext.Provider value={value}>{children}</PartnersContext.Provider>;
}

export function usePartners() {
  const ctx = useContext(PartnersContext);
  if (!ctx) {
    throw new Error('usePartners must be used within PartnersProvider');
  }
  return ctx;
}
