// frontend/src/app/api/partners/selectlist/route.ts
import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const org = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id') || '';
    const url = `${API_BASE}/api/partners/selectlist`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': auth || '', 'x-organization-id': org || '', 'accept': 'application/json' } as any,
      cache: 'no-store'
    });
    const txt = await res.text();
    const ct = res.headers.get('content-type') || 'application/json';
    return new Response(txt, { status: res.status, headers: { 'content-type': ct } });
  } catch (e: any) {
    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500 });
  }
}
