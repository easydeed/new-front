'use client';
import React from 'react';
import { useHydrated } from '@/shared/hooks/useHydrated';

/**
 * Renders a neutral shell on server and until client hydration completes.
 * Prevents SSR/CSR markup mismatch when UI branches based on client-only state.
 */
export default function HydrationGate({ children }: { children: React.ReactNode }){
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="p-4" suppressHydrationWarning>
        <div className="text-sm text-gray-500">Loading wizard…</div>
      </div>
    );
  }
  return <>{children}</>;
}
