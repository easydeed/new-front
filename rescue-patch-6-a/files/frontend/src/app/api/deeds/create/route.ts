// frontend/src/app/api/deeds/create/route.ts
// Proxy that SAFELY forwards JSON to the backend without losing the body.
// Fix: DO NOT forward req.body after reading it; always re-stringify.
import { NextRequest } from 'next/server';

export const runtime = 'edge'; // or 'nodejs' based on your app; both supported here

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json(); // read ONCE
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || undefined;

    const res = await fetch(`${API_BASE}/api/deeds/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { 'Authorization': auth } : {}),
        'x-proxy': 'frontend-next',
      } as any,
      body: JSON.stringify(payload),
      // Avoid caching at the edge
      cache: 'no-store',
    });

    const text = await res.text();
    // Pass-through status and content-type
    const ct = res.headers.get('content-type') || 'application/json';
    return new Response(text, { status: res.status, headers: { 'content-type': ct }});
  } catch (e: any) {
    console.error('[proxy:/api/deeds/create] error:', e);
    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500 });
  }
}
