'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Partner {
  id: string;
  category: string;
  role?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerOption {
  id: string;
  label: string;        // Display name (company_name or contact_name)
  category: string;
  company_name?: string;
  contact_name?: string;
}

export interface CreatePartnerData {
  category: string;
  role?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
}

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface PartnersContextValue {
  // Data
  partners: PartnerOption[];
  
  // Aliases for compatibility (some components use 'items')
  items: PartnerOption[];
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  reload: () => Promise<void>;
  refresh: () => Promise<void>;  // Alias for reload
  create: (data: CreatePartnerData) => Promise<Partner | null>;
  
  // Helpers
  getPartnerById: (id: string) => PartnerOption | undefined;
  getPartnersByCategory: (category: string) => PartnerOption[];
}

const PartnersContext = createContext<PartnersContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function PartnersProvider({ children }: { children: React.ReactNode }) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners from API
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = typeof window !== 'undefined' 
        ? (localStorage.getItem('access_token') || localStorage.getItem('token'))
        : null;
        
      if (!token) {
        setPartners([]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/partners/selectlist/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Auth error - just show empty list
          setPartners([]);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch partners: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both array and object response formats
      const raw = Array.isArray(data) ? data : (data?.options || data?.partners || []);
      
      // Normalize the data to PartnerOption format
      const normalized: PartnerOption[] = raw.map((item: any) => ({
        id: String(item.id),
        label: item.name || item.label || item.company_name || item.contact_name || 'Unknown',
        category: item.category || 'other',
        company_name: item.company_name,
        contact_name: item.contact_name,
      }));

      setPartners(normalized);
    } catch (err) {
      console.error('[Partners] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partners');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new partner
  const createPartner = useCallback(async (data: CreatePartnerData): Promise<Partner | null> => {
    try {
      const token = typeof window !== 'undefined' 
        ? (localStorage.getItem('access_token') || localStorage.getItem('token'))
        : null;
        
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create partner: ${response.status}`);
      }

      const newPartner = await response.json();
      
      // Refresh the list to include the new partner
      await fetchPartners();
      
      return newPartner;
    } catch (err) {
      console.error('[Partners] Create error:', err);
      throw err;
    }
  }, [fetchPartners]);

  // Helper: Get partner by ID
  const getPartnerById = useCallback((id: string) => {
    return partners.find(p => p.id === id);
  }, [partners]);

  // Helper: Get partners by category
  const getPartnersByCategory = useCallback((category: string) => {
    return partners.filter(p => p.category === category);
  }, [partners]);

  // Initial fetch
  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const value: PartnersContextValue = {
    // Data
    partners,
    items: partners,  // Alias for compatibility
    
    // State
    loading,
    error,
    
    // Actions
    reload: fetchPartners,
    refresh: fetchPartners,  // Alias
    create: createPartner,
    
    // Helpers
    getPartnerById,
    getPartnersByCategory,
  };

  return (
    <PartnersContext.Provider value={value}>
      {children}
    </PartnersContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePartners() {
  const context = useContext(PartnersContext);
  if (!context) {
    // Return a default value instead of throwing for SSR compatibility
    return {
      partners: [],
      items: [],
      loading: false,
      error: null,
      reload: async () => {},
      refresh: async () => {},
      create: async () => null,
      getPartnerById: () => undefined,
      getPartnersByCategory: () => [],
    };
  }
  return context;
}

// Default export for compatibility
export default PartnersContext;
