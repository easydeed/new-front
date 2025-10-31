'use client';

import { FEATURE_FLAGS } from '@/src/config/featureFlags';
import DashboardV0 from './DashboardV0';

// NOTE: In your app, you already fetch profile/summary/recent and render the existing dashboard.
// This page demonstrates how to conditionally render the V0 Dashboard component while keeping
// all logic in the parent (or a loader). Replace the mock with your real selectors/hooks.

export default function DashboardPage() {
  if (!FEATURE_FLAGS.NEW_DASHBOARD) {
    // Fallback to your existing dashboard route/component
    return <div style={{padding: 24}}>Feature flag NEW_DASHBOARD is OFF.</div>;
  }

  // Placeholder props – wire these to your existing data
  const summary = null;         // while loading
  const recent = null;          // while loading
  const hasDraft = false;

  return (
    <DashboardV0
      summary={summary as any}
      recent={recent as any}
      hasDraft={hasDraft}
      onCreateDeed={() => { window.location.href = '/create-deed'; }}
      onResumeDraft={() => { window.location.href = '/create-deed'; }}
      sidebar={null}
    />
  );
}
