'use client';
import * as React from 'react';

type Summary = { total: number; completed: number; in_progress: number; month: number; }
type DeedItem = { id: number; deed_type: string; address: string; created_at: string; status: 'draft'|'in_progress'|'completed' }

interface DashboardProps {
  summary: Summary | null
  recent: DeedItem[] | null
  hasDraft: boolean
  onCreateDeed: () => void
  onResumeDraft: () => void
  sidebar: React.ReactNode
}

export default function DashboardV0(props: DashboardProps) {
  // Replace this file with V0 output.
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-semibold">DashboardV0 placeholder</h1>
      <p className="text-sm text-gray-500">Replace this component with V0-generated UI.</p>
    </main>
  );
}
