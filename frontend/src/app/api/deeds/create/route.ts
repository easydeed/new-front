// frontend/src/app/api/deeds/create/route.ts
// Proxy that SAFELY forwards JSON to the backend without losing the body.
// Fix: DO NOT forward req.body after reading it; always re-stringify.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function POST(req: NextRequest) {
  try {
    // Read request body ONCE
    const payload = await req.json();
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-proxy': 'frontend-next',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Forward to backend with properly serialized JSON body
    const resp = await fetch(`${BACKEND_BASE_URL}/deeds`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),  // CRITICAL: Re-stringify the payload
    });
    
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Upstream error' }));
      return NextResponse.json(err, { status: resp.status });
    }
    
    const json = await resp.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    console.error('[proxy:/api/deeds/create] error:', e);
    return NextResponse.json(
      { detail: 'Proxy error', error: String(e) },
      { status: 500 }
    );
  }
}
