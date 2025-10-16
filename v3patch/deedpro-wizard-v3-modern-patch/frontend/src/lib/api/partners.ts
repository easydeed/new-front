
'use client';
import { getAuthToken } from './session';
const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL as string;

export async function listPartners(): Promise<{id:string; name:string}[]> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}/api/partners`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } as any,
    credentials: 'include'
  } as any);
  if (!res.ok) return [];
  return await res.json();
}

export async function createPartner(body: { name: string }): Promise<{id:string; name:string}> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}/api/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } as any,
    body: JSON.stringify(body),
    credentials: 'include'
  } as any);
  if (!res.ok) throw new Error('Failed to create partner');
  return await res.json();
}
