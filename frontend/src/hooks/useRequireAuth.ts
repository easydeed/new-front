'use client';

/**
 * HX0 — route-level auth guard for internal pages.
 *
 * The audit found /security serving the internal app to logged-out
 * visitors: pages relied on their DATA calls failing rather than
 * guarding the route itself, so the shell (sidebar, controls, logout)
 * rendered for anyone. This hook is the one guard every internal page
 * mounts: no session → replace() to /login with a redirect back.
 *
 * This is the client-side cousin of the backend's real enforcement (all
 * data endpoints require a bearer token) — it closes the shell exposure;
 * the server remains the authority on data.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function useRequireAuth(): { checked: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    setChecked(true);
  }, [router, pathname]);

  return { checked };
}
