'use client';
/**
 * UI-only placeholder. Mount your existing Modern/Classic wizard here via feature flag.
 * Replace ONLY the visual wrapper (cards, spacing). Keep all handlers and state logic untouched.
 */
export default function WizardV0Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        {children || <div className="text-gray-600">Mount your wizard engine here.</div>}
      </div>
    </main>
  );
}
