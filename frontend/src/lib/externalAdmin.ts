export async function callExternalAdmin(path: string, init?: RequestInit) {
  const base = process.env.EXTERNAL_API_BASE_URL || 'http://localhost:8001';
  const secret = process.env.EXTERNAL_API_ADMIN_SETUP_SECRET;
  if (!secret) throw new Error('Missing EXTERNAL_API_ADMIN_SETUP_SECRET');
  const url = `${base}${path}`;
  const headers = new Headers(init?.headers as any || {});
  headers.set('X-Admin-Setup-Secret', secret);
  if (!headers.has('Content-Type') && (init?.body && typeof init.body === 'string')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`External admin call failed: ${res.status} ${text}`);
  }
  return res;
}
