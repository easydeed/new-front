import React from 'react';

/**
 * StepShell - Container component for wizard steps
 * Provides consistent spacing and layout for Q&A UI
 * 
 * ✅ Phase 24-D: Enhanced with V0 UI styling
 */
export default function StepShell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">{children}</div>;
}
