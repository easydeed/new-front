import { useEffect, useState } from 'react';

export type PartnerOption = { id: string; label: string };

export function usePartnersList(query: string) {
  const [options, setOptions] = useState<PartnerOption[]>([]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch('/api/partners/selectlist', { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setOptions(arr);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [query]);

  return { options, isLoading };
}
