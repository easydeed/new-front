'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export default function DashboardV0() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{total:number;completed:number;in_progress:number;month:number} | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login?redirect=/dashboard');
      return;
    }
    (async () => {
      try {
        // Verify token
        const profileRes = await fetch(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (!profileRes.ok) throw new Error('Not authenticated');
        // Load data
        const [summaryRes, deedsRes] = await Promise.all([
          fetch(`${API_URL}/deeds/summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/deeds`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (!summaryRes.ok) throw new Error('Failed to load summary');
        const s = await summaryRes.json();
        setSummary(s);
        if (deedsRes.ok) {
          const d = await deedsRes.json();
          setRecent(Array.isArray(d) ? d.slice(0,5) : (Array.isArray(d?.items) ? d.items.slice(0,5) : []));
        }
        // Draft detection
        const draft = localStorage.getItem('deedWizardDraft');
        if (draft) {
          try { const parsed = JSON.parse(draft); setHasDraft(!!parsed?.formData?.deedType); } catch {}
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  // Replace visuals only below
  if (loading) return <main className="p-6">Loading…</main>;
  if (error) return <main className="p-6 text-red-600">{error}</main>;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <a href="/create-deed" className="rounded bg-black text-white px-3 py-2">Create New Deed</a>
      </header>

      {hasDraft && (
        <div className="mt-4 rounded border p-4 bg-amber-50">
          <div className="font-medium">You have an in‑progress deed</div>
          <div className="mt-2"><a className="underline" href="/create-deed">Resume draft</a></div>
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded border p-4 bg-white"><div className="text-sm text-gray-500">Total Deeds</div><div className="text-2xl font-bold">{summary?.total ?? 0}</div></div>
        <div className="rounded border p-4 bg-white"><div className="text-sm text-gray-500">In Progress</div><div className="text-2xl font-bold">{summary?.in_progress ?? 0}</div></div>
        <div className="rounded border p-4 bg-white"><div className="text-sm text-gray-500">Completed</div><div className="text-2xl font-bold">{summary?.completed ?? 0}</div></div>
        <div className="rounded border p-4 bg-white"><div className="text-sm text-gray-500">This Month</div><div className="text-2xl font-bold">{summary?.month ?? 0}</div></div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Address</th>
                <th className="p-2 border">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td className="p-2 border text-sm" colSpan={4}>No recent deeds.</td></tr>
              ) : recent.map((d:any) => (
                <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{d.id}</td>
                  <td className="p-2 border">{d.deed_type || d.type}</td>
                  <td className="p-2 border">{d.property_address || d.address}</td>
                  <td className="p-2 border">{d.created_at || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
