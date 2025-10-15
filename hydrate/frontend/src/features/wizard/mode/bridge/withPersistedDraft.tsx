'use client';
import { useEffect } from 'react';
import { useHydrated } from '@/shared/hooks/useHydrated';
import { safeStorage } from '@/shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from './persistenceKeys';

/**
 * Persists wizard formData to mode-scoped localStorage **after hydration**.
 * Use inside pages that should autosave drafts.
 */
export function usePersistDraft(getFormData: () => any, mode: 'modern'|'classic'){
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    const key = mode === 'modern' ? WIZARD_DRAFT_KEY_MODERN : WIZARD_DRAFT_KEY_CLASSIC;
    const id = setInterval(() => {
      try {
        const data = getFormData();
        safeStorage.set(key, JSON.stringify(data));
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [hydrated, getFormData, mode]);
}
