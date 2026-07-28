'use client';

/**
 * U2.2 — toasts die on navigation. A toast narrates the page that raised
 * it; surviving a route change is how "Draft restored" haunted sessions
 * that never resumed anything. Dismisses everything whenever the pathname
 * changes (first render mounts with the pathname — no dismissal fires).
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function ToastRouteDismiss() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current !== pathname) {
      previous.current = pathname;
      toast.dismiss();
    }
  }, [pathname]);

  return null;
}
