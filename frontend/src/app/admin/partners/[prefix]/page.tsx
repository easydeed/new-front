'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface UsageRow {
  prefix: string;
  endpoint: string;
  status: number;
  latency_ms: number;
  at: string;
}

export default function PartnerDetailPage() {
  const router = useRouter();
  const { prefix } = useParams<{ prefix: string }>();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ PHASE 22-B: Admin auth check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('[PartnerDetailPage] No auth token - redirecting to login');
      router.push('/login');
      return;
    }
    
    // TODO: Add role verification (admin only)
    // For now, just check token exists
  }, [router]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/partners/admin/usage', { cache: 'no-store' });
      const data = await res.json();
      setRows(data);
      setLoading(false);
    })();
  }, []);

  const mine = useMemo(() => rows.filter(r => r.prefix === prefix), [rows, prefix]);
  const calls = mine.length;
  const avgLatency = mine.length ? Math.round(mine.reduce((a, b) => a + (b.latency_ms || 0), 0) / mine.length) : 0;
  const errors = mine.filter(r => (r.status || 0) >= 400).length;
  const errorRate = calls ? Math.round((errors / calls) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partner: <code>{prefix}</code></h1>
        <a className="text-blue-600 hover:underline" href="/admin/partners">← Back</a>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500">API Calls (last 500)</div>
              <div className="text-2xl font-semibold">{calls}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500">Avg Latency</div>
              <div className="text-2xl font-semibold">{avgLatency} ms</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500">Errors</div>
              <div className="text-2xl font-semibold">{errors}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500">Error Rate</div>
              <div className="text-2xl font-semibold">{errorRate}%</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-6">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">When</th>
                  <th className="py-2">Endpoint</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{new Date(r.at).toLocaleString()}</td>
                    <td className="py-2">{r.endpoint}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{r.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

