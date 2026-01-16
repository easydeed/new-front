'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

export function useBuilderMode() {
  const pathname = usePathname();
  const { setHidden } = useSidebar();
  
  const isBuilderRoute = pathname?.includes('/deed-builder') || 
                         pathname?.includes('/create-deed/');

  useEffect(() => {
    if (isBuilderRoute) {
      setHidden(true);
    }
    
    // Restore sidebar when leaving builder
    return () => {
      setHidden(false);
    };
  }, [isBuilderRoute, setHidden]);

  return { isBuilderMode: isBuilderRoute };
}

