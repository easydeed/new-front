'use client';
import { useEffect } from 'react';
import { useWizardMode } from '@/features/wizard/ModeContext';

/**
 * PATCH4: Sync current wizard mode into a cookie for middleware-based routing.
 * Renders nothing; include once near the wizard layout root.
 */
export default function ModeCookieSync() {
  const { mode } = useWizardMode?.() || { mode: 'classic' as const };

  useEffect(() => {
    if (typeof document !== 'undefined' && mode) {
      // 30 days, SameSite=Lax
      document.cookie = `wizard-mode=${mode}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [mode]);

  return null;
}
