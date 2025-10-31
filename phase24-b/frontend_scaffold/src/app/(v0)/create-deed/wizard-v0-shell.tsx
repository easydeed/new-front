'use client';
import * as React from 'react';

/**
 * This file is a UI-only shell that will import and render V0 components
 * NEXT TO your existing wizard logic. You should pass your existing data/handlers
 * into the V0 components via props. Do not move logic into these components.
 */

export default function WizardV0Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children /* Mount your existing wizard here and swap in V0 components piece by piece */}
    </div>
  );
}
