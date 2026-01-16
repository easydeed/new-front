# DeedPro Industry Partners - Surgical Cleanup & Fix

## Overview

The Industry Partners feature is a mess of conflicting schemas, broken components, and muddled concepts. However, the **core flow works** — we just need to clean up the debris and fix the broken pieces.

**What Works (DON'T TOUCH):**
- `backend/routers/partners.py` — API endpoints work
- `backend/services/partners.py` — Service layer works
- `frontend/src/features/partners/client/PartnersManager.tsx` — CRUD UI works
- `frontend/src/features/wizard/mode/components/PrefillCombo.tsx` — Wizard integration works
- Partner selection → PDF generation flow — Works end-to-end

**What's Broken:**
- `PartnersContext.tsx` — Interface doesn't match consumers
- `IndustryPartnersPanel.tsx` — Expects wrong interface, unusable
- `PartnersSelect.tsx` — Expects wrong interface, unusable
- `partner_people` table — Wrong data types, orphaned
- Concept confusion between "Industry Partners" and "API Partners"

---

## Phase 1: Delete Dead Code (15 minutes)

### 1.1 Delete Broken Frontend Components

These components are broken and unused. Delete them:

```bash
# Delete broken components
rm frontend/src/features/partners/IndustryPartnersPanel.tsx
rm frontend/src/features/partners/PartnersSelect.tsx

# Delete backup files
rm frontend/src/features/partners/PartnersContext.tsx.bak.v8_2
rm -f frontend/src/features/partners/*.bak*
```

### 1.2 Delete Conflicting Migration

```bash
# Delete the wrong schema migration (keep the v2 Python one)
rm backend/migrations/20251016_add_partners_org_scoped.sql
```

### 1.3 Verify No Imports

Search the codebase for any imports of deleted files:

```bash
# Search for imports (should return nothing after cleanup)
grep -r "IndustryPartnersPanel" frontend/src/
grep -r "PartnersSelect" frontend/src/
```

If any imports are found, remove them or replace with working alternatives.

---

## Phase 2: Fix PartnersContext Interface (30 minutes)

### 2.1 Rewrite PartnersContext.tsx

**File:** `frontend/src/features/partners/PartnersContext.tsx`

The context needs to provide a clean, consistent interface that supports:
- Listing partners
- Creating partners inline
- Refreshing the list

```tsx
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
      const token = localStorage.getItem('token');
      if (!token) {
        setPartners([]);
        return;
      }

      const response = await fetch('/api/partners/selectlist/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch partners: ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize the data to PartnerOption format
      const normalized: PartnerOption[] = (data || []).map((item: any) => ({
        id: item.id,
        label: item.label || item.company_name || item.contact_name || 'Unknown',
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
      const token = localStorage.getItem('token');
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
    throw new Error('usePartners must be used within a PartnersProvider');
  }
  return context;
}

// Default export for compatibility
export default PartnersContext;
```

---

## Phase 3: Fix Database Schema (30 minutes)

### 3.1 Drop Orphaned Table

The `partner_people` table has wrong types and is never used. Drop it:

**File:** `backend/migrations/cleanup_partner_people.sql` (NEW)

```sql
-- Migration: Cleanup orphaned partner_people table
-- This table was created with TEXT ids that don't match the UUID partners.id
-- It has never been used by the application

-- First, check if table exists and has any data (for safety)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_people') THEN
        -- Log what we're dropping
        RAISE NOTICE 'Dropping orphaned partner_people table';
        
        -- Drop the table
        DROP TABLE IF EXISTS partner_people CASCADE;
    END IF;
END $$;
```

### 3.2 Run Migration

```bash
# Run the cleanup migration
psql $DATABASE_URL -f backend/migrations/cleanup_partner_people.sql
```

---

## Phase 4: Add Inline Partner Creation (1 hour)

### 4.1 Quick Add Partner Modal

**File:** `frontend/src/features/partners/QuickAddPartnerModal.tsx` (NEW)

```tsx
'use client';

import { useState } from 'react';
import { X, Building2, User, Loader2 } from 'lucide-react';
import { usePartners, CreatePartnerData } from './PartnersContext';
import { toast } from 'sonner';

interface QuickAddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (partner: { id: string; label: string }) => void;
  initialName?: string;
  category?: string;
}

export function QuickAddPartnerModal({
  isOpen,
  onClose,
  onCreated,
  initialName = '',
  category = 'title_company',
}: QuickAddPartnerModalProps) {
  const { create } = usePartners();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePartnerData>({
    category,
    company_name: initialName,
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: 'CA',
    postal_code: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name && !formData.contact_name) {
      toast.error('Please enter a company name or contact name');
      return;
    }

    setLoading(true);
    try {
      const newPartner = await create(formData);
      if (newPartner) {
        toast.success('Partner added successfully');
        onCreated({
          id: newPartner.id,
          label: formData.company_name || formData.contact_name || '',
        });
        onClose();
      }
    } catch (err) {
      toast.error('Failed to create partner');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'title_company', label: 'Title Company' },
    { value: 'escrow_company', label: 'Escrow Company' },
    { value: 'lender', label: 'Lender' },
    { value: 'realtor', label: 'Realtor' },
    { value: 'attorney', label: 'Attorney' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Add Industry Partner</h2>
              <p className="text-sm text-gray-500">Quick add for deed generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Pacific Coast Title Company"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                autoFocus
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@pctitle.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="123 Main Street"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* City, State, Zip Row */}
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Los Angeles"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="90001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!formData.company_name && !formData.contact_name)}
              className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Partner'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 4.2 Update PrefillCombo to Support Inline Add

**File:** `frontend/src/features/wizard/mode/components/PrefillCombo.tsx`

Add support for the "Add New" option that actually saves:

```tsx
// At the top of the file, add import:
import { QuickAddPartnerModal } from '@/features/partners/QuickAddPartnerModal';

// Inside the component, add state:
const [showAddPartner, setShowAddPartner] = useState(false);
const [pendingNewName, setPendingNewName] = useState('');

// Update the onAddNew handler (or add if not present):
const handleAddNew = (name: string) => {
  setPendingNewName(name);
  setShowAddPartner(true);
};

// Handle created partner:
const handlePartnerCreated = (partner: { id: string; label: string }) => {
  // Set the value to the new partner
  onChange(partner.label);
  setShowAddPartner(false);
  setPendingNewName('');
};

// In the JSX, add the modal:
{showAddPartner && (
  <QuickAddPartnerModal
    isOpen={showAddPartner}
    onClose={() => {
      setShowAddPartner(false);
      setPendingNewName('');
    }}
    onCreated={handlePartnerCreated}
    initialName={pendingNewName}
    category="title_company"
  />
)}
```

---

## Phase 5: Rename API Partners Modal (10 minutes)

### 5.1 Rename and Clarify

**File:** `frontend/src/components/CreatePartnerModal.tsx`

Rename to make it clear this is for API integrations, not industry partners:

```bash
mv frontend/src/components/CreatePartnerModal.tsx frontend/src/components/CreateAPIPartnerModal.tsx
```

Update any imports:

```bash
# Find and update imports
grep -r "CreatePartnerModal" frontend/src/ --include="*.tsx" --include="*.ts"
```

### 5.2 Add Comment Header

At the top of the renamed file, add:

```tsx
/**
 * CreateAPIPartnerModal
 * 
 * This modal is for creating API Partners (third-party integrators like SoftPro, Qualia)
 * who get API keys to access DeedPro programmatically.
 * 
 * NOT for Industry Partners (title companies, lenders, etc.) used in deed generation.
 * For Industry Partners, see: features/partners/QuickAddPartnerModal.tsx
 */
```

---

## Phase 6: Clean Up Console Logs (5 minutes)

**File:** `frontend/src/features/partners/PartnersContext.tsx`

Remove the diagnostic console.log statements:

```tsx
// DELETE these lines (around line 52-55):
console.log('[PARTNERS] RAW response data:', data);
console.log('[PARTNERS] RAW array:', raw);
console.log('[PARTNERS] RAW length:', raw?.length);
console.log('[PARTNERS] RAW first item:', raw?.[0]);
```

---

## Testing Checklist

### Partners CRUD
- [ ] Can list partners in PartnersManager
- [ ] Can create new partner via PartnersManager
- [ ] Can edit existing partner
- [ ] Can delete partner
- [ ] Partners persist after page refresh

### Wizard Integration
- [ ] Partners dropdown appears in wizard for "Requested By"
- [ ] Can select existing partner
- [ ] Can type new name (triggers Quick Add modal)
- [ ] Quick Add modal saves partner to database
- [ ] New partner appears in dropdown after creation
- [ ] Selected partner name appears in PDF

### No Console Errors
- [ ] No errors about missing `items` property
- [ ] No errors about missing `create` function
- [ ] No errors about missing `refresh` function
- [ ] No console.log spam in production

---

## Summary

### Files to DELETE
```
frontend/src/features/partners/IndustryPartnersPanel.tsx
frontend/src/features/partners/PartnersSelect.tsx
frontend/src/features/partners/PartnersContext.tsx.bak.v8_2
backend/migrations/20251016_add_partners_org_scoped.sql
```

### Files to CREATE
```
frontend/src/features/partners/QuickAddPartnerModal.tsx
backend/migrations/cleanup_partner_people.sql
```

### Files to MODIFY
```
frontend/src/features/partners/PartnersContext.tsx (rewrite)
frontend/src/features/wizard/mode/components/PrefillCombo.tsx (add modal integration)
frontend/src/components/CreatePartnerModal.tsx (rename to CreateAPIPartnerModal.tsx)
```

### Estimated Total Time: ~4 hours

After this cleanup, the Industry Partners feature will be:
- ✅ Clean — No dead code or conflicting schemas
- ✅ Working — All components use same interface
- ✅ Usable — Can add partners inline during deed creation
- ✅ Clear — API Partners vs Industry Partners separated
