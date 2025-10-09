// Optional: silent refresh (OFF by default). Requires backend /users/refresh-token
import { useEffect } from 'react';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/utils/authToken';

function parseJwt(token: string): any | null {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

export default function useSilentRefresh(enabled = false) {
  useEffect(() => {
    if (!enabled) return;
    const token = getAccessToken();
    if (!token) return;
    const payload = parseJwt(token);
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const refreshAt = Math.max(msUntilExpiry - 60_000, 5_000); // 1 min before

    const t = setTimeout(async () => {
      try {
        const rt = localStorage.getItem('refresh_token'); // if you store it; otherwise use cookie flow
        if (!rt) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users/refresh-token`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt })
        });
        if (!res.ok) throw new Error('refresh failed');
        const j = await res.json();
        if (j.access_token) setAccessToken(j.access_token);
      } catch {
        clearAccessToken();
      }
    }, refreshAt);

    return () => clearTimeout(t);
  }, [enabled]);
}
