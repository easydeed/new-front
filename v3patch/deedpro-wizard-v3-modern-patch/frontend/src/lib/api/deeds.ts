
'use client';
import { toCanonicalFor } from '@/features/wizard/mode/adapters';
import { getAuthToken } from './session';

const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL as string;

export async function finalizeDeed(docType: string, modernState: any) {
  const payload = toCanonicalFor(docType, modernState);
  const token = getAuthToken();
  const res = await fetch(`${BASE}/api/deeds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    } as any,
    body: JSON.stringify(payload),
    credentials: 'include'
  } as any);
  if (!res.ok) throw new Error('Failed to finalize deed');
  const data = await res.json();
  if (!data?.id && !data?.deedId) throw new Error('Unexpected response');
  const id = data.id || data.deedId;
  return id;
}
