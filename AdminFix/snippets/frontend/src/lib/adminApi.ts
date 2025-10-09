// Typed admin API client for /admin-honest
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// auth header is standardized to 'access_token' per auth-hardening bundle
function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers||{}), ...authHeaders() },
    cache: 'no-store'
  });
  if (!res.ok) {
    const detail = await safeJson(res);
    throw new Error(detail?.detail || `Request failed ${res.status}`);
  }
  return res.json();
}

async function getBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.blob();
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export const AdminApi = {
  dashboard: () => getJson('/admin/dashboard'),
  revenue: () => getJson('/admin/revenue'),
  systemMetrics: async () => {
    // Prefer existing /admin/system-metrics, fallback to 404-friendly empty
    try { return await getJson('/admin/system-metrics'); }
    catch { return { metrics: [] }; }
  },
  usersSearch: (q: {page?: number; limit?: number; search?: string; role?: string}) => {
    const p = new URLSearchParams();
    if (q.page) p.set('page', String(q.page));
    if (q.limit) p.set('limit', String(q.limit));
    if (q.search) p.set('search', q.search);
    if (q.role) p.set('role', q.role);
    return getJson(`/admin/users/search?${p.toString()}`);
  },
  userDetail: async (id: number) => {
    // Prefer v2 real endpoint
    try { return await getJson(`/admin/users/${id}/real`); }
    catch { return await getJson(`/admin/users/${id}`); }
  },
  deedsSearch: (q: {page?: number; limit?: number; search?: string; status?: string}) => {
    const p = new URLSearchParams();
    if (q.page) p.set('page', String(q.page));
    if (q.limit) p.set('limit', String(q.limit));
    if (q.search) p.set('search', q.search);
    if (q.status) p.set('status', q.status);
    return getJson(`/admin/deeds/search?${p.toString()}`);
  },
  deedDetail: (id: number) => getJson(`/admin/deeds/${id}`),
  exportUsersCsv: () => getBlob('/admin/export/users.csv'),
  exportDeedsCsv: () => getBlob('/admin/export/deeds.csv')
};
