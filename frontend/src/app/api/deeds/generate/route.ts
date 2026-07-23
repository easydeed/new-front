// frontend/src/app/api/deeds/generate/route.ts
// Proxy for the deed builder's generate action (DeedBuilder.handleGenerate).
// The builder sends grantors_text/grantees_text/doc_type; the backend
// POST /deeds endpoint expects the DeedCreate shape (grantor_name/
// grantee_name/deed_type), so map the fields before forwarding.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const deedCreate = {
      deed_type: payload.doc_type,
      property_address: payload.property_address || null,
      apn: payload.apn || null,
      county: payload.county || null,
      legal_description: payload.legal_description || '',
      grantor_name: payload.grantors_text || '',
      grantee_name: payload.grantees_text || '',
      vesting: payload.vesting || null,
      requested_by: payload.requested_by || null,
      source: 'deed-builder',
      // Persisted into deeds.metadata so the stored PDF renders the full
      // document (DTT declaration, reference numbers, mail-to).
      dtt: payload.dtt || null,
      title_order_no: payload.title_order_no || null,
      escrow_no: payload.escrow_no || null,
      return_to: payload.return_to || null,
    };

    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-proxy': 'frontend-next',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const resp = await fetch(`${BACKEND_BASE_URL}/deeds`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deedCreate),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Upstream error' }));
      return NextResponse.json(err, { status: resp.status });
    }

    const json = await resp.json();
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    console.error('[proxy:/api/deeds/generate] error:', e);
    return NextResponse.json(
      { detail: 'Proxy error', error: String(e) },
      { status: 500 }
    );
  }
}
