'use client';

import { use } from 'react';
import { DeedBuilder } from '@/features/builder/DeedBuilder';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { generationHold } from '@/lib/instrumentAvailability';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ resume?: string }>;
}

export default function DeedBuilderPage({ params, searchParams }: PageProps) {
  const { type } = use(params);
  // Ticket R: ?resume={deed_id} re-opens a saved draft as the deed being built.
  const { resume } = use(searchParams);

  // HX0: internal tool — no session, no shell.
  const { checked } = useRequireAuth();
  if (!checked) return null;

  const hold = generationHold(type);
  if (hold) return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{hold.label} temporarily unavailable</h1>
      <p role="alert" className="mt-4">{hold.reason}</p>
      <Link href="/deed-builder" className="mt-4 inline-block underline">Choose another document type</Link>
    </main>
  );

  return (
    <SidebarProvider>
      <PartnersProvider>
        <DeedBuilder deedType={type} resumeDeedId={resume} />
      </PartnersProvider>
    </SidebarProvider>
  );
}

