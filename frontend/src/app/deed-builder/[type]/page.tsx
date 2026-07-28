'use client';

import { use } from 'react';
import { DeedBuilder } from '@/features/builder/DeedBuilder';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ resume?: string }>;
}

export default function DeedBuilderPage({ params, searchParams }: PageProps) {
  const { type } = use(params);
  // Ticket R: ?resume={deed_id} re-opens a saved draft as the deed being built.
  const { resume } = use(searchParams);

  return (
    <SidebarProvider>
      <PartnersProvider>
        <DeedBuilder deedType={type} resumeDeedId={resume} />
      </PartnersProvider>
    </SidebarProvider>
  );
}

