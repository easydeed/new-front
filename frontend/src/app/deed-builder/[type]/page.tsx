'use client';

import { use } from 'react';
import { DeedBuilder } from '@/features/builder/DeedBuilder';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface PageProps {
  params: Promise<{ type: string }>;
}

export default function DeedBuilderPage({ params }: PageProps) {
  const { type } = use(params);
  
  return (
    <SidebarProvider>
      <PartnersProvider>
        <DeedBuilder deedType={type} />
      </PartnersProvider>
    </SidebarProvider>
  );
}

