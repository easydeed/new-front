/**
 * Phase 24-B: API client helper for V0 pages
 * Simple wrapper around fetch for consistent API calls
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const error: any = new Error(`GET ${path} failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiPost(path: string, body: any, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error: any = new Error(`POST ${path} failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

